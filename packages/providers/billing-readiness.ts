import { managedMarketVerified } from "./managed-markets";
import { policyRelease } from "../policy/publication";

type Environment = Record<string, string | undefined>;
const tiers = ["STARTER", "PRO"],
  intervals = ["WEEKLY", "MONTHLY", "ANNUAL"];
export function billingReadiness(env: Environment) {
  const mode = env.STRIPE_MODE;
  const catalogueConfigured =
    ["test", "live"].includes(mode ?? "") &&
    new RegExp(`^[sr]k_${mode}_`).test(env.STRIPE_SECRET_KEY ?? "") &&
    !!env.STRIPE_ACCOUNT_ID &&
    !!env.STRIPE_V1_WEBHOOK_SECRET &&
    !!env.STRIPE_PORTAL_CONFIG_ID &&
    tiers.every((tier) =>
      intervals.every(
        (interval) => !!env[`STRIPE_${tier}_${interval}_PRICE_ID`],
      ),
    );
  const liveEnabled =
    catalogueConfigured &&
    mode === "live" &&
    env.LIVE_CHECKOUT_ENABLED === "true" &&
    env.BILLING_RELEASE_APPROVED === "true" &&
    env.POLICY_RELEASE_VERSION === policyRelease.id &&
    (env.STRIPE_BILLING_ROUTE !== "managed_payments" ||
      (env.STRIPE_MANAGED_PAYMENTS_VERIFIED === "true" &&
        managedMarketVerified(env)));
  return {
    catalogueConfigured,
    liveEnabled,
    sandboxEnabled:
      catalogueConfigured &&
      mode === "test" &&
      (env.STRIPE_BILLING_ROUTE !== "managed_payments" ||
        env.STRIPE_MANAGED_MARKET !== "tax_covered" ||
        managedMarketVerified(env)),
  };
}
