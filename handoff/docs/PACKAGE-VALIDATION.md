# Handoff validation record

Mode: reference. Specification version: 1.0.0.

## Result

The document package passes its local consistency checks. The financial model is suitable for planning with the stated assumptions. These checks do not establish that VibeScroller is implemented, legally approved, secure in production, or connected to live providers.

## Checks completed

| Check | Result | Evidence |
| --- | --- | --- |
| Local document links and required files | Passed | `python scripts/validate_package.py` |
| JSON syntax and pricing catalogue consistency | Passed | Package validator compares the contracts and financial inputs |
| Requirement coverage | Passed | All 36 product requirements have implementation and acceptance references |
| Structured output examples | Passed | Three JSON Schema examples validate, and unknown-property rejection is checked |
| Dashboard fixture semantics | Passed | Merge counts and evidence states remain consistent |
| Financial invariants | Passed | Eight tests in `finance/test_model.py` |
| Independent financial reconciliation | Passed | All 10 workbook scenario rows match `finance/calculate.py` for revenue, costs, break-even, and target feasibility |
| Workbook formula errors | None found | Formula-result search found no REF, DIV/0, VALUE, NAME, or N/A errors |
| Workbook presentation | Reviewed | Overview rendered and inspected for readable labels and unclipped tables |

Run the package validator again after changing a document or contract. Run the financial tests after changing the calculator. Editing spreadsheet assumptions does not update the JSON inputs or the production pricing catalogue automatically.

## Financial interpretation

The calculations are verified. The workload, customer mix, payment mix, utilization, support provision, fixed costs, exchange rates, and tax scenarios are planning inputs rather than measured customer results. Provider prices have source records, but a provider's published price is not an invoice for this deployment.

The base scenario is deliberately lean. Higher fixed costs, full allowance use, annual billing, higher payment costs, and uncontrolled compute costs have separate scenarios. The model does not claim that two customers pay every possible startup expense. It excludes salary, marketing, development, company tax, and any unquoted initial legal or security-review bill as described in the financial documentation.

## Checks not performed

No application source was implemented or executed as part of this handoff. No Instagram or TikTok account import, transcription benchmark, repository scan, coding run, pull request, mobile browser session, live payment, provider account connection, or production deployment was tested.

The 56 acceptance cases in [Acceptance tests](ACCEPTANCE-TESTS.md) specify future application checks. They are not reported as passing. The 22 release gates in [Launch checklist](LAUNCH-CHECKLIST.md) require implementation evidence or external verification.

The legal files are review drafts. The company's ordinary or special VAT status was not independently established. Production tax configuration, invoice obligations, provider agreements, commercial AI permissions, and media access rights must match actual evidence before the related feature goes live.

## Reproduce the checks

Run these commands from the handoff root with Python 3.10 or later:

```sh
python scripts/validate_package.py
python finance/test_model.py
python finance/calculate.py
```

The package validator runs JSON Schema checks when `jsonschema` is installed. The supplied validation record used that package. The finance calculator and its tests use the Python standard library.
