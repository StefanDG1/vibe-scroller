# Confirm tax treatment and publish the policies

Mode: how-to. Checked 30 September 2026. The operator intends to use EXPONENTIAL EDUCATION S.R.L.; its current registration and tax status have not been verified. Live checkout remains disabled.

VAT is not one yes/no setting. Domestic treatment, business purchases, customer location and customer business status can produce different obligations at the same time. This is an implementation checklist for discussion with the company's accountant, not a determination of its status.

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

## Request one accountant confirmation

Ask the accountant to provide a dated answer to these questions:

1. What is the legal company name, registered address, trade-register identifier, tax identifier and current Article 310/316 treatment? Attach the current official record or reference.
2. Does the company have or need Article 317 registration for its actual suppliers and EU business customers? What input tax, returns and payment obligations apply?
3. What is qualifying domestic turnover to date across all company activities? What EU consumer electronic-service turnover and Union turnover apply to the separate thresholds?
4. Which customer countries and B2B/B2C treatments can launch? Is OSS, an EX registration, or a country-specific registration needed, and when is it effective?
5. What invoice wording, RO e-Factura workflow and filing calendar should the app enforce?

Record the evidence and effective dates in the tax configuration. The implementation already supports exemption-target and ordinary modes with separate registration evidence. Tests cannot create a registration or substitute for this confirmation.

## Complete legal publication

The authoritative checklist is [legal/POLICY-IMPLEMENTATION.md](../../legal/POLICY-IMPLEMENTATION.md). Work through its eight publication steps: company record, domestic/special VAT status, enabled markets/invoices, provider agreements, deployed-behavior comparison, qualified review, effective date/version/approval, and retained publication history.

Prepare the operator details, verified support channel, active provider list and agreements, retention periods and source-rights process. Review terms, privacy, refunds, legal notice, cookies, acceptable use, copyright, subprocessors and DPA against actual behavior. Keep optional email/analytics consent separate. Verify cancellation, withdrawal requests, export and deletion on mobile. Keep inactive providers and placeholders out of published policy statements.

The drafts are in [legal](../../legal). The broader release record is [docs/LAUNCH-CHECKLIST.md](../LAUNCH-CHECKLIST.md), and staging evidence is [implementation-status.md](../implementation-status.md). No professional legal review has occurred. Keep draft labels and live checkout disabled until matching evidence and publication approval are recorded.
