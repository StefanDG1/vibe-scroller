import { expect, it } from "vitest";
import {
  managedMarketPolicy,
  managedMarketVerified,
  managedRadarCondition,
  managedTaxCountries,
} from "../packages/providers/managed-markets";

const now = Date.UTC(2026, 9, 3);
const proof = {
  accountId: "acct_synthetic",
  mode: "live",
  policy: managedMarketPolicy,
  condition: managedRadarCondition,
  enabled: true,
  trafficPercent: 100,
  allowRulesDisabled: true,
  sandboxAcceptancePassed: true,
  verifiedAt: new Date(now).toISOString(),
};
const env = {
  STRIPE_ACCOUNT_ID: "acct_synthetic",
  STRIPE_MODE: "live",
  STRIPE_MANAGED_MARKET: "tax_covered",
  STRIPE_MANAGED_COUNTRY_RULE_PROOF: JSON.stringify(proof),
};

it("requires exact account, mode, policy, rule, coverage, acceptance and current operator evidence", () => {
  expect(managedMarketVerified(env, now)).toBe(true);
  for (const change of [
    { accountId: "acct_other" },
    { mode: "test" },
    { policy: "old" },
    { condition: "NOT (:billing_address_country: IN ('RO'))" },
    { enabled: false },
    { trafficPercent: 99 },
    { allowRulesDisabled: false },
    { sandboxAcceptancePassed: false },
    { verifiedAt: "invalid" },
    { verifiedAt: new Date(now + 1).toISOString() },
    { verifiedAt: new Date(now - 30 * 86400000).toISOString() },
  ])
    expect(
      managedMarketVerified(
        {
          ...env,
          STRIPE_MANAGED_COUNTRY_RULE_PROOF: JSON.stringify({
            ...proof,
            ...change,
          }),
        },
        now,
      ),
    ).toBe(false);
  for (const malformed of [undefined, "", "{", "null", "[]", "true"])
    expect(
      managedMarketVerified(
        { ...env, STRIPE_MANAGED_COUNTRY_RULE_PROOF: malformed },
        now,
      ),
    ).toBe(false);
  expect(managedMarketVerified({ ...env, STRIPE_MODE: "unknown" }, now)).toBe(
    false,
  );
  expect(
    managedMarketVerified(
      { ...env, STRIPE_MANAGED_MARKET: "provider_supported" },
      now,
    ),
  ).toBe(false);
});

it("covers the reviewed EU27 and omits unconfirmed conditional and unsupported markets", () => {
  expect(new Set(managedTaxCountries).size).toBe(81);
  for (const country of "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE".split(
    " ",
  ))
    expect(managedTaxCountries).toContain(country);
  for (const country of ["RS", "CN", "AE", "XX", ""])
    expect(managedTaxCountries).not.toContain(country);
  expect(managedRadarCondition).toMatch(
    /^is_missing\(:billing_address_country:\) OR NOT \(/,
  );
});
