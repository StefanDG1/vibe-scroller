# Dashboard and mobile interface

Mode: reference. This document defines the V1 interface, not a static mockup.

## Product structure

The application lives under `/app`. The desktop shell has a left navigation rail and a compact workspace header. Mobile uses a bottom bar with Home, Library, Projects, and Inbox. A visible Add button opens capture. Account, billing, connections, and runner settings sit in the profile menu.

The product is fully usable in a browser. PWA installation adds supported share-target and notification behavior but never unlocks required functionality. No screen asks users to install a desktop client just to read a summary or approve a plan.

## Routes

| Route                        | Screen                              | Primary task                                                      |
| ---------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| `/app`                       | Home dashboard                      | Find the next useful action and see recent outcomes               |
| `/app/library`               | Saved library                       | Find videos, read summaries, and filter by usefulness or PR state |
| `/app/library/:sourceId`     | Video detail                        | Inspect main points, evidence, and project applications           |
| `/app/projects`              | Project list                        | Choose active repositories and identify missing context           |
| `/app/projects/:projectId`   | Project detail                      | Review profile, relevant insights, proposals, and shipped work    |
| `/app/proposals/:proposalId` | Proposal detail                     | Decide whether the change is worth planning                       |
| `/app/plans/:planId`         | Plan editor                         | Review scope, files, tests, risks, and execution budget           |
| `/app/runs/:runId`           | Run detail                          | Follow progress, approvals, checks, patch, and PR                 |
| `/app/inbox`                 | Notifications and pending decisions | Respond without losing the source context                         |
| `/app/usage`                 | Usage                               | Understand allowances, reservations, actual charges, and renewal  |
| `/app/settings/connections`  | Connections                         | Connect, verify, reconnect, or revoke GitHub, AI, and Telegram    |
| `/app/settings/runners`      | Paired computers                    | Pair devices, map repos, inspect capabilities, revoke access      |
| `/app/settings/privacy`      | Privacy                             | Export, retention, analytics choices, and deletion                |
| `/app/settings/billing`      | Billing                             | Plan interval, tax details, invoices, cancellation, and refunds   |

## Home dashboard

The first section says what needs attention. It does not open with a decorative wall of charts. Examples are "2 proposals to review", "Laptop offline: 1 approved job waiting", and "One upload needs a video file".

Below it, show four compact statistics for the selected time window: sources processed, proposals accepted, unique PRs merged, and outcomes measured. Each has a definition tooltip and links to its filtered records. A zero state says "No merged PRs yet", not "0% productivity".

The main list contains recent sources. Each card shows the source title, platform, duration if known, capture date, a short summary, and its highest-priority next action. It previews at most three main points and the project fit summary.

A secondary section shows recent merged changes with repository, PR title, merge date, source count, and benefit status. Another section shows processing and execution queues. Users can collapse queue details, but errors must remain visible.

All counts use the definitions in [Feedback and evaluation](FEEDBACK-AND-EVALUATION.md). Global filters must not silently change denominators in unrelated cards.

## Library cards

Each source card includes:

| Element       | Required content                                                   |
| ------------- | ------------------------------------------------------------------ |
| Identity      | Title, platform, original source link, creator if available        |
| Content       | One-sentence summary and main-point preview                        |
| Evidence      | Coverage label and uncertainty indicator                           |
| Organization  | User tags, AI categories, original collection where known          |
| Applicability | Relevant projects and reason preview, or an explicit no-fit result |
| Progress      | Proposal, plan, and PR counts derived from linked records          |
| Action        | Open details, review proposal, fix import, or retry with a quote   |

Use a generated neutral placeholder when a thumbnail is missing or unauthorized. Do not hotlink arbitrary creator images that leak customer IP addresses. Do not autoplay a video in a list.

Examples below are synthetic fixture content and must remain labeled in the demo:

- "Show the first useful result before setup". Summary: "The creator demonstrates an onboarding flow that starts with a populated example." Fit: "Relevant to Demo Planner: its first screen is empty." PRs: "1 merged, 1 open". Benefit: "Not measured".
- "Replace every database with a spreadsheet". Summary: "The creator argues for spreadsheet storage without discussing access control." Fit: "Not recommended for Demo Workspace: the proposal conflicts with its isolation requirements." PRs: none.
- "A faster image upload pattern". Fit: "Already implemented in Demo Gallery at the analyzed commit." Action: archive or keep for reference.

A source with three ideas and one merged PR must not get a badge that implies all ideas were implemented. Display "1 merged PR" and let users inspect the remaining ideas.

## Filters and search

Search covers titles, summaries, main points, transcripts, tags, and linked project names within the workspace. A result explains which field matched. The first version combines keyword search with optional semantic retrieval. Search ranking never crosses workspaces.

Filters include platform, date captured, original save date where known, category, custom tag, collection, processing status, evidence coverage, project, relevance, proposal review status, PR state, and benefit status. Include "No useful match", "Already implemented", "Needs review", and "Merged PR linked".

Keep search and filters in the URL so a user can return to a view. Do not put private transcript text in the URL. Provide a Reset filters action and a clear distinction between an empty library and no matching results.

Mobile filters open a sheet. Applying filters closes it and announces the result count to assistive technology. Desktop can show the same controls in a row.

## Video detail

