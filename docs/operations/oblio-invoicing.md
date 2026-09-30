# Use the accountant's Oblio workflow

Mode: how-to. Checked September 30, 2026. Only the accountant has Oblio access. No API credentials, document creation, SPV authorization or purchase has occurred.

## Keep one accounting workflow

Use the existing invoice compliance queue and accountant workflow first. Stripe supplies payment/invoice identifiers; a receipt or PDF alone does not establish Romanian reporting compliance. The queue retains the source invoice, due date, status and actual submission receipt reference. Record that reference after the accountant handles an applicable invoice. Document generation alone is not successful submission.

The official [Oblio API](https://www.oblio.eu/api) supports company/series/VAT catalogues, invoice creation, collection, correction and an `idempotencyKey`. Its example percentages are historical examples, not the company's current rates or exemption treatment. The official [e-Factura guide](https://www.oblio.eu/efactura) describes SPV connection and automatic/manual submission settings. The accountant must confirm the actual settings and applicable scope. A separate open-source generator would duplicate this workflow without establishing registrations or SPV acceptance; none is added.

## Confirm the existing settings

1. Confirm the domestic regime, Article 317 status, enabled B2B/B2C markets, qualifying turnover and applicable OSS/EX approvals. Existing SPV tax-vector evidence and dated confirmation can satisfy this; identity records are already held privately.
2. Confirm the Oblio company identifier, invoice series, service description, currency/exchange-rate rule, invoice wording/tax basis and payment category.
3. Confirm who creates/sends invoices, which transactions enter RO e-Factura, who monitors deadlines/rejections and how actual receipt references reach the compliance queue.
4. Confirm cancellation, partial/full refund and credit-note handling. Retain the original Stripe invoice/payment IDs and Oblio series/number mapping; refunds must not delete audit history.

Manual accountant operation is the initial adapter described in [billing](../BILLING-AND-TAX.md). Secure exported billing records separately from media. Do not collect unnecessary personal identifiers merely because the provider accepts them.

## Optional automation

Oblio uses the account email and a secret from Settings → Account data to obtain an expiring bearer token. The accountant should establish appropriate account access and place credentials directly in the dedicated server secret store. Never put them in chat, browser code, GitHub or coding tasks. Review the provider agreement before activating customer-data processing.

Discover actual company, series and VAT catalogue values. Bind the company to the verified operator, use stable invoice/event idempotency keys, serialize creation within documented rate limits and reconcile uncertain outcomes before retrying. Preserve provider number and payment attribution. Track document generation separately from SPV submission/acceptance; invoice links are private evidence.

Test duplicate events, uncertain creation, wrong-company selection, tax modes, payment allocation, partial refunds, corrections, rejection and actual receipts in an accountant-approved process. Documentation does not establish a safe sandbox for this account; do not issue production invoices as connectivity tests. No automatic Oblio adapter is advertised as implemented.
