// Reviewed against Stripe's tax-compliance table on October 3, 2026.
// Serbia is conditional on the seller's Serbian VAT registration; exclude it
// until that condition is evidenced. Payment availability alone is insufficient.
export const managedMarketPolicy = "stripe-tax-covered-2026-10-03-v1";
export const managedTaxCountries =
  "AL AM AT AU AZ BB BE BG BM BN BY CA CH CM CY CZ DE DK EE EG ES FI FR GB GE GH GI GR HK HR HU ID IE IL IN IS IT JP KE KG KR KW KY KZ LA LI LT LU LV MD MO MT MX MY NG NL NO NP NZ PH PL PT QA RO SA SE SG SI SK TH TJ TR TW UA UG US VG VN ZA ZM ZW".split(
    " ",
  );
export const managedRadarCondition = `is_missing(:billing_address_country:) OR NOT (:billing_address_country: IN (${managedTaxCountries.map((c) => `'${c}'`).join(", ")}))`;

type Environment = Record<string, string | undefined>;
const maximumAge = 30 * 24 * 60 * 60 * 1000;

// This is an operator verification record, not a claim that Stripe exposes a
// custom-rule administration API. Bind evidence to the account and exact policy.
export function managedMarketVerified(env: Environment, now = Date.now()) {
  if (env.STRIPE_MANAGED_MARKET !== "tax_covered") return false;
  try {
    const proof = JSON.parse(env.STRIPE_MANAGED_COUNTRY_RULE_PROOF ?? "null");
    const verifiedAt = Date.parse(proof?.verifiedAt);
    return !!(
      proof &&
      proof.accountId === env.STRIPE_ACCOUNT_ID &&
      ["live", "test"].includes(env.STRIPE_MODE ?? "") &&
      proof.mode === env.STRIPE_MODE &&
      proof.policy === managedMarketPolicy &&
      proof.condition === managedRadarCondition &&
      proof.enabled === true &&
      proof.trafficPercent === 100 &&
      proof.allowRulesDisabled === true &&
      proof.sandboxAcceptancePassed === true &&
      Number.isFinite(verifiedAt) &&
      verifiedAt <= now &&
      now - verifiedAt < maximumAge
    );
  } catch {
    return false;
  }
}
