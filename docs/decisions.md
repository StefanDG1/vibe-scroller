# Product decisions

Mode: reference. These decisions supersede earlier alternatives in the discussion.

| ID  | Decision                                                                                                                                                | Basis                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| D01 | Product name VibeScroller, motto Make scrolling productive, proposed `scroll.companynerve.com`                                                          | Owner choice                                        |
| D02 | Separate repository and provider projects derived from CompanyNerve                                                                                     | Owner choice and upstream boundary                  |
| D03 | Responsive web app first, installable PWA optional, no required native client                                                                           | Latest owner instruction                            |
| D04 | English interface; individuals and businesses may purchase in Managed Payments' verified tax-covered markets; direct billing retains reviewed countries | Owner approval October 3, 2026; ADR 039             |
| D05 | URLs, uploads, bulk imports, and Telegram capture ship in V1                                                                                            | Owner-approved practical capture fallback           |
| D06 | Automatic Instagram Saved synchronization is experimental and disabled by default                                                                       | Access, reliability, and rights are not established |
| D07 | TikTok official portability adapter is designed but gated by approval                                                                                   | External provider requirement                       |
| D08 | Audio plus visual evidence, original transcription preserved, no caption-only video claims                                                              | Core requirement                                    |
| D09 | Selected repos, business profiles, no forced match, evidence-backed proposals                                                                           | Core requirement                                    |
| D10 | Integrated draft PR creation ships in V1 after approval                                                                                                 | Latest execution decision                           |
| D11 | Optional local Codex runner is the default coding route; explicit prepaid cloud execution is available                                                  | Cost and owner preference                           |
| D12 | WorkOS account identity is separate from GitHub and AI authorization                                                                                    | Security architecture                               |
| D13 | No general ChatGPT subscription inference promise outside verified official access                                                                      | Research limitation                                 |
| D14 | Same-workspace deduplication ships. Cross-workspace cache reuse stays off                                                                               | Privacy and rights default                          |
| D15 | MIT for V1-authored source; upstream notices preserved                                                                                                  | CV/public-source priority and later proprietary V2  |
| D16 | Fully self-contained distribution is deferred; one personal deployment path is authorized for preparation, with independent acceptance pending          | October 3 post-V1 implementation; ADR 051           |
| D17 | Starter and Pro with weekly, monthly, annual billing for individuals and businesses. Custom scope by contact                                            | Owner choice                                        |
| D18 | No unlimited AI, no automatic paid fallback, no shared founder subscription                                                                             | Financial and authorization boundary                |
| D19 | Target at least 60% operating margin before company tax, excluding salary, marketing, and development                                                   | Owner-defined metric                                |
| D20 | Under EUR 10 incremental pre-customer spending is a target, not a claim that a new Vercel Pro plan fits                                                 | Budget conflict resolved explicitly                 |
| D21 | Vercel remains supported. Reuse an eligible existing plan if confirmed; otherwise offer the documented budget host profile                              | Deployment policy, no silent vendor switch          |
| D22 | Intended initial tax strategy uses the Romanian small-business exemption when the official record permits it                                            | Recommendation, not verified tax status             |
| D23 | All legal and tax modes are concrete, but production activation needs matching evidence                                                                 | No invented legal facts                             |
| D24 | V2-created businesses use customer-owned service and merchant accounts                                                                                  | Owner's explicit boundary                           |
| D25 | V2 is proprietary, paid-only, and excluded from V1 implementation                                                                                       | Owner choice                                        |
| D26 | Preserve the exact V2 mode label `full retard mode` internally, with finite permissions and spending                                                    | Owner's requested wording                           |
| D27 | Mark Builds Brands permission is owner-attested; no unsupported affiliation or licence identification                                                   | Owner's permission statement                        |

## Workspace knowledge and issue planning

| ID  | Decision                                                                                                                                                                                          | Basis                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| D28 | Knowledge libraries, connected insights and organization feedback remain separate per workspace. Automatic organization preserves manual corrections.                                             | Owner confirmation October 3; ADR 052 |
| D29 | Users may grant All repositories in GitHub, then explicitly select the active subset through an app checklist. Unselected code and future repositories are not automatically analyzed.            | Owner request October 3; ADR 052      |
| D30 | AI drafts project business context by default for user confirmation/correction. Combined ideas can produce separately reviewed GitHub issues without coding approval; coding/PR approvals remain. | Owner confirmation October 3; ADR 052 |

