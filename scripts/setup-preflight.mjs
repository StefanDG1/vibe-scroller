import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { pathToFileURL } from "node:url";

export function inspectSetup(env, demo = false) {
  if (demo)
    return {
      mode: "demo",
      ready: true,
      checks: [],
      limits: [
        "Synthetic data only; no providers, storage, paid work or account mutations.",
      ],
    };
  const checks = [];
  const check = (name, valid) => checks.push({ name, valid: Boolean(valid) });
  let backend;
  try {
    backend = new URL(env.CONVEX_URL || env.NEXT_PUBLIC_CONVEX_URL);
  } catch {
    /* Missing configuration is a failed check. */
  }
  check(
    "Convex HTTPS deployment URL",
    backend &&
      backend.protocol === "https:" &&
      backend.hostname.endsWith(".convex.cloud") &&
      !backend.username &&
      !backend.password &&
      backend.pathname === "/" &&
      !backend.search &&
      !backend.hash,
  );
  check(
    "Dedicated WorkOS client",
    /^client_[A-Za-z0-9]+$/.test(env.WORKOS_CLIENT_ID || ""),
  );
  check("WorkOS server credential present", Boolean(env.WORKOS_API_KEY));
  check(
    "Optional existing session secret has at least 32 characters",
    !env.WORKOS_COOKIE_PASSWORD || env.WORKOS_COOKIE_PASSWORD.length >= 32,
  );
  check(
    "Server secrets absent from public variables",
    !Object.keys(env).some(
      (k) =>
        k.startsWith("NEXT_PUBLIC_") &&
        /(?:SECRET|API_KEY|PASSWORD|TOKEN|PRIVATE_KEY)/.test(k),
    ),
  );
  check(
    "Live checkout disabled for personal setup",
    env.LIVE_CHECKOUT_ENABLED !== "true",
  );
  return {
    mode: "account",
    ready: checks.every((c) => c.valid),
    checks,
    limits: [
      "Configuration checks only. Authentication, source rights, inference budgets, storage and provider eligibility still require real verification.",
      "Stripe and analytics are optional. Cloud and Windows coding are not enabled by this command.",
    ],
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args[0]?.startsWith("--") && args[0] !== "--demo"))
      throw Error();
    const report = inspectSetup(
      args[0] === "--demo"
        ? {}
        : parseEnv(readFileSync(args[0] || ".env.local", "utf8")),
      args[0] === "--demo",
    );
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.ready ? 0 : 2;
  } catch {
    console.error(
      "Preflight input unavailable. Use node scripts/setup-preflight.mjs [--demo|ignored-env-file]. No setting values printed.",
    );
    process.exitCode = 1;
  }
}
