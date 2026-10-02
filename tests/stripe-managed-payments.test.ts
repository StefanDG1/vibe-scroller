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
it("uses provider-collected eligibility for the explicitly approved consumer markets", () => {
  for (const country of [undefined, "", "US", "CN", "invented"]) {
    const result = checkoutPaymentRoute({
      ...base,
      country,
      managedMarket: "provider_supported",
      managedVerified: true,
      live: true,
    });
    expect(result.billingCountry).toBeNull();
    expect(result.options).toEqual({ managed_payments: { enabled: true } });
  }
  expect(() =>
    checkoutPaymentRoute({
      ...base,
      managedMarket: "provider_supported",
      live: true,
    }),
  ).toThrow("eligibility");
});
it("rejects an unknown managed market and does not broaden direct checkout", () => {
  expect(() => checkoutPaymentRoute({ ...base, managedMarket: "all" })).toThrow(
    "market policy",
  );
  expect(() =>
    checkoutPaymentRoute({
      ...base,
      managedMarket: "provider_supported",
      route: "direct",
      country: "US",
    }),
  ).toThrow("unavailable in this country");
  expect(() =>
    checkoutPaymentRoute({
      ...base,
      managedMarket: "provider_supported",
      route: "direct",
      country: undefined,
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
