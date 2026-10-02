import { expect, it } from "vitest";
import { billingReadiness } from "../packages/providers/billing-readiness";
import {
  managedMarketPolicy,
  managedRadarCondition,
} from "../packages/providers/managed-markets";
const env: Record<string, string> = {
  STRIPE_MODE: "live",
  STRIPE_SECRET_KEY: "rk_live_synthetic",
  STRIPE_ACCOUNT_ID: "acct_synthetic",
  STRIPE_V1_WEBHOOK_SECRET: "whsec_synthetic",
  STRIPE_PORTAL_CONFIG_ID: "bpc_synthetic",
  LIVE_CHECKOUT_ENABLED: "true",
  BILLING_RELEASE_APPROVED: "true",
  STRIPE_BILLING_ROUTE: "managed_payments",
  STRIPE_MANAGED_PAYMENTS_VERIFIED: "true",
  STRIPE_MANAGED_MARKET: "tax_covered",
  STRIPE_MANAGED_COUNTRY_RULE_PROOF: JSON.stringify({
    accountId: "acct_synthetic",
    mode: "live",
    policy: managedMarketPolicy,
    condition: managedRadarCondition,
    enabled: true,
    trafficPercent: 100,
    allowRulesDisabled: true,
    sandboxAcceptancePassed: true,
    verifiedAt: new Date().toISOString(),
  }),
};
for (const tier of ["STARTER", "PRO"])
  for (const interval of ["WEEKLY", "MONTHLY", "ANNUAL"])
    env[`STRIPE_${tier}_${interval}_PRICE_ID`] = `price_${tier}_${interval}`;
it("requires the complete V1 catalogue, matching key mode and all live release switches", () => {
  expect(billingReadiness(env)).toEqual({
    catalogueConfigured: true,
    liveEnabled: true,
    sandboxEnabled: false,
  });
  for (const key of [
    "STRIPE_PRO_ANNUAL_PRICE_ID",
    "STRIPE_V1_WEBHOOK_SECRET",
    "STRIPE_ACCOUNT_ID",
    "STRIPE_PORTAL_CONFIG_ID",
    "LIVE_CHECKOUT_ENABLED",
    "BILLING_RELEASE_APPROVED",
    "STRIPE_MANAGED_PAYMENTS_VERIFIED",
    "STRIPE_MANAGED_MARKET",
    "STRIPE_MANAGED_COUNTRY_RULE_PROOF",
  ])
    expect(billingReadiness({ ...env, [key]: undefined }).liveEnabled).toBe(
      false,
    );
  expect(
    billingReadiness({ ...env, STRIPE_SECRET_KEY: "rk_test_synthetic" })
      .catalogueConfigured,
  ).toBe(false);
  expect(
    billingReadiness({ ...env, STRIPE_MODE: "invalid" }).catalogueConfigured,
  ).toBe(false);
});
it("exposes sandbox checkout independently of live activation and never treats legacy prices as a V1 catalogue", () => {
  expect(
    billingReadiness({
      ...env,
      STRIPE_MODE: "test",
      STRIPE_SECRET_KEY: "rk_test_synthetic",
      BILLING_RELEASE_APPROVED: undefined,
      STRIPE_MANAGED_COUNTRY_RULE_PROOF: JSON.stringify({
        ...JSON.parse(env.STRIPE_MANAGED_COUNTRY_RULE_PROOF),
        mode: "test",
      }),
    }),
  ).toEqual({
    catalogueConfigured: true,
    liveEnabled: false,
    sandboxEnabled: true,
  });
  expect(
    billingReadiness({
      STRIPE_MODE: "live",
      STRIPE_SECRET_KEY: "rk_live_synthetic",
      STRIPE_PRO_PRICE_ID: "price_legacy",
    }).catalogueConfigured,
  ).toBe(false);
});
