# Confirm tax treatment and publish the policies

Mode: how-to. Updated October 3, 2026. Owner-supplied ONRC records establish the intended operator's identity and listed software activities. The September 30 ANAF check reported ordinary VAT registration false and inactive status false. The owner supplied an official October 1 query reporting absence from both the Article 316 registration and cancelled-registration registers. This does not establish Article 317, OSS/EX status, turnover eligibility or invoice treatment for every market. Live checkout remains disabled pending its applicable release checks.

The owner reports that the accountant confirmed existing automatically generated Stripe artifacts are sufficient and handles the company's filing. Record this as owner-reported accountant confirmation, not independent professional review. For the selected Managed Payments route, provide the existing settlement/fee documents and bank records; do not request the same company records or create a duplicate consumer-invoice system. The remaining questions below apply only to an alternative direct-billing mode or a materially changed transaction scope.

VAT is not one yes/no setting. Domestic treatment, business purchases, customer location and customer business status can produce different obligations at the same time. This is an implementation checklist for discussion with the company's accountant, not a determination of its status.

## Use the selected merchant route

The owner selected Stripe Managed Payments if eligible. Its transaction merchant handles its applicable customer sales tax and consumer invoice obligations under the verified provider contract. Exponential Education remains responsible for its own company accounting, provider-fee documents, settlements and applicable tax/reporting obligations. Do not issue a duplicate Exponential consumer invoice for a merchant-of-record transaction merely to populate the direct-billing queue. Direct billing remains an alternative gated configuration.

The private operator page `/account/invoices` now offers a monthly provider settlement download with recent authentication. It exports provider balance movements, fee types and payout references, without customer content or invented VAT classification. The dedicated sandbox read succeeded on October 2. This JSON handover is not an invoice, tax return, proof of exemption or accountant approval. Reconcile it with Stripe fee documents, Managed Payments tax reports and the company bank records. An in-progress month is explicitly marked incomplete. Live restricted-key read permissions must be configured separately.

Before paid activation, verify Managed Payments eligibility and accepted terms, the intended customer market, the current legal/provider publication checklist, and the accountant's treatment of actual company/provider transactions. The owner's zero-revenue attestation and ANAF/VIES results are retained evidence, not a blanket registration determination.

## Choose the domestic treatment from evidence

| Situation                                                    | Consequence for VibeScroller                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eligible Romanian small-business exemption under Article 310 | Do not collect domestic VAT on qualifying exempt supplies. Input VAT generally cannot be deducted. The current Romanian exemption ceiling is RON 395,000. The accountant must calculate qualifying turnover across the company's activities, including its other products, rather than looking only at VibeScroller revenue |
| Ordinary Romanian VAT registration under Article 316         | Apply the applicable VAT rate and reporting rules. Romanian standard VAT is currently 21%; do not assume software sold by an education company qualifies for an education exemption. Eligible input VAT may be deductible                                                                                                   |
| Special Article 317 registration                             | A separate registration can be required for certain EU business-service purchases or supplies even when domestic sales remain exempt. It does not turn the business into an ordinary domestic VAT collector and does not by itself grant ordinary input VAT deduction                                                       |
| Registration status unresolved                               | Use `pending_evidence`; leave live checkout off                                                                                                                                                                                                                                                                             |

