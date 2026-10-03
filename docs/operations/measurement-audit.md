# Audit consented measurement

Mode: reference. October 3, 2026 source audit for P07. No new identity tracking, consent exception or analytics provider configuration is authorized by an event name.

| Journey fact           | Existing event or authoritative record                                  | Interpretation/limit                                                                                     |
| ---------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Capture/import         | `source_captured`, `import_completed`, backend source/reservation       | Client success telemetry is optional; backend determines committed capture                               |
| Processing completion  | `analysis_completed`, saved source/receipt                              | Browser observes a state transition and can miss/repeat it; not an authoritative unique completion count |
| Analysis open          | `source_viewed` with ready/coverage                                     | Candidate library activation; has no persistent user/workspace ID                                        |
| Explicit usefulness    | Private workspace feedback                                              | No inference from browsing or inactivity                                                                 |
| Repository connection  | `repository_connected`, installation/repository records                 | Connection success does not authorize coding                                                             |
| Proposal decision/plan | `proposal_reviewed`, `plan_saved`, versioned proposal/feedback          | Correct no-action remains a valid project decision                                                       |
| Execution/draft        | `execution_approved`, `draft_pr_created`, run/PR receipts               | Browser success does not replace approvals or unique GitHub PR identity                                  |
| Merge/reversal/benefit | Authoritative PR projection/history and outcome feedback                | `pr_reconciled` is a refresh attempt, not a verified merge or benefit                                    |
| Checkout/payment       | Billing intent, signed/reconciled Stripe records and entitlement period | No payment event from a checkout click; founder/fixtures are excluded from independent demand            |

`apps/starter/lib/analytics-events.ts` uses an allowlist; URLs, titles, transcript, code, email, keys and unknown properties are stripped. `analytics.ts` uses consent, DNT/GPC, disabled replay/autocapture and random memory-only identity. Withdrawal is checked again before capture/send. `tests/analytics-events.test.ts` and `tests/analytics-consent.test.ts` verify these controls. Payment/PR replay tests verify backend facts separately.

A memory-only browser identifier cannot establish distinct authenticated users, workspace-bound events or later-week retention. P07 therefore remains partially complete. Do not relabel session funnels as cohort activation/retention. Introducing persistent identity needs an explicit privacy/consent/retention design consistent with published policies; the current audit does not silently change those policies.

Use voluntary private study IDs and observed backend facts for the initial protocol. Consenting and non-consenting participants can use the product; report analytics coverage/missingness. Optional analytics is not an operational logging exception. Workspace authorization/security records retain their documented purpose separately. Verify collector receipt/deduplication, logout/workspace change and no-consent use in real sessions before closing P07. Automatic capture and replay remain off.
