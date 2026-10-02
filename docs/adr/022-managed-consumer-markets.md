# Delegate consumer-market eligibility to Managed Payments

Status: owner approved; implementation and production acceptance in progress. Date: October 2, 2026.

October 3 update: [ADR 035](035-managed-tax-covered-markets.md) supersedes the live market configuration below. Payment acceptance and indirect-tax coverage are distinct. `provider_supported` cannot enable live checkout; use verified `tax_covered` enforcement.

The owner explicitly approved checkout wherever Stripe Managed Payments supports the customer, replacing the earlier EU VAT-territory-only launch scope. The offer remains for private consumers. This decision does not authorize business purchases, direct billing outside its reviewed countries, new purchases, a real-money test, or a change to Exponential Education's tax registrations.

Stripe's [current eligibility documentation](https://docs.stripe.com/payments/managed-payments/eligibility), retrieved with Stripe CLI 1.53.0 on October 2, states that customer purchases are supported in more than 195 countries and territories, subject to its restricted territories and account/product eligibility. Stripe remains authoritative for the actual billing location and transaction. Do not market this as unrestricted worldwide availability or maintain a second unofficial sanctions list in the app.

The backend setting `STRIPE_MANAGED_MARKET=provider_supported` applies only when `STRIPE_BILLING_ROUTE=managed_payments`. It removes the app's preliminary country selector and ignores a caller-supplied country for that route. Stripe Checkout still collects the billing address and applies its own eligibility, tax and currency rules. An unset setting preserves the configured-country policy; an unknown Managed Payments policy fails closed. Direct billing retains its existing tax evidence and country checks.

Checkout reservations bind the effective route and country policy rather than an untrusted country string that is unused by Managed Payments. Subscription and top-up checkout share this behavior. No forbidden `automatic_tax`, `adaptive_pricing` or `customer_update` parameter is added to Managed Payments, and no refusal falls back to direct billing.

This decision resolves the operator's market-scope choice. It does not complete provider agreements, policy publication, isolated execution or the final paid V1 workflow. Live switches remain disabled until the applicable acceptance is recorded. Keep EUR base prices; the provider confirms available local-currency options and the final payable total.
