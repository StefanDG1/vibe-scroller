# Enforce Managed Payments tax coverage

Mode: reference. Decision date: October 3, 2026. Supersedes ADR 022's live market configuration.

The approved launch scope is consumer purchases where Stripe Managed Payments assumes applicable indirect-tax compliance. Payment-supported countries and tax-covered countries are different lists. Accepting a payment alone does not establish tax coverage.

The reviewed [tax-compliance table](https://docs.stripe.com/payments/managed-payments/tax-compliance) includes 82 cross-border markets. Serbia depends on the seller not being VAT-registered there; that fact is unconfirmed. The versioned configuration includes the other 81 markets, including all EU27 countries and the Romanian domestic market. Stripe's own transaction, product and restricted-territory rules continue to apply. This is not an unrestricted worldwide offer.

`STRIPE_MANAGED_MARKET=tax_covered` requires current operator evidence bound to the exact Stripe account, mode, policy version and Radar condition. It must confirm enabled enforcement at 100% traffic, no enabled Allow bypass, and passed sandbox acceptance. Evidence expires after 30 days and must be renewed after coverage or rule changes. Missing, stale, future-dated, mismatched or malformed evidence blocks new checkout and live plan changes. Dashboard verification is explicit; no undocumented rule-administration API is invented.

The Radar condition blocks a missing billing country or one outside the reviewed list. A negated comparison alone does not match missing attributes. Stripe evaluates Allow rules before Block rules, so no enabled Allow rule may bypass the restriction. Keep this account-wide rule enabled for recurring and one-off payments; changing an app release flag does not stop existing Stripe renewals. Review provider coverage and rules at least monthly and immediately after changing them.

Checkout collects the mandatory actual billing address. The app omits an additional country selector. An explicitly supplied unsupported country is rejected, but an app argument is never Stripe's location evidence. Subscription and top-up reservations and provider metadata retain the exact market-policy version. No forbidden Managed Payments tax, currency or customer-update parameters are added, and a refusal never falls back to direct billing.

Historical `provider_supported` remains available only in sandbox for earlier acceptance. It cannot activate live billing. Direct billing retains its separate tax and country rules. Live readiness additionally requires the verified `tax_covered` policy, account/product eligibility and both release switches.

Native configuration, actual sandbox outcomes and deployment are recorded in [the implementation record](../implementation-status.md). No real-money test was performed. A saved rule does not close hosted funding, policy-publication or complete paid-workflow gates.
