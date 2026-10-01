import { convexTest } from "convex-test";
import { afterEach, expect, it, vi } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => vi.useRealTimers());
it("retries an identical checkout, rejects changed parameters and permits a fresh selection after expiry", async () => {
  vi.useFakeTimers();
  const t = convexTest(schema, modules);
  await t.mutation(internal.accounts.syncUser, {
    subject: "checkout-test",
    email: "checkout@example.test",
    name: "Synthetic",
  });
  const organizationId = await t
    .withIdentity({ subject: "checkout-test" })
    .mutation(api.organizations.create, { name: "Synthetic checkout" });
  await t.mutation(internal.billing.attach, {
    organizationId,
    customerId: "cus_synthetic",
  });
  const first = await t.mutation(internal.billing.reserveCheckout, {
    organizationId,
    intent: "starter-monthly-RO",
  });
  expect(
    await t.mutation(internal.billing.reserveCheckout, {
      organizationId,
      intent: "starter-monthly-RO",
    }),
  ).toEqual(first);
  await expect(
    t.mutation(internal.billing.reserveCheckout, {
      organizationId,
      intent: "pro-weekly-RO",
    }),
  ).rejects.toThrow("different checkout is already open");
  await expect(
    t.mutation(internal.billing.reserveCheckout, { organizationId }),
  ).rejects.toThrow("different checkout is already open");
  vi.advanceTimersByTime(32 * 60000);
  const next = await t.mutation(internal.billing.reserveCheckout, {
    organizationId,
    intent: "pro-weekly-RO",
  });
  expect(next.key).not.toBe(first.key);
  expect(next.expires).toBeGreaterThan(first.expires);
});
