# Unit economics and starting budget

Mode: explanation. The workbook and calculator contain planning estimates, not actual customer results.

## Measure the margin the owner asked for

Operating margin is revenue excluding consumer VAT and expected refunds, less variable costs and allocated fixed operating costs, divided by that net revenue. Company income or turnover tax, founder salary, marketing, and development are excluded by the owner's instruction. This is not take-home profit.

The 60% target means all included operating costs must fit within 40% of net revenue. A company cannot guarantee that ratio at zero customers. The cost model therefore reports both break-even and the customer count at which the target is reached.

The previous conversation's EUR 150 fixed-cost allowance and EUR 6 blended variable cost were illustrative placeholders. This package replaces them with a line-item model, bounded processing allowance, interval mix, and explicit alternative fixed-cost profiles.

## Files

[Assumptions](../finance/assumptions.json) contains editable inputs, units, provenance, and notes. [Calculator](../finance/calculate.py) creates [the results](../finance/RESULTS.md). [Model tests](../finance/test_model.py) check invariants. [The editable workbook](../finance/VibeScroller-unit-economics.xlsx) presents the same assumptions and formula-driven scenarios. [Handoff validation](PACKAGE-VALIDATION.md) records the calculation checks and their limits.

The base model assumes 70% Starter users, 30% Pro, and an interval mix of 15% weekly, 65% monthly, and 20% annual. These shares are assumptions, not customer research. It assumes 60% use of included processing credits and tests full use separately.

Consumer VAT of 21% is a scenario, not a conclusion about the company's current registration. Exemption and 27% stress cases are included. Foreign exchange values are editable assumptions, not current exchange-rate quotes.

## Included costs

The model includes payment percentage fees and the RON-denominated fixed fee, Stripe Billing, a reserve for selected tax calculation, expected refunds, dispute-fee exposure, payment FX exposure, all-in metered processing, storage/backend/email/monitoring, support and invoice-handling provision, and fixed operational expense.

Metered processing covers AI, media/coding sandbox time, tool calls, relevant supplier tax, and retry exposure inside the credit ceiling. Do not add the same job cost again as a separate per-user expense. The illustrative provider-cost sheet shows how a quote could be estimated before real usage records exist.

Separate customer-paid API inference from company-paid infrastructure. A BYO key lowers the company's model bill but does not eliminate execution, storage, or support costs. The user's ChatGPT allowance cannot be monetized as an unlimited shared backend.

## Starting spend

Local development can use the existing laptop with no new fixed subscription. Cap incidental API tests and trial processing within a combined EUR 10 monthly pre-customer budget. This excludes the owner's existing EUR 121 subscription, which is recorded as an existing personal cost rather than a product input.

A new Vercel Pro plan begins at USD 20, so a new commercial Vercel deployment cannot meet that ceiling. Sources S13 and S14. The EUR 8 lean profile assumes a budget web host, free-tier backend/auth where eligible, no idle sandbox, and a small variable reserve. It does not include a new Vercel subscription.

The EUR 30 profile is a lean paid-host operating assumption. The EUR 80 profile allows more room for backup, monitoring, invoicing, and support costs. Neither is a provider bundle quote. Replace them when the operator's actual bills are known.

Do not buy an always-on GPU, enterprise SSO, paid token vault, custom Stripe portal domain, or large hosted observability plan before a need exists. These can each break the starting budget without helping the first workflow.

## Limits of the forecast

Full allowance consumption is budgeted, not forbidden. The service must remain viable when customers use what they purchased. Annual prices reduce normalized revenue and cannot be justified by assuming customers forget to use credits.

The stress scenario with triple metered cost demonstrates why user growth cannot repair a structurally inadequate allowance. When variable costs exceed the target share of revenue, increase price, reduce future plan allowances with proper notice, or improve costs. Do not silently degrade an already purchased plan.

Cross-customer cache savings, promotional vendor credits, unpaid founder labor, and hypothetical business revenue generated for users are excluded. The model does not recover an unquoted initial legal or security-review bill. Add that amount to a separate cash-planning scenario when it exists.

Revenue recognition and cash receipts differ for annual plans. Do not spend the entire annual payment on a single coding run. Reserve future service obligations and maintain runway for refunds and provider charges.

## Pricing validation

Before enabling live checkout, run a representative batch through the actual provider configuration. Compare quoted and billed cost, include image tokens and billed reasoning tokens, test expensive failures, and confirm termination billing. Update the model and leave enough headroom for variance.

Recheck margin after each meaningful change in provider cost, tax treatment, payment mix, storage use, or paid operational service. The cost ledger is a product requirement because the margin target depends on observed costs, not a spreadsheet alone.