The top section contains identity, original link, processing coverage, and a short editable summary. The raw video is optional. If it has expired, say "Original media deleted under your retention setting" and keep usable evidence that remains authorized.

The Main points section contains separate insight cards. Each includes the claim, explanation, timestamp references, uncertainty, and any verification note. A user can expand the transcript around a timestamp and inspect the selected frame. Corrected transcription is visually distinguished from the original.

The Applies to section groups matches by project. Each group explains why the idea fits, what the repository currently does, the proposed change, expected benefit as a hypothesis, risk, and its current review state. No-fit groups remain accessible but collapsed by default.

The Work section shows a trace from insight to proposal, plan, run, and PR. The trace is a vertical timeline on mobile, not a horizontally scrolling graph. It records who approved a change and what version the agent used.

The Activity section shows import, processing, decisions, executions, merges, reverts, and outcome notes. Timestamps use the user's timezone with UTC available in details.

## Proposal and plan screens

The proposal page answers these questions in this order: What is suggested? Why this project? What source supports it? What would improve? What could go wrong? What happens next?

Actions are Reject, Defer, Edit, and Generate plan. Reject opens a small optional reason form with useful categories, not a compulsory essay. A dismissed notification is not a rejection.

The plan editor has structured sections for scope, non-goals, affected files, dependencies, implementation steps, tests, rollout, rollback, and unknowns. A diff shows edits between versions. The Generate plan button shows the credit quote before spending.

Execution approval displays the exact repository, branch/base commit, plan version, executor, provider route, cost ceiling, maximum runtime, permitted paths, and sensitive operations. Changing any of these after approval requires renewed authorization.

Cloud execution is selected explicitly. The UI never presents an API-funded run as "included in ChatGPT". A user's own API key still incurs the provider's charges and any separately disclosed platform execution charge.

## Run and PR detail

Show queued, waiting for laptop, preparing, running, checking, awaiting review, publishing, and completed states. Include elapsed time, last heartbeat, estimated and settled credits, and a Cancel action. Avoid fabricated percentage progress when the remaining work is unknown.

The log viewer shows redacted events. It never exposes credentials, hidden provider reasoning, or unrelated filesystem content. The final view has a changed-file list, readable diff, test results, limitations, and the PR link.

GitHub is authoritative for merge state. Show "Last checked" and a refresh control when updates are delayed. Loss of repository access produces "Status unavailable", not "Closed".

A merged PR offers Record outcome. The form asks what changed, whether the expected metric was observed, the measurement window, and supporting evidence. It does not preselect positive results.

## Mobile behavior

At 320, 360, 390, and 412 CSS pixels, all content must fit without page-wide horizontal overflow. Code and diffs may scroll inside a labeled region. Tables convert to cards or allow contained scrolling with a clear caption.

Use touch targets at least 44 by 44 CSS pixels. Keep primary controls above the keyboard and device safe areas. Sticky controls cannot cover the last content or the bottom navigation. Destructive actions require a separate confirmation and must remain keyboard accessible.

Avoid hover-only explanations. Use expandable sections and readable line lengths. Present primary actions in the thumb-accessible part of the screen. Keep the source identity visible when scrolling a long proposal, without taking most of the viewport.

The OnePlus 13 Chrome browser is a required real-device test when available. Browser emulation is a separate test and cannot be described as a real-device result. Also test desktop Chromium, Firefox, Safari, and an iOS browser for fallback usability. An iPhone is not required for the founder to operate the product.

## PWA and offline handling

Cache the public shell and static assets. Do not cache authenticated API responses or private images in a shared service-worker cache. Clear account-specific local state at sign-out and workspace switch.

Offline capture can save a local unsubmitted URL draft after explicit permission. It must show "Not sent". Retry after reconnection with the same idempotency key and user confirmation when account identity changed. Do not rely on background sync being available in every browser.

Push, email, and Telegram notifications are opt-in. Ask for browser notification permission after explaining its benefit and in response to a user gesture. Default notifications say "A proposal is ready" rather than exposing private repository names or video text on a lock screen.

## Accessibility and performance budgets

Target WCAG 2.2 AA behavior and document the actual tests. Use visible focus, logical heading order, accessible dialogs, form labels, error summaries, sufficient contrast, reduced-motion support, and non-color status indicators. Do not claim certification without an audit.

Initial budgets are measured targets: public-page LCP at or below 2.5 seconds, INP at or below 200 milliseconds, and CLS at or below 0.1 at the 75th percentile when enough field data exists. Before field data, record lab conditions rather than presenting lab results as user measurements.

Paginate library results in batches of 30. Lazy-load transcripts, frame galleries, diffs, and charts. Load only the selected item's private asset grants. Keep the authenticated initial JavaScript budget under 250 KB compressed where feasible, and record exceptions instead of silently increasing the budget.

## Connected knowledge and reviewed issues

The library keeps existing posts/collections and adds topic cards, batch explanations, original private evidence, persistent correction controls and related-project evaluations. Projects use searchable/paginated repository checkboxes and AI-first editable context. Issues offer exact Markdown preview/export, explicit visibility/rights review and a separate Publish reviewed issue action. Coverage and funding states remain explicit. Engineering/browser acceptance is recorded separately from physical Android and independent comprehension in [the execution ledger](V1-KNOWLEDGE-EXECUTION.md).
