import { afterEach, expect, it, vi } from "vitest";
const callback = vi.hoisted(() => vi.fn(() => vi.fn()));
vi.mock("../apps/starter/node_modules/@workos-inc/authkit-nextjs", () => ({
  handleAuth: callback,
}));
afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
it("uses the configured public domain for completed PKCE redirects rather than the rewritten deploy origin", async () => {
  vi.stubEnv("APP_URL", "https://scroll.example.test");
  await import("../apps/starter/app/callback/route");
  expect(callback).toHaveBeenCalledWith({
    returnPathname: "/app",
    baseURL: "https://scroll.example.test",
  });
});
