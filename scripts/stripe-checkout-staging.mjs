import Stripe from "stripe";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
if (
  process.env.VIBE_STAGING_TEST !== "billing" ||
  process.env.CONVEX_DEPLOYMENT !== "dev:resolute-ladybug-999" ||
  !(process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_")
)
  throw Error("Explicit dedicated sandbox checkout test required.");
const client = new Stripe(process.env.STRIPE_SECRET_KEY);
if ((await client.accounts.retrieve()).id !== "acct_1ULEK7BINq6evjJt")
  throw Error("Dedicated synthetic sandbox required.");
const cli = (args) =>
  execFileSync(process.execPath, ["node_modules/convex/bin/main.js", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 90000,
  });
const file = "outputs/stripe-checkout-state.json";
const state = existsSync(file)
  ? JSON.parse(readFileSync(file, "utf8"))
  : {
      startedAt: new Date().toISOString(),
      synthetic: true,
      subject: `synthetic-checkout-${Date.now()}`,
    };
const save = () => writeFileSync(file, JSON.stringify(state, null, 2));
const call = (name, args, authenticated = false) =>
  JSON.parse(
    cli([
      "run",
      name,
      JSON.stringify(args),
      ...(authenticated
        ? ["--identity", JSON.stringify({ subject: state.subject })]
        : []),
    ]),
  );
if (!state.organizationId) {
  call("accounts:syncUser", {
    subject: state.subject,
    name: "Synthetic checkout acceptance",
    email: "billing-staging@example.test",
  });
  state.organizationId = call(
    "organizations:create",
    { name: "Synthetic checkout acceptance" },
    true,
  );
  save();
}
if (!state.url) {
  state.url = call(
    "billingV1:checkout",
    {
      organizationId: state.organizationId,
      tier: "starter",
      interval: "monthly",
      country: "RO",
      termsAccepted: true,
      immediateService: false,
    },
    true,
  );
  save();
}
const repeated = call(
  "billingV1:checkout",
  {
    organizationId: state.organizationId,
    tier: "starter",
    interval: "monthly",
    country: "RO",
    termsAccepted: true,
    immediateService: false,
  },
  true,
);
if (repeated !== state.url)
  throw Error("Identical checkout did not reuse its session.");
let rejected = false;
try {
  call(
    "billingV1:checkout",
    {
      organizationId: state.organizationId,
      tier: "pro",
      interval: "monthly",
      country: "RO",
      termsAccepted: true,
      immediateService: false,
    },
    true,
  );
} catch (error) {
  rejected = String(error.stderr).includes("CHECKOUT_OPEN");
}
if (!rejected) throw Error("Changed checkout intent was not rejected.");
state.identicalRetryPassed = true;
state.changedSelectionRejected = true;
state.noLiveCharges = true;
state.browserPaymentTested = false;
save();
console.log(
  JSON.stringify({
    synthetic: true,
    identicalRetryPassed: true,
    changedSelectionRejected: true,
    noLiveCharges: true,
    evidence: file,
  }),
);
