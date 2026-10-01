import { afterEach, expect, it, vi } from "vitest";
import { allowedRequestOrigin } from "../apps/starter/lib/request-origin";
afterEach(() => vi.unstubAllEnvs());
const request = (origin?: string, extra: Record<string, string> = {}) =>
  new Request("https://internal-function.invalid/api/product", {
    headers: { ...(origin ? { origin } : {}), ...extra },
  });
it("accepts the configured public origin behind a rewritten host and rejects missing or foreign origins regardless of forwarded headers", () => {
  vi.stubEnv("APP_URL", "https://scroll.example.test");
  expect(allowedRequestOrigin(request("https://scroll.example.test"))).toBe(
    true,
  );
  expect(allowedRequestOrigin(request())).toBe(false);
  for (const origin of [
    "null",
    "https://internal-function.invalid",
    "https://scroll.example.test.attacker.test",
    "http://scroll.example.test",
    "https://scroll.example.test:444",
    "https://attacker.test",
  ]) {
    expect(
      allowedRequestOrigin(
        request(origin, {
          "x-forwarded-host": "scroll.example.test",
          host: "scroll.example.test",
        }),
      ),
    ).toBe(false);
  }
});
it("fails closed for malformed configuration and supports an exact local development origin", () => {
  for (const config of [
    "bad-url",
    "https://user:pass@scroll.example.test",
    "http://scroll.example.test",
  ]) {
    vi.stubEnv("APP_URL", config);
    expect(allowedRequestOrigin(request(config))).toBe(false);
  }
  vi.stubEnv("APP_URL", "http://localhost:3001");
  expect(allowedRequestOrigin(request("http://localhost:3001"))).toBe(true);
  expect(allowedRequestOrigin(request("http://localhost:3002"))).toBe(false);
});
