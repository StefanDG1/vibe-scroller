import Stripe from "stripe";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import {
  provisionCatalogue,
  validateProvisioningEnvironment,
} from "../packages/providers/stripe-catalogue.ts";

const root = resolve(import.meta.dirname, "..");
const mode = process.env.STRIPE_MODE ?? "test";
const account = process.env.STRIPE_ACCOUNT_ID;
validateProvisioningEnvironment(
  process.env.STRIPE_SECRET_KEY,
  mode,
  account,
  process.argv.includes("--live"),
);
const file = resolve(
  root,
  "private",
  `stripe-vibescroller-${mode}-configured.env`,
);
execFileSync("git", ["check-ignore", "--quiet", file], { cwd: root });
const client = new Stripe(process.env.STRIPE_SECRET_KEY);
const pricing = JSON.parse(
  await readFile(resolve(root, "contracts/pricing.json"), "utf8"),
);
let prior = {};
try {
  const text = await readFile(file, "utf8");
  prior = Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1)];
      }),
  );
} catch (error) {
  if (error.code !== "ENOENT")
    throw new Error("Cannot read private billing configuration.");
}
if (prior.STRIPE_ACCOUNT_ID && prior.STRIPE_ACCOUNT_ID !== account)
  throw new Error("Private configuration belongs to another Stripe account.");
const result = await provisionCatalogue(client, pricing, account, mode);
const environment = {
  ...prior,
  ...result.environment,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_BILLING_ROUTE: "managed_payments",
  STRIPE_MANAGED_PAYMENTS_VERIFIED: "false",
  BILLING_RELEASE_APPROVED: "false",
};
await mkdir(dirname(file), { recursive: true });
async function save() {
  await writeFile(
    file + ".tmp",
    Object.entries(environment)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") + "\n",
    { mode: 0o600 },
  );
  await rename(file + ".tmp", file);
}
await save();
const origin = "https://scroll.companynerve.com";
const configs = await client.billingPortal.configurations
  .list({ limit: 100 })
  .autoPagingToArray({ limit: 1000 });
const ownedConfigs = configs.filter(
  (c) =>
    c.metadata?.product === "vibescroller" && c.metadata?.version === "1.1.0",
);
if (ownedConfigs.length > 1)
  throw new Error("Dedicated portal configuration is ambiguous.");
const portal =
  ownedConfigs[0] ??
  (await client.billingPortal.configurations.create(
    {
      business_profile: {
        headline: "VibeScroller billing",
        privacy_policy_url: `${origin}/privacy`,
        terms_of_service_url: `${origin}/terms`,
      },
      default_return_url: `${origin}/app`,
      features: {
        customer_update: { enabled: false },
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true, mode: "at_period_end" },
        subscription_update: { enabled: false },
      },
      metadata: { product: "vibescroller", version: "1.1.0" },
    },
    { idempotencyKey: "vibescroller:portal:1.1.0" },
  ));
if (!portal.active || portal.livemode !== (mode === "live"))
  throw new Error("Portal does not match the intended mode or is inactive.");
if (
  portal.default_return_url !== `${origin}/app` ||
  portal.business_profile.privacy_policy_url !== `${origin}/privacy` ||
  portal.business_profile.terms_of_service_url !== `${origin}/terms` ||
  !portal.features.invoice_history.enabled ||
  !portal.features.payment_method_update.enabled ||
  !portal.features.subscription_cancel.enabled ||
  portal.features.subscription_cancel.mode !== "at_period_end" ||
  portal.features.subscription_update.enabled ||
  portal.features.customer_update.enabled
)
  throw new Error(
    "Dedicated portal settings differ from the approved configuration.",
  );
environment.STRIPE_PORTAL_CONFIG_ID = portal.id;
await save();
const url =
  mode === "live"
    ? "https://bold-lemur-667.convex.site/stripe/v1/webhook"
    : "https://resolute-ladybug-999.convex.site/stripe/v1/webhook";
const endpoints = await client.webhookEndpoints
  .list({ limit: 100 })
  .autoPagingToArray({ limit: 1000 });
const matching = endpoints.filter((e) => e.url === url);
const events = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "charge.refunded",
];
if (
  matching.some((e) => e.metadata.product !== "vibescroller") ||
  matching.length > 1
)
  throw new Error(
    "Webhook URL is already owned by another integration or is ambiguous.",
  );
let endpoint = matching[0];
if (endpoint) {
  if (
    !environment.STRIPE_V1_WEBHOOK_SECRET ||
    environment.STRIPE_V1_WEBHOOK_ENDPOINT_ID !== endpoint.id
  )
    throw new Error(
      "Existing webhook needs its separately stored signing secret; do not silently replace it.",
    );
} else {
  endpoint = await client.webhookEndpoints.create(
    {
      url,
      api_version: "2026-08-26.dahlia",
      enabled_events: events,
      metadata: { product: "vibescroller", version: "1.1.0" },
      description:
        "Dedicated VibeScroller subscription and credit reconciliation",
    },
    { idempotencyKey: `vibescroller:webhook:1.1.0:${mode}` },
  );
  if (!endpoint.secret)
    throw new Error("Signing secret missing from new webhook response.");
  environment.STRIPE_V1_WEBHOOK_SECRET = endpoint.secret;
  environment.STRIPE_V1_WEBHOOK_ENDPOINT_ID = endpoint.id;
  await save();
}
if (endpoint.livemode !== (mode === "live") || endpoint.status !== "enabled")
  throw new Error("Webhook is disabled or in another mode.");
if (
  endpoint.api_version !== "2026-08-26.dahlia" ||
  endpoint.metadata.version !== "1.1.0" ||
  events.some((event) => !endpoint.enabled_events.includes(event))
)
  throw new Error("Dedicated webhook event coverage or API version differs.");
console.log(
  JSON.stringify({
    mode,
    account,
    cataloguePrices: 8,
    portalConfigured: true,
    webhookConfigured: true,
    readiness: result.readiness,
    liveCheckoutEnabled: false,
    managedPaymentsVerified: false,
    configuration: "saved in ignored private directory",
  }),
);
