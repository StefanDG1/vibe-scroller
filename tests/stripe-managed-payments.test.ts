import { expect, it } from "vitest";
import { checkoutPaymentRoute } from "../packages/providers/stripe-checkout";
import type { TaxConfig } from "../packages/policy";
const pending: TaxConfig = {
  domestic: "pending_evidence",
  special317: false,
  registrations: [],
  countries: ["RO", "DE"],
  oss: false,
  reviewed: false,
};
const base = {
  route: "managed_payments",
  managedVerified: false,
  live: false,
  country: "DE",
  tax: pending,
};

it("prepares sandbox MoR checkout without forbidden tax, currency or customer-update parameters", () => {
  const result = checkoutPaymentRoute(base);
  expect(result.treatment).toBe("stripe_managed_payments");
  expect(result.options).toEqual({ managed_payments: { enabled: true } });
});
it("requires verified MoR eligibility in live mode and never falls back to direct payment", () => {
  expect(() => checkoutPaymentRoute({ ...base, live: true })).toThrow(
    "eligibility",
  );
  expect(
    checkoutPaymentRoute({ ...base, live: true, managedVerified: true })
      .options,
  ).toEqual({ managed_payments: { enabled: true } });
});
it("preserves the launch country allowlist in both test and live MoR routes", () => {
  for (const live of [false, true])
    expect(() =>
      checkoutPaymentRoute({
        ...base,
        country: "US",
        live,
        managedVerified: true,
      }),
    ).toThrow("unavailable in this country");
});
it("keeps direct tax evidence requirements and explicitly opts out of dashboard MoR defaults", () => {
  expect(() =>
    checkoutPaymentRoute({ ...base, route: "direct", live: true }),
  ).toThrow();
  expect(
    checkoutPaymentRoute({ ...base, route: "direct", country: "RO" }).options,
  ).toEqual({
    managed_payments: { enabled: false },
    automatic_tax: { enabled: false },
    customer_update: { address: "auto" },
    adaptive_pricing: { enabled: true },
  });
  expect(() =>
    checkoutPaymentRoute({ ...base, route: "unrecognized" }),
  ).toThrow("Unknown billing route");
});
