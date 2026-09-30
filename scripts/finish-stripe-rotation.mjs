import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
try {
  const root = readFileSync(".env.local", "utf8");
  if (!root.includes("dev:resolute-ladybug-999")) throw Error();
  const old = root.match(/^STRIPE_SECRET_KEY=["']?([^"'\r\n]+)["']?$/m)?.[1];
  const fresh = readFileSync("outputs/stripe-rotated-key.tmp", "utf8").trim();
  if (!old || !fresh.startsWith("sk_test_") || old === fresh) throw Error();
  const account = async (key) => {
    const r = await fetch("https://api.stripe.com/v1/account", {
      headers: { Authorization: `Bearer ${key}` },
    });
    return { status: r.status, id: r.ok ? (await r.json()).id : undefined };
  };
  const previous = await account(old),
    replacement = await account(fresh);
  if (previous.status !== 401 || replacement.id !== "acct_1ULEK7BINq6evjJt")
    throw Error();
  execFileSync(
    process.execPath,
    [
      "node_modules/convex/bin/main.js",
      "env",
      "set",
      "STRIPE_SECRET_KEY",
      fresh,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  for (const path of [".env.local", "apps/starter/.env.local"]) {
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, "utf8");
    if (/^STRIPE_SECRET_KEY=/m.test(raw))
      writeFileSync(
        path,
        raw.replace(/^STRIPE_SECRET_KEY=.*$/gm, `STRIPE_SECRET_KEY="${fresh}"`),
      );
  }
  const path = "infra/credential-search-incident.json";
  const evidence = JSON.parse(readFileSync(path, "utf8"));
  Object.assign(evidence, {
    stripeAction:
      "Rotated in the dedicated sandbox with immediate expiry; old credential returned 401, replacement matched the staging account and was configured securely",
    stripeRotationVerified: true,
    oldStripeKeyHttpStatus: previous.status,
    browserBlocker: null,
    rotationVerifiedAt: new Date().toISOString(),
  });
  writeFileSync(path, JSON.stringify(evidence, null, 2) + "\n");
  unlinkSync("outputs/stripe-rotated-key.tmp");
  console.log(
    JSON.stringify({
      oldKeyRejected: true,
      stagingAccountVerified: true,
      convexConfigured: true,
    }),
  );
} catch {
  console.error(
    "Stripe rotation verification or configuration failed; no credential details printed.",
  );
  process.exitCode = 1;
}
