# Acceptance tests

Mode: reference. These are tests the implementation must execute. Their presence is not a passing result.

| ID | Requirements | Area | Expected evidence |
| --- | --- | --- | --- |
| AC01 | R01 R24 R33 | Mobile browser | At 320, 360, 390, 412, 768, and 1440 CSS pixels, complete capture, summary review, proposal approval, and PR inspection without page-wide overflow or hidden controls. |
| AC02 | R02 | Public website | All required public and legal routes load, pricing matches the catalogue, demo data is labeled, and unenabled capabilities are not advertised. |
| AC03 | R03 | Authentication | Complete actual staging email-code and Google flows, session refresh, logout, expired session, and recovery. Password login is disabled in the intended provider configuration. |
| AC04 | R04 | Tenant isolation | For every private table and asset endpoint, request another workspace object with a valid account. Expect denial and no identifying payload. |
| AC05 | R05 | Capture | Paste URL, upload owned media, import CSV/JSON, and use supported Android share target. Unsupported browser sharing falls back to paste/upload. |
| AC06 | R05 R30 | Telegram binding | A numeric linked user can submit a source once per update ID. A copied pairing token, foreign user, or replay cannot capture into the workspace. |
| AC07 | R06 | Unavailable source | Private, removed, blocked, and unsupported URLs produce the correct next action. None is labeled fully analyzed from metadata alone. |
| AC08 | R07 | Unsafe media | Malformed, oversize, long, multi-stream, and decompression-heavy media terminates within its resource limits without accessing secrets. |
| AC09 | R08 | Transcription trace | Original transcription remains available after correction. Corrected terms have evidence or an explicit user correction and preserve timing. |
| AC10 | R09 | Visual coverage | Changing code within one static camera shot is sampled. UI indicates sampled coverage and uncertainty rather than claiming exhaustive analysis. |
| AC11 | R10 R35 | Evidence support | Every main point has valid source references or is marked an inference. Fabricated timestamps and missing frame IDs fail validation. |
| AC12 | R11 | Library | Search, tags, filters, pagination, source detail, and export work on real tenant data. Empty library and empty filter result are distinct. |
| AC13 | R12 R28 | Deduplication | Two simultaneous identical workspace imports share committed processing and charge once. Another workspace cannot discover or reuse that private entry. |
| AC14 | R13 | Selected repositories | Only selected installed repos are listed and analyzed. Installation removal stops access and produces a clear reconnect state. |
| AC15 | R14 | Business profile | A user can correct audience, goals, non-goals, and constraints. Changing the profile invalidates affected matches. |
| AC16 | R15 | Repository snapshot | Snapshot stores SHA and exclusions. Secrets, build output, hooks, submodules, and escaping symlinks do not execute or leak into context. |
| AC17 | R16 | Abstention | Known no-fit, already-implemented, unsupported, and needs-context cases return those outcomes rather than filler proposals. |
| AC18 | R17 | Proposal details | A real proposal identifies the project problem, source/repo evidence, proposed change, metric hypothesis, risks, and reason to reject. |
| AC19 | R18 | Plan versioning | Edit and export a plan. Existing-file references are real; new files are labeled. An edited hash invalidates old execution approval. |
| AC20 | R19 | Approval scope | Change base SHA, repo ID, executor, model route, permitted paths, or cost ceiling after approval. Execution must require renewed approval. |
| AC21 | R20 | Pairing security | Expired/reused codes, mismatched device fingerprints, removed membership, and revoked devices cannot claim jobs. |
| AC22 | R20 | Local worktree | Run against a repo with unrelated uncommitted work. The approved isolated snapshot is used and unrelated changes remain untouched. |
| AC23 | R20 | Local isolation | Malicious tests cannot read home credentials, modify other repos, reach blocked services, or disable the sandbox. Missing isolation blocks execution. |
| AC24 | R20 R26 | Official Codex auth | Use the supported local app-server route without exposing OAuth credentials or injecting into an unverified desktop conversation. |
| AC25 | R21 | Browser-only cloud path | Without installing a runner, a user approves a funded cloud task and receives its real patch and test report. |
| AC26 | R21 R28 | Cloud spending stop | A looping agent or build terminates at approved token/runtime limits. Cancellation and teardown costs stay within measured reserved exposure. |
| AC27 | R22 | Trusted publication | A sandbox cannot publish directly. The backend rejects forbidden paths and creates one draft PR only after the required review. |
| AC28 | R22 | Idempotent PR | Simulate failure after GitHub creates a PR but before backend completion. Retry reconciles the existing PR instead of opening another. |
| AC29 | R23 R24 | PR states | Fixtures and staging events cover draft, ready/open, merged, closed-unmerged, reopened, and access lost. Only verified mergedAt creates a merge badge. |
| AC30 | R23 | Webhook order | Deliver duplicate and reordered close/merge events, then reconcile. The final state matches GitHub rather than event arrival order. |
| AC31 | R24 R25 | Many-to-many outcomes | One source with several ideas and mixed PR results displays correct unique counts. A manual implementation does not create a fictitious PR. |
| AC32 | R25 | Feedback semantics | Acceptance and merge leave benefit unmeasured. Ignored cards do not become rejections. Reversion preserves historical merge evidence. |
| AC33 | R26 | Funding disclosure | An expired ChatGPT allowance or offline runner pauses the task. It never selects the managed API or another key without permission. |
| AC34 | R26 R36 | Secret lifecycle | BYO key create/test/rotate/revoke works. No key appears in local storage, logs, exports, model prompts, support messages, or source. |
| AC35 | R27 | Recurring billing | Test all six prices, period anchors, weekly renewal, annual monthly credit grants, proration, downgrade, and cancel-at-end. No duplicate credits. |
| AC36 | R27 | Payment authority | Unsigned, wrong-account, wrong-mode, replayed, and stale Stripe events cannot grant or revive access. Checkout return alone grants nothing. |
| AC37 | R27 R32 | Consumer flow | Checkout shows payable total and interval. Cancellation is direct. First 14-day refund handling includes eligible weekly renewals and preserves statutory rights. |
| AC38 | R28 | Atomic budgets | Concurrent quote reservations and retries never produce a negative available balance or settle the same reservation twice. |
| AC39 | R28 | Cost reconciliation | Measured provider tokens, runtime, FX policy, and credit settlement reconcile. Failure does not silently bill unapproved extra attempts. |
| AC40 | R29 | Deletion | Delete source/workspace/account. Access ends immediately, private content and search entries expire on schedule, and billing exceptions are separate. |
| AC41 | R29 R31 | Restore deletion | Restore a backup in isolation and apply tombstones. Deleted source content must not become readable again. |
| AC42 | R30 | Notification privacy | Default notifications omit sensitive source/repo details. Disabling a channel stops future sends without losing in-app events. |
| AC43 | R31 | Outage recovery | Simulate provider outage, offline laptop, sandbox crash, expired lease, and late result. Jobs resume or fail safely without duplicate effects. |
| AC44 | R31 | Deployment profiles | Complete authenticated staging flow on the selected host. Build and document Vercel compatibility even when budget hosting is selected. |
| AC45 | R32 | Tax evidence gate | pending_evidence blocks live checkout. Ordinary registration, special registration, exemption, destination tax, invalid VAT ID, and country-disabled fixtures behave distinctly. |
| AC46 | R32 | Invoice compliance | An applicable invoice produces the required task and reviewed deadline. Only a submission receipt marks it complete. Credit notes preserve the source link. |
| AC47 | R32 | Policy consistency | Published terms, privacy, retention, provider list, and consent inventory match actual behavior. No template placeholder or unverified certification remains. |
| AC48 | R33 | Accessible controls | Keyboard, focus, dialog, screen-reader status, contrast, reduced-motion, and touch-target checks pass for the primary journeys. |
| AC49 | R34 | Real versus mocked evidence | Release record names the environment and test command. No mocked provider path is counted as a live integration. |
| AC50 | R35 | Prompt injection | Malicious video text, transcript, README, and issue requests cannot change tool policy, expose credentials, or trigger unapproved writes. |
| AC51 | R35 | Public evidence | A private source used in a public repo does not expose transcript/images in a PR without separate publication permission. |
| AC52 | R36 | Disconnection | Provider revoke cancels applicable pending work and deletes credentials while preserving the app account and accurate historical records. |
| AC53 | R07 R10 R16 R34 | Benchmark | Run the rights-cleared clip/repo evaluation, publish counts and limitations, and calibrate quotes against real provider bills. |
| AC54 | R01 R29 | PWA privacy | Sign out, switch workspace, and reopen offline on a shared device. No previous private content is served from a shared cache. |
| AC55 | R31 | Operational kill switches | Disable capture, inference, local dispatch, cloud execution, and publication separately. Read-only library access remains available when safe. |
| AC56 | R28 R34 | Margin stress | Run the financial tests and full-use annual/high-cost scenarios. A structurally unattainable margin is reported, not hidden with more users. |

## Evidence format

Record test ID, code commit, environment, fixture/source rights, command or manual steps, expected result, observed result, artifact link, timestamp, and reviewer. Use `passed`, `failed`, `skipped`, or `blocked_external`.

Automated component tests, browser emulation, real-device checks, and production smoke tests are separate evidence classes. A successful build does not satisfy a real payment, real model, or real GitHub test.

## Test data

Use `fixtures/dashboard.json` for deterministic UI tests and `fixtures/runner-job.json` for contract tests. These fixtures are synthetic. Real media benchmarks require a rights manifest. Never seed a public demo with private customer videos or repositories.

## Launch stop conditions

Any failed critical permission, tenant, secret, billing, execution-isolation, deletion, or budget test blocks paid launch. Functional failures in required journeys also block a complete V1 release. A local-only preview must be labeled and cannot claim the cloud acceptance test passed.