[The V1 knowledge-library plan](V1-KNOWLEDGE-LIBRARY-PLAN.md) specifies missing implementation and acceptance. These product decisions do not claim that new UI, synthesis or issue publication already exists.

## Current hosting and execution

On October 2, 2026, the owner selected Vercel Pro, withdrew Netlify use and asked to avoid E2B. Vercel Sandbox replaces E2B behind the execution adapter. No new hosting purchase is authorized. Shared included credits do not mean unlimited free execution. [ADR 023](adr/023-vercel-isolated-execution.md) records implementation and verification boundaries.

## Known operator context

The founder uses an Android OnePlus 13 and a Lenovo Yoga Pro 9i 2024 with 32 GB RAM and an RTX 4070 laptop GPU. Typical personal input is one to five English videos daily. These are sizing assumptions, not limits on other customers' devices.

The founder reports an existing ChatGPT Pro x5 subscription costing EUR 121 per month. It is an existing personal expense and does not fund shared customer inference. The founder reports a live-ready Stripe account. This package does not independently verify either entitlement.

Company details come from CompanyNerve's published configuration. They require confirmation before legal-page publication. The VAT statements in the conversation conflict. No document resolves that conflict by guessing a registration number or removing an existing registration.

## Explicit nonclaims

The product has not been built by this documentation task. Automatic imports have not been tested against the founder's account. Model accuracy, demand, production unit costs, and margins are not measured. Domain availability, trademark rights, provider commercial approval, tax registration, and legal clearance are not established.

## October 5: bounded full-library scan and personal repository allowance

Follow [ADR 058](adr/058-bounded-full-library-scans.md): full URL-link pagination with a saved cutoff, explicit funding/model/device/effort grant, conservative credit ceiling and current selected confirmed context. Analyze, gather, compare and draft through existing features; do not force no-fit issues or publish automatically. A verified personal-subject repository override may support twenty repositories while normal commercial limits remain unchanged. GPT-6.1 is offered only by a supported safely executing adapter that actually advertises it. Official Codex model/list access alone does not enable the separate paired Responses route. [ADR 057](adr/057-continuous-reviewed-improvements.md) permits an explicitly bounded reviewed routine cycle only after its production acceptance; all protected work and deployment provisioning retain separate approval.

## October 6: personal subscription library imports

[ADR 063](adr/063-personal-local-library-imports.md) extends the allowlisted operator's isolated own-account session to the explicitly approved four-hour saved-library run. Local preparation/offline transcription and official-client GPT-6.1 Sol Medium outputs may enter canonical private sources, topic summaries and current-code repository evaluations after independent validation. No paid fallback, subscription pooling, reset-credit use or automatic issue publication is authorized. Current source/rights/membership/version fences, corrections, exclusions, deletion and exact external review remain mandatory.

## October 6: useful topic discovery

[ADR 065](adr/065-populated-topic-ordering.md) orders the default paginated workspace library by owner pins and included insight count. Empty and legacy topics remain accessible; inferred volume is not evidence quality. Search, filtering, access, corrections and processing limits remain unchanged.

## October 6: confirmed project evidence

[ADR 066](adr/066-confirmed-project-evidence.md) prioritizes safe current implementation paths named in confirmed context during personal knowledge evaluation. The immutable manifest, current authorization and all inspection limits remain enforced. A new local inspection key preserves earlier incomplete-context results without reusing them as corrected evidence.

## October 6: recovered caption evidence

[ADR 064](adr/064-local-caption-evidence.md) corrects a real omitted-caption input path. Reuse the bounded pinned acquisition manifest for personal source imports, cite recovered captions, preserve titles/corrections, and clear temporary metadata under existing privacy boundaries. Source-only metadata or truncated titles cannot establish missing media claims.

## October 6: insight-first repository retrieval

[ADR 067](adr/067-insight-first-knowledge-retrieval.md) preserves saved-idea terms before a detailed confirmed profile fills bounded file/window ranking. Personal and managed evaluations share the builder and existing knowledge inspection limits. Historical outcomes remain recorded; actual gaps and useful research proposals require separate current evidence.

## October 6: temporary subscription session cleanup

[ADR 068](adr/068-subscription-session-expiry-cleanup.md) keeps controller cleanup alive after the sign-in client closes and stops the worker and proxy at one fixed approved deadline. The observed expired-container failure remains recorded. No credential retention, expiry extension or paid fallback is authorized.
