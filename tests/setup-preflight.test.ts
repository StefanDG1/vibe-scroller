import { expect, it } from "vitest";
import { inspectSetup } from "../scripts/setup-preflight.mjs";
it("permits the labeled demo without credentials and rejects unsafe personal configuration", () => {
  expect(inspectSetup({}, true).ready).toBe(true);
  const env = {
    CONVEX_URL: "https://synthetic-test.convex.cloud",
    WORKOS_CLIENT_ID: "client_Synthetic",
    WORKOS_API_KEY: "synthetic-server-test-value",
  };
  expect(inspectSetup(env).ready).toBe(true);
  for (const extra of [
    { CONVEX_URL: "http://synthetic-test.convex.cloud" },
    { CONVEX_URL: "https://synthetic-test.convex.cloud.evil.invalid" },
    { CONVEX_URL: "https://token@synthetic-test.convex.cloud" },
    { NEXT_PUBLIC_API_KEY: "synthetic" },
    { WORKOS_COOKIE_PASSWORD: "short" },
    { LIVE_CHECKOUT_ENABLED: "true" },
  ])
    expect(inspectSetup({ ...env, ...extra }).ready).toBe(false);
  expect(JSON.stringify(inspectSetup(env))).not.toContain(env.WORKOS_API_KEY);
});