ANAF explains the [RON 395,000 exemption threshold and its turnover basis](https://static.anaf.ro/static/10/Brasov/Brasov/regim_special_tva.pdf), the [21% standard rate](https://static.anaf.ro/static/10/Anaf/AsistentaContribuabili_r/Cotele_de_TVA_09.2025.pdf), and [Article 317 registration for relevant cross-border services](https://static.anaf.ro/static/10/Anaf/legislatie/OPANAF_2420_2025.pdf). The registration decision depends on the company's actual activity and record. Do not remove an existing registration just to achieve the intended exemption configuration.

## Decide which customers can purchase

For qualifying EU cross-border consumer electronic services, the combined EUR 10,000 threshold has conditions, including the current and preceding calendar years and establishment requirements. Above the applicable threshold, destination-country treatment generally applies. OSS can simplify reporting of VAT due in participating countries; it is not a VAT exemption. See the European Commission's [One Stop Shop explanation](https://vat-one-stop-shop.ec.europa.eu/one-stop-shop_en).

The cross-border SME scheme is a different route. A qualifying EU business may seek exemption in selected member states, subject to their national thresholds and other conditions, with Union turnover no more than EUR 100,000 in the current and preceding calendar years. It requires prior notification and confirmation of the EX number for the selected countries. Romanian exemption alone does not establish this foreign exemption. See the Commission's [cross-border SME requirements](https://sme-vat-rules.ec.europa.eu/sme-scheme/cross-border-sme-scheme_en).

For EU business customers, establish their business status and place of supply; validate VAT identifiers where appropriate. A reverse-charge invoice is a distinct treatment, not a blanket zero-tax setting for anyone selecting "business." Foreign cloud/AI/email invoices also need review: supplier country, invoice treatment and Article 317/payment obligations can matter even before the company has paying VibeScroller customers. Keep unsupported countries disabled until their treatment is reviewed.

## Alternative direct billing: confirm the applicable treatment

Identity documents are now supplied; do not request them again. Originals, extracted fields and the dated registry response stay in ignored `private/company-records`, outside GitHub. The fiscal annex is an incorporation request dated May 20, with ordinary VAT options unchecked on visual inspection; it is not a current complete tax determination. No independent digital-signature verification or later-change certificate is claimed.

Ask for an existing **Situația vectorului fiscal** from ANAF/SPV, any applicable **Certificat de înregistrare în scopuri de TVA** (Article 316 or special Article 317), and existing OSS/EX approval if applicable. If a registration does not apply, record a dated accountant confirmation and its basis; do not request a new registration merely for this checklist. Confirm enabled countries/customer types, qualifying turnover, invoice series and RO e-Factura responsibility. See [the Oblio handover](oblio-invoicing.md).

Ask the accountant to provide a dated answer to these questions:

1. What is the legal company name, registered address, trade-register identifier, tax identifier and current Article 310/316 treatment? Attach the current official record or reference.
2. Does the company have or need Article 317 registration for its actual suppliers and EU business customers? What input tax, returns and payment obligations apply?
3. What is qualifying domestic turnover to date across all company activities? What EU consumer electronic-service turnover and Union turnover apply to the separate thresholds?
4. Which customer countries and B2B/B2C treatments can launch? Is OSS, an EX registration, or a country-specific registration needed, and when is it effective?
5. What invoice wording, RO e-Factura workflow and filing calendar should the app enforce?

Record the evidence and effective dates in the tax configuration. The implementation already supports exemption-target and ordinary modes with separate registration evidence. Tests cannot create a registration or substitute for this confirmation.

A false e-Factura registry membership result is not a determination that reporting obligations are absent. Confirm the applicable transaction scope with the accountant; do not use registry absence to disable a required invoice workflow.

## Complete legal publication

The authoritative checklist is [legal/POLICY-IMPLEMENTATION.md](../../legal/POLICY-IMPLEMENTATION.md). Work through its eight publication steps: company record, domestic/special VAT status, enabled markets/invoices, provider agreements, deployed-behavior comparison, qualified review, effective date/version/approval, and retained publication history.

Prepare the operator details, verified support channel, active provider list and agreements, retention periods and source-rights process. Review terms, privacy, refunds, legal notice, cookies, acceptable use, copyright, subprocessors and DPA against actual behavior. Keep optional email/analytics consent separate. Verify cancellation, withdrawal requests, export and deletion on mobile. Keep inactive providers and placeholders out of published policy statements.

The drafts are in [legal](../../legal). The broader release record is [docs/LAUNCH-CHECKLIST.md](../LAUNCH-CHECKLIST.md), and staging evidence is [implementation-status.md](../implementation-status.md). No professional legal review has occurred. Keep draft labels and live checkout disabled until matching evidence and publication approval are recorded.
