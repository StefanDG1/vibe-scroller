# Use the accountant's Oblio workflow

Mode: how-to. Checked October 1, 2026. Only the accountant has Oblio access. No API credentials, document creation, SPV authorization or purchase has occurred.

October 2 update: the owner selected [Stripe Managed Payments if eligible](../adr/017-dedicated-stripe-and-managed-payments.md). Account/product activation and sandbox verification remain pending. For covered Managed Payments transactions, Link supplies the customer tax invoice. Do not duplicate it by treating Exponential Education as the customer transaction's merchant of record. The direct-invoice queue described below does not receive Managed Payments subscriptions. The accountant still handles the company's records, income, provider fees and payout reconciliation. Use Stripe's balance/payout reports with separate withheld_tax and fee_net_of_withheld_tax columns; a fee total that includes withheld tax is not simply a processing expense. Agree the accounting treatment and secure reporting procedure with the accountant. No automated Managed Payments accountant export or legal approval is claimed.

## Keep one accounting workflow

Use the existing invoice compliance queue and accountant workflow first. Stripe supplies payment/invoice identifiers; a receipt or PDF alone does not establish Romanian reporting compliance. The queue retains the source invoice, due date, status and actual submission receipt reference. Record that reference after the accountant handles an applicable invoice. Document generation alone is not successful submission.

The official [Oblio API](https://www.oblio.eu/api) supports company/series/VAT catalogues, invoice creation, collection, correction and an `idempotencyKey`. Its example percentages are historical examples, not the company's current rates or exemption treatment. The official [e-Factura guide](https://www.oblio.eu/efactura) describes SPV connection and automatic/manual submission settings. The accountant must confirm the actual settings and applicable scope. A separate open-source generator would duplicate this workflow without establishing registrations or SPV acceptance; none is added.

## Confirm the existing settings

The implemented private queue is `/account/invoices`. Configure verified WorkOS subjects in server-side `INVOICE_OPERATOR_SUBJECTS_JSON`; empty or malformed configuration denies access. The staging owner's verified identity is its sole operator, with identifiers retained privately. Runtime authorization uses subjects, never matching emails or customer workspace ownership. The paginated queue shows Stripe source links and deadlines. Receipt recording requires recent sign-in, is rate limited and audited, and retains the original reference. It does not verify ANAF acceptance or create Oblio documents. See [ADR 010](../adr/010-invoice-operator-access.md).

1. Confirm the domestic regime, Article 317 status, enabled B2B/B2C markets, qualifying turnover and applicable OSS/EX approvals. Existing SPV tax-vector evidence and dated confirmation can satisfy this; identity records are already held privately.
2. Confirm the Oblio company identifier, invoice series, service description, currency/exchange-rate rule, invoice wording/tax basis and payment category.
3. Confirm who creates/sends invoices, which transactions enter RO e-Factura, who monitors deadlines/rejections and how actual receipt references reach the compliance queue.
4. Confirm cancellation, partial/full refund and credit-note handling. Retain the original Stripe invoice/payment IDs and Oblio series/number mapping; refunds must not delete audit history.

Manual accountant operation is the initial adapter described in [billing](../BILLING-AND-TAX.md). Secure exported billing records separately from media. Do not collect unnecessary personal identifiers merely because the provider accepts them.

Each queue entry now offers **Download accountant record**. This private JSON handover contains the verified seller identity, Stripe invoice and customer identifiers, available buyer name/address/tax identifiers, issue date, currency, subtotal, provider tax amount, total, paid/remaining amounts and provider invoice links. Monetary amounts are integer minor units; EUR 1210 means EUR 12.10. The operator must reconcile these source amounts with the applicable invoice treatment rather than assume every transaction is exempt. Access requires the explicit active invoice-operator identity and matching invoice customer/workspace/environment. Responses are private and not cached. It is a payment-provider source record, not a newly issued Oblio invoice or proof of ANAF acceptance. Send it through the accountant's agreed secure channel; do not upload it to GitHub.

## Optional automation

Oblio uses the account email and a secret from Settings → Account data to obtain an expiring bearer token. The accountant should establish appropriate account access and place credentials directly in the dedicated server secret store. Never put them in chat, browser code, GitHub or coding tasks. Review the provider agreement before activating customer-data processing.

Discover actual company, series and VAT catalogue values. Bind the company to the verified operator, use stable invoice/event idempotency keys, serialize creation within documented rate limits and reconcile uncertain outcomes before retrying. Preserve provider number and payment attribution. Track document generation separately from SPV submission/acceptance; invoice links are private evidence.

Test duplicate events, uncertain creation, wrong-company selection, tax modes, payment allocation, partial refunds, corrections, rejection and actual receipts in an accountant-approved process. Documentation does not establish a safe sandbox for this account; do not issue production invoices as connectivity tests. No automatic Oblio adapter is advertised as implemented.
