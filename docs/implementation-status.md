# Implementation status

Release label: Development. No production or legal approval is claimed.

Foundation: CompanyNerve commit `74642451d605dcad43546ddf651097960615810e`, exported with its official `scripts/export-template.mjs`. The upstream working-tree status addition was read and left unchanged.

Original lockfile SHA-256: `BE6C21CEA25342F979FBCCB2C1AAD7F4A9FEC49E8583610964143E994CD58468`. The selected stack remains in place. Convex was updated to compatible 1.46.0. E2B 2.51.0, the rate limiter 0.4.0, Resend 0.2.8 and convex-helpers 0.1.124 were added with pinned versions. Upstream notices and skill snapshots are preserved. The complete supplied package is retained under `handoff/`.

Repository: https://github.com/StefanDG1/vibe-scroller

## Work packages

| Package | State            | Evidence                                                                                                              |
| ------- | ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| WP01    | verified_staging | Export preserved; frozen install, CI, builds and secret scanning passed                                               |
| WP02    | in_progress      | 60 hosted responsive view checks passed; full accessibility acceptance remains                                        |
| WP03    | in_progress      | Real hosted WorkOS login; tenant tests; recovery/logout acceptance incomplete                                         |
| WP04    | in_progress      | Real owned uploads and import manifest; physical Android share test pending                                           |
| WP05    | in_progress      | Atomic reservations, stage commits and workflows; interruption/cost reconciliation pending                            |
| WP06    | blocked_external | Real isolated decode and transcription; vision license and usage verification pending                                 |
| WP07    | in_progress      | Search, pagination, export, retention and deletion implemented; full browser/deletion evidence pending                |
| WP08    | in_progress      | Selected GitHub App, nested exclusions, hash reuse and Repomix tree; real profile draft passed; quality benchmark pending     |
| WP09    | in_progress      | Semantic selection returned honest no-fit; reviewed AI draft plan implemented; live matching limited by free allowance                                 |
| WP10    | in_progress      | Real free managed route; revision-bound customer-key broker implemented; funded customer request not tested                               |
| WP11    | blocked_external | Pairing/lease/result code and vault test; actual native isolation failed                                              |
| WP12    | in_progress      | Real isolated metered cloud coding produced a reviewed patch; cost calibration and outage cases remain                |
| WP13    | in_progress      | Real draft PR 3 and automatic reopen/closure; merge/revert/access-loss staging remains                                |
| WP14    | in_progress      | Private inbox and generic email integration; hosted email opt-in test pending; Telegram deferred by user              |
| WP15    | in_progress      | Real six-price sandbox lifecycle and two-payment invoice refunds; ledger tests passed; complete app invoice reconciliation pending |
| WP16    | in_progress      | Deletion markers, locked recovery, offline encrypted restore and runtime key rotation passed; hosted restore and tenant matrix remain         |
| WP17    | in_progress      | 85 tests and both builds; benchmark, physical devices and final artifact review incomplete                            |
| WP18    | blocked_external | Official company/tax evidence, legal publication and production verification remain                                   |

## Evidence

2026-09-30, Windows, Node 24, pnpm 12.3.4: `pnpm install --frozen-lockfile` passed without production credentials. Initial preservation commit `bf362dc`.

Provider sign-in pages opened before implementation. GitHub CLI is authenticated. Browser sessions alone do not prove VibeScroller-specific registration or scopes.

## Development verification, working tree after bf362dc

- 2026-09-30 01:28 Europe/Berlin: starter production build passed before subsequent integration changes. A final build is still required.
- 2026-09-30 01:31: `node scripts/validate.mjs` passed, 67 documents and 12 skills. This checks foundation documentation, not production readiness.
- 2026-09-30 02:07: `pnpm test` passed, 42 main tests and 10 authentication tests. Later security changes require another relevant test run.
- 2026-09-30 02:16: `pnpm typecheck` passed before the later GitHub OAuth and upload completion changes.
- 2026-09-30 02:35: `pnpm exec convex dev --once` passed against dedicated development deployment `resolute-ladybug-999`, including rate-limiter and Resend components, internal upload completion, deletion receipts and workspace-bound GitHub OAuth links.
- WorkOS staging login completed by the operator at localhost:3001/app. This verifies sign-in, not all tenancy workflows.
- Official Codex 0.142.3 app-server protocol generated; read-only initialize, account and model discovery passed. Actual isolated coding execution has not passed.
- Convex AI Gateway discovery returned available models. Liquid free generation returned no usable text; the reasoning override was rejected; a Qwen free probe returned HTTP 429. None is an analysis acceptance pass. No OpenAI API key was created.
- Dedicated GitHub App registered with Contents and Pull requests write, Metadata read, and a pull-request webhook. New product-only credentials configured in staging. Installation scope and real PR lifecycle testing are still pending.
- Vercel CLI authentication passed. Cloudflare browser consent completed, but its local Wrangler callback failed; CLI authentication and resource creation remain unverified.

## Historical activation gates at initial implementation

Live checkout remains disabled. Official Exponential Education company details, actual VAT evidence, applicable registrations, reviewed publication details and invoice submission setup are absent. Legal draft rendering is not legal review.

The cloud media/coding worker requires a verified image and an actual isolated execution test. The laptop runner requires completed pairing, polling, native isolation and credential-vault tests. Neither is enabled by a worktree alone.

Private inference requires a usable free model with verified data terms and structured output. Signed-in provider sessions do not supply inference rights. R2, transactional email delivery, Stripe sandbox lifecycle and draft PR lifecycle tests remain incomplete. No purchases are authorized.

## Later staging evidence

- 2026-09-30 02:39: GitHub App installation `166336578` was verified in the browser with only `StefanDG1/vibe-scroller` selected. Workspace-bound OAuth completed. The repository appeared in authorized choices and an actual snapshot was saved after verification. This is not PR lifecycle evidence.
- 2026-09-30 02:49: `pnpm test` passed, 47 main tests and 10 authentication tests. New tests cover account-wide trial limits, concurrent reservation and idempotent settlement, foreign installation denial, OAuth state replay, fabricated visual evidence and durable cleanup after workspace purge. Earlier test setup failures were corrected: capture keys must meet their length bound, and identical test notes correctly deduplicate, so the three-source cap test now uses distinct notes.
- 2026-09-30 02:51: Cloudflare Workers Free was verified in the provider UI. A synthetic Llama 3.3 structured JSON probe passed, with measured neurons. A dedicated Workers AI scoped staging credential was configured. ADR 003 records the explicit route, free allowance and production privacy gates.
- 2026-09-30 02:59: `pnpm typecheck` passed after the V1 billing screen, source attachment flow and inference adapter changes.
- 2026-09-30 approximately 03:01: `pnpm --filter @companynerve/starter build` passed with all listed product and API routes. Later changes require a final build.
- A labeled synthetic staging note completed the actual authenticated capture and Cloudflare summary path with zero billed service credits. It returned no insights, so this is a partial integration result, not a main-points acceptance pass. Extraction prompting is being corrected before another quality check.
- 2026-09-30 approximately 03:03: formatting completed for current Convex, provider, contract and product interaction code. Full final formatting remains pending.
- A new E2B product staging key was created in the existing empty personal project. Free-credit availability, image build and actual sandbox isolation remain unverified. No purchase or workspace upgrade occurred.

## Isolation and media evidence, 2026-09-30

All commands in this section ran in the working tree after `bf362dc`, on Windows with dedicated staging credentials. Synthetic tests contain no customer media.

- Initial E2B isolation failed: untrusted processes could use sudo and reach Firecracker metadata. The provider egress proxy accepted TCP before blocking external traffic. An attempted iptables owner rule failed because the kernel extension was unavailable.
- Added a trusted setup boundary that removes setuid/setgid permissions and file capabilities and uses nftables socket-user rules to deny non-root IPv4/IPv6 egress. Setup failure kills the sandbox and blocks execution. The same boundary is now required by media and coding adapters.
- `node --env-file=.env.local scripts/e2b-isolation-test.mjs` passed at 01:20:53 UTC. Seven checks and cross-sandbox canary denial passed. Image/build identifiers and versions are recorded in `infra/e2b-build.json`. This is staging isolation evidence, not a security audit or production activation.
- `node --env-file=.env.local scripts/e2b-media-test.mjs` passed at 01:25:39 UTC. Eight-second synthetic video and audio produced a bounded timestamped manifest; malformed input was rejected; sandbox kill was acknowledged. The first generator attempt lacked an explicit output format and failed before decoding. Provider transcription/vision and private object storage remain untested.
- Root `python scripts/validate_package.py` now invokes the preserved handoff validator. It passed all 51 Markdown, finance and contract checks. The previous root-scoped copy incorrectly scanned application dependencies and failed; that failure was not an application test result.
- `pnpm typecheck` passed after sandbox hardening and mobile navigation/focus changes. Full test/build/browser checks remain pending.
- The existing E2B account's Hobby Free plan and $100 promotional usage allowance were confirmed in the provider UI. No purchase or upgrade occurred.

## Browser and integration follow-up, 2026-09-30

- Implementation checkpoint `436fa39317c40eff43a89339bb03c24b80e27b41` was pushed to `StefanDG1/vibe-scroller`. `gitleaks git --redact --no-banner --log-opts="bf362dc..HEAD"` passed with zero findings before that push. Later changes are not yet in that checkpoint.
- `pnpm test` at approximately 03:54 Europe/Berlin passed 50 main tests and 10 authentication tests. The separately enabled live-provider test is skipped by default. Added pagination, tenant-scoped search, retained upload bytes and fresh authentication/one-use device approval tests passed.
- The explicit staging command `$env:VIBE_STAGING_TEST='cloudflare'; node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/inference.staging.test.ts` passed. This test uses a synthetic note and the selected free provider. It does not establish production data terms.
- The actual authenticated note integration returned three main points with `caption_only` coverage after generation identifiers and evidence references were bound to trusted acquisition. Earlier attempts failed server evidence validation and were displayed as failures. No evidence validation was weakened.
- The updated library uses cursor pagination and a tenant-filtered search index. `pnpm exec convex run product:backfillSearch '{}'` completed on the dedicated staging project. Page counts are explicitly partial while more records remain. Retained storage reservations and connected repository caps are enforced server-side.
- Browser demo layout measurements at 320, 390 and 1440 pixels passed with no horizontal page overflow and a visible synthetic label. `infra/browser-layout-evidence.json` records the measurements. This is not a complete accessibility or all-screen acceptance pass.
- A browser automation failure came from hidden-page lifecycle throttling after the operator left. CDP focus emulation restored browser rendering without another login. Earlier requestAnimationFrame timeouts were not application acceptance results.
- A new Resend key has sending-only access scoped to `exponentialeducation.ro`. A dedicated signed webhook listens to seven delivery events. The direct synthetic request to Resend's official simulator was accepted. The delivery component then queued a separate synthetic email; the provider UI reported successful sent/delivered webhook handling. Exact component status is being verified. Customer email activation remains disabled pending host and end-to-end settings.
- Fresh authentication is required for sensitive device pairing. The legacy foundation checkout entry point is disabled; V1 billing uses its allowance catalogue. Live checkout stays disabled.

## Staging checkpoint at 2026-09-30 02:27 UTC

The real GitHub-bound repository snapshot and source analysis produced a grounded `no_fit` proposal for the labeled synthetic staging note. The browser displays this classification. This is not a positive coding or PR test.

Executed checks against the working tree after `436fa393`:

- `pnpm lint`: passed with Oxlint 1.86.0, React, JSX accessibility and Next.js plugins, zero warnings. Typescript ESLint's published peer range did not support the exported TypeScript 7 stack, so it was not installed.
- `pnpm typecheck`: passed for root and both applications.
- `pnpm test`: 51 product/foundation tests and 10 authentication tests passed. One opt-in live inference test skipped in this command.
- `pnpm audit --prod --audit-level high`: no known vulnerabilities reported.
- `pnpm build`: both applications passed. This was a local production build, not a production deployment.
- `python scripts/validate_package.py`: passed all 51 handoff documents, serialized examples and finance invariants.
- `pnpm validate`: passed 69 documents and 12 skill snapshots.
- `pnpm exec convex dev --once --typecheck enable`: staging push passed at 04:25 Europe/Berlin after correcting the Node runtime directive and legal Convex module name.
- Browser at 390px: native capture dialog opened without document overflow; Escape closed it and restored focus to Add source.
- `node --env-file=.env.local scripts/e2b-isolation-test.mjs`: ten checks passed, including trusted loopback and local control service denial, no effective capabilities, metadata and internet denial, and root-file denial. The independent sandbox could not see the canary. Both sandbox cleanup calls acknowledged success. See `infra/e2b-build.json`. This does not establish production security review.
- Dedicated Resend component email reached `delivered` through the signed webhook. See `infra/email-evidence.json`. Customer email remains disabled until hosting and sender publication configuration are complete.

Cloud execution now verifies current GitHub permissions before repository reads and before checks. Its quote must reserve the full 1,200-second compute bound. Runtime billing starts at sandbox creation rather than at the earlier queue update. Generated code cannot connect to any IP endpoint, including the sandbox control service; tests requiring local TCP need a separately reviewed execution profile.

Unresolved release work still includes a real authorized coding run and draft PR, private object storage provisioning and connected upload processing, the full optional laptop runner, Stripe sandbox lifecycle evidence, complete screen/journey verification, and hosted staging deployment. Legal publication and live tax/checkout remain external release gates.

## Real isolated coding and draft PR lifecycle at 2026-09-30 02:50 UTC

Working implementation commits: `88a9815` and `7cc41e8`. The authorized GitHub base was `88a98153381e89d4cda0540675b46a69d0ae5ade`.

A second labeled synthetic source was analyzed by the real free inference route. Matching classified the proposed troubleshooting guide as `already_implemented`, with weak generic evidence. The build agent verified that the proposed document was absent, recorded an explicit reviewer correction to `relevant`, and preserved the original model assessment. Tests now reject unexplained corrections and stale review versions. This is not evidence of a successful automatic positive match.

The exact new-document plan was version 3, hash `3a72d376f15b6f21d8a6f2679b010a16d3ee20a50207ddadc7a3c7c185e06a84`. Its first 25-credit run failed the snapshot bounds and remains reserved pending compute reconciliation. A bounded 4-credit retry, run `ms7627ej3eh541x34psqcxtj6d8fd39j`, completed in the isolated cloud sandbox and passed its approved topic-presence and document-size check. Successful runtime settlement released unused reservation. This narrow documentation check is not full application coverage.

`node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/snapshot.staging.test.ts` with `VIBE_STAGING_TEST=snapshot` passed after the snapshot policy fix. Earlier attempts failed on the 551,475-byte generated protocol schema and binary/credential detection; these failures are retained here. The safe text snapshot permits at most 2,048 files, 1 MB per file and 20 MB total. Unrelated credential-bearing or binary files are excluded and identified in limitations, while an approved file containing such data blocks execution. The successful run explicitly reported three excluded files. No excluded content entered inference.

Trusted publication created **draft PR https://github.com/StefanDG1/vibe-scroller/pull/3**, changing only `docs/source-troubleshooting.md`. The title and review note identify the synthetic staging test. The generated prose required correction and failed `pnpm exec prettier --check outputs/generated-guide.md --ignore-path NUL`; it was never treated as merge-ready. Gitleaks scanned the generated guide and found no leaks. The PR was closed without merging using `gh pr close 3 --repo StefanDG1/vibe-scroller`. The application's authenticated `refreshPR` action then projected `closed_unmerged`. Automatic webhook projection did not update within the observation interval and remains under investigation. This proves real draft creation and the reconciliation fallback, not timely webhook delivery or merge behavior.

Before publication, formatting of implementation files, lint, types, 61 tests and both production builds passed again. Two credential-dependent tests were skipped by the normal test command. GitHub CI on the generated draft failed on uppercase documentation links that Windows had accepted. The links are corrected and the validator now checks exact filename case on Windows too. Generated Python bytecode is removed from tracking and ignored; preserved source and the original handoff archive remain available.

A separate private Cloudflare R2 staging bucket, `vibescroller-staging-private`, was created in the EU jurisdiction using Standard storage. Public access remains disabled. Configuration and private upload integration are still in progress. Existing shared account usage was approximately 318 MB before this bounded free test; no paid plan or purchase was made.

## Real upload and sandbox billing at 2026-09-30 03:48 UTC

Working tree based on `0465123`. GitHub CI run `36661777263` passed on that commit. Later changes below remain subject to another full check and commit.

Private EU R2 storage is configured with a new credential scoped only to `vibescroller-staging-private`. CORS permits the staging browser origin. The opt-in `VIBE_STAGING_TEST=storage` integration passed actual signed PUT/HEAD/GET, unsigned and expired denial, CORS, and deletion with HEAD 404. `infra/storage-evidence.json` records the provider checks. No customer content was used.

The real browser uploaded an owned synthetic speech WAV, then requested analysis. Source `mx74gg25wtcqtvkws3k0m1q9e18fc1a1`, labeled "Synthetic staging: owned speech upload", became `ready` with `audio_only` coverage, a real transcript and four grounded points. The decoder ran in the verified E2B sandbox, acknowledged destruction, and Cloudflare Whisper and structured inference returned real output. No vision license consent was sent. This proves the audio path, not the complete video or visual interpretation path. Private frame evidence is now brokered through an authenticated short-lived URL. Its full browser video test remains pending.

A support adjustment waived the customer service reservation for the first failed synthetic coding run. Its unmeasured operator cost capacity remains held for reconciliation. This was restricted to the dedicated staging workspace; no fictitious provider usage or customer credit purchase was recorded.

A dedicated Stripe sandbox `acct_1ULEK7BINq6evjJt` now contains the six specified subscription prices and two top-up prices. Live checkout remains disabled. A real sandbox Visa payment created an active Pro monthly subscription. Automatic signed webhook delivery granted exactly 600 included credits to the labeled staging workspace. Replaying the real event returned 200 without another grant; an invalid signature returned 400. Provider cancellation at period end preserved active status. `infra/stripe-evidence.json` records these checks. This does not verify the remaining renewal, top-up, proration, refund, invoice or tax lifecycle cases.

Transcript corrections now preserve original text, invalidate old analysis and plan approvals, and cancel unpublished execution tied to stale proposals. Expiring uploads have a scheduled deletion check in addition to the sweeper. Frame registration checks retained storage allowance. The correction test initially failed because its test callback returned a nonserializable Vitest assertion object; the callback was corrected without changing the product boundary.

Latest checks: `pnpm exec vitest run tests/product.test.ts` passed 24 tests; `pnpm typecheck` passed root and both apps; `pnpm lint` passed with zero warnings. Production builds and the entire unit suite need a fresh pass for this working tree.

Still incomplete: the full optional laptop runner, imports, all media paths and retry reuse, accurate proration/refund ledger behavior, all PR lifecycle webhook cases, complete privacy/export and accessibility verification, hosted staging, and production release gates. No legal review or production approval has occurred.

At 03:58 UTC, `pnpm check` passed document validation, zero-warning lint, all type checks, 64 unit/auth tests, and both production builds on Next.js 16.3.6. Three provider integrations were skipped by default. The real browser completed a Stripe sandbox EUR 10 top-up using the official test card and the agent disclosure checkbox; its signed webhook granted 200 purchased credits separately from the included allowance. The private storage and source content tests remain labeled synthetic.

Cloudflare packaging remains unverified. Windows directory-junction packaging got past symlink privileges but failed on native Sharp bundling. The separate Linux workflow is prepared without any provider secrets. The available Vercel Hobby team is not used for commercial deployment. See ADR 005 for the host evaluation and compatible dependency patch.

## Import and host packaging checkpoint at 2026-09-30 04:10 UTC

Commit `8a36dc54ea5d70b8b6a19556abb7c00d2f6577bb` passed GitHub CI run `36666804216`. Linux Cloudflare packaging run `36666804764` also passed, including Wrangler dry-run. The archive is private and has a two-day retention. Local Windows packaging failures remain recorded above; production hosting is not established by these results.

Artifact scanning found 54 candidates in generated Next.js manifests and bundled dependencies. A separate byte comparison found zero occurrences of configured provider secrets in the artifact. Candidate review and runtime checks remain necessary; this is not a clean Gitleaks result for the artifact.

The new CSV/JSON import accepts up to 500 links and 140 KB of strict UTF-8 input. It validates original UTC saved dates, titles and collections, rejects unrelated archive fields, and displays a row manifest. Imported links stay `needs_upload`; saving does not pretend to acquire media or charge analysis credits. Quota-limited rows explicitly say they were not saved. Source quotas now use an atomic active/lifetime counter after initialization for the pre-release workspace.

`pnpm exec vitest run tests/product.test.ts tests/imports.test.ts` passed 27 tests before the additional full-batch test. The subsequent `pnpm exec vitest run tests/product.test.ts` passed 26 product tests, including 500 accepted rows and 500 duplicate rows on replay without a reservation. `pnpm typecheck` and zero-warning lint passed. Convex deployed the import and counter schema at 04:09 UTC. Browser import and updated production builds are still pending.

## Real GitHub webhook and hosted shell at 2026-09-30 04:35 UTC

The original automatic GitHub deliveries returned HTTP 400. The selected App subscribed correctly to pull requests and its endpoint was correct. Diagnosis found the backend signing value was one character longer than the local value. Resetting it through direct Node process arguments restored signature verification. Temporary secret fingerprint diagnostics were removed immediately; signature failures expose only a category.

A real reopen of synthetic draft PR 3 produced HTTP 200 and automatically projected `draft`. Closing it again produced HTTP 200 and automatically projected `closed_unmerged`, without calling manual refresh. `infra/github-webhook-evidence.json` preserves the earlier 400 and current successes. The new delivery handler queues only the matching installation/repository/PR and atomically deduplicates receipts with scheduling. Merge and revert outcomes still need verification. The first deployment attempt rejected a mutation in a Node-only module; moving the transaction into the database module corrected it.

The Cloudflare Worker shell is deployed at `https://vibescroller-staging.danistefangheorghiu.workers.dev`, using the Linux package from `8a36dc5`. The public homepage rendered. Its runtime secrets are configured separately from that artifact. Local rebundling of the Linux archive failed on absolute WASM paths; deployment of the prebundled dry-run output with `no_bundle` succeeded. The upload was 15,154 KiB, gzip 3,295 KiB, startup 27 ms. No paid upgrade was made. Authentication and the latest imported UI are not yet verified on this hosted artifact.

A freshly generated scoped deployment token was exposed in a provider button's accessibility label during inspection. It was rolled before use, and the replacement was extracted without displaying it. It grants Workers Scripts Edit on only the existing operator account. This incident is not omitted from the record. Other production provider credentials were not copied or changed.

The local browser import manifest passed one accepted link, one duplicate, one invalid and one unsupported entry, with zero analysis charges. `pnpm test` passed 68 tests and skipped three staging integrations; the updated starter production build passed.

## Billing, media retry and hosted authentication at 2026-09-30 05:23 UTC

The hosted WorkOS session authenticated successfully and rendered the real synthetic staging workspace. Unauthenticated private requests redirected to WorkOS. R2's upload CORS now includes the HTTPS staging origin. The local production app passed nonce propagation on all 17 scripts, hydrated its private library, and returned private/no-store responses with no unsafe-eval. Hosted verification of this new policy awaits the next package.

Targeted product tests passed 31 cases. New tests cover atomic GitHub delivery deduplication and repository scoping, pagination past 50 completed runs, stale PR observations, quote ownership and expiry, prorated upgrade high-water allowances, cumulative and reordered refunds, invoice-specific reversals, and fingerprint/version-bound media stage reuse. Two test-writing failures returned assertion objects from Convex test callbacks; braces corrected that unsupported return. An evidence comparison also failed because object key order differs after serialization; comparison now binds explicit kind, ID and timing fields. These failures did not bypass validation.

Stripe's dedicated sandbox portal is configured for invoices, payment methods and cancellation. Subscription changes are disabled in the portal and instead use expiring server-issued exact Stripe quotes, separate approval, verified payment and remaining-period incremental credits. Downgrades use a provider schedule at renewal. Live plan changes remain disabled. Full browser and staging plan-change checks are still pending.

A real EUR 5 sandbox refund of the synthetic EUR 10 top-up passed its automatic signed webhook and revoked exactly 100 credits, preserving the original 200-credit grant. See `infra/stripe-evidence.json`. Invoice-backed credit contributions and cumulative reversals preserve audit records; their unit tests cover a refunded upgrade and future annual monthly grants. Multi-payment invoice refunds still need explicit reconciliation validation.

`VIBE_STAGING_TEST=billing node --env-file=.env.local scripts/stripe-lifecycle-staging.mjs` created six paid synthetic subscriptions in the dedicated sandbox. Test clocks advanced weekly/monthly renewals and annual month boundaries. The first observation correctly failed while renewal invoices were still draft; advancing the clocks two hours allowed automatic finalization/payment. Both weekly and monthly tiers then renewed at their catalogue amounts, January 31 monthly anchors clamped to February 28, and annual plans did not invoice monthly. All six were set to cancel at period end. `infra/stripe-renewal-evidence.json` records provider results; this is separate from application allowance tests.

Media stages now bind the object ETag, decoder/model/prompt pipeline version and artifact hash. Only committed, validated timestamped transcript and frame records can be reused within the source's workspace for seven days. A successful summary retry settles the earlier compute hold once and charges only its new summary stage. Failed free-provider requests still retain unknown neuron reservations for operator reconciliation. Corrections invalidate the cache, preserve the original transcript and timing, and reject detected credential formats. Source deletion removes stage data and imported save-date metadata.

GitHub requires fresh human confirmation before editing the dedicated App's hosted OAuth callback. Existing repository access and PR webhooks work; new GitHub linking from this host remains a setup gate until that callback is added. No MFA or confirmation was bypassed.

At 05:25 UTC, `pnpm check` passed validation of 71 documents and 12 skill snapshots, zero-warning lint, all type checks, 73 unit/auth tests, and production builds of both apps. Three credential-dependent staging tests remained explicitly skipped. The earlier check stopped on a string-prefix lint rule in the new sandbox script; using `startsWith` fixed it. Convex deployed the media-stage index and latest backend at 05:25 UTC.

## Access, exports, retention and durable dispatch at 2026-09-30 06:16 UTC

The handoff viewer role now reads workspace data but cannot capture, edit, approve, execute, manage connections or change billing. Membership/invitation validators and team selectors support it. The application explains read-only access. Backend mutation permissions are explicit. Coding claim, worker/watchdog, result and publication paths recheck the original approver's active membership and writable role.

Content exports now stream bounded pages of all nondeleted sources, proposals and feedback. Each page rechecks owner access and excludes storage object keys and signed capabilities. New records after the starting timestamp are excluded; the export is a live read, not a transactional snapshot. A revoked or interrupted export remains incomplete JSON rather than claiming a successful truncated export. Retention now paginates all tombstones, repository snapshots and run diagnostics. Tombstone redaction also binds workspace ownership. Queued expired assets leave the expiry index and remain in the durable deletion outbox.

Workflow 0.4.8 and Workpool 0.4.12 were checked against their official published peers and added to the exported lockfile. Source and cloud coding dispatch start atomically with their authorization/reservation mutations, use two concurrent action steps, and disable automatic external action retries. An interrupted worker records reconciliation and holds unknown usage. ADR 006 records the requested catalogue review and reasons to retain current storage/cache/count adapters.

At 06:11 UTC, Convex installed Workflow, its internal Workpool and batch worker. Through the hosted browser, a labeled owner-written text source was captured and approved for bounded analysis. Source `mx79ca9f0c2cct8d7dhx4p0v198fcpfy` became ready with three uncertain, text-grounded main points. Workflow `jd7bj3j2pf9ca6fq5jy66chawd8fc528` reported success. See `infra/workflow-evidence.json`. The hosted frontend still uses the preceding package until the next deployment.

`pnpm check` passed validation of 72 documents and 12 skill snapshots, zero-warning lint, all type checks, 66 root unit tests plus 10 authentication tests, and both production builds. Three provider staging tests were skipped. `pnpm audit --prod` reported no known vulnerabilities. Targeted product tests passed 34 cases. Earlier test attempts failed on missing source fixture fields, a too-short capture key, timestamp precision, and recursive TypeScript inference; their corrections preserve the failed attempts rather than calling them successful runs.

Actual hosted video upload and isolated transcription also passed before these changes. Vision remained unavailable and the model returned zero useful main points. The source is explicitly audio-only. Source detail now renders the model's limitations and acquisition errors. No synthetic result is presented as customer data. See `infra/hosted-media-evidence.json`.

## Inspected repository evidence and runner foundations at 2026-09-30 06:39 UTC

Repository context now consists of whole-line bounded excerpts with paths, start/end lines and provider blob hashes. Matching receives exactly those excerpts, rather than a sliced string paired with a longer file list. Server validation rejects paths and line ranges outside the supplied excerpts, including reversed ranges. The hosted browser refreshed the selected synthetic repository at `4c6350623af05dc0d81e97898b61b34a28e6cabd`; the backend retained 14 inspected excerpts. Existing snapshots without excerpt metadata must refresh before matching. Raw snapshot retention clears excerpt content with legacy context. Targeted product tests passed 34 cases after adversarial citation assertions.

The Moondream adapter follows the current official Cloudflare query/answer schema, disables hidden reasoning output, caps bytes and tokens, and changes the stage fingerprint with model selection. It remains disabled without exact operator license acceptance and verified free-unit quote. Two unit cases passed. A license decision has been requested. No Moondream request, automatic acceptance or production vision success is claimed. ADR 007 documents the gate.

Windows Credential Manager passed an actual random synthetic credential write/read/delete test on this laptop, with no credential printed and no test entry remaining. The runner HTTPS transport passed two unit cases for URL/redirect policy and artifact/response byte limits. Pairing, leases and the isolated execution adapter are still incomplete; these foundations are not reported as a working local coding runner. `infra/runner-vault-evidence.json` records that distinction.

The exact `4c63506` Linux package deployed to the staging Worker as version `802f3ad4-ff73-418f-9690-41d40e32eaa2`, startup 21 ms. Its GitHub CI and packaging passed. Sixty private-screen checks exercised ten views at 320, 360, 390, 412, 768 and 1440 pixels through real navigation. The first pass omitted the mobile More menu; a corrected pass reached every screen. Comparing only scrollWidth to innerWidth missed mobile viewport expansion. Device-width comparison found Runs & PRs overflowing at 320, 360 and 390, caused by unbroken run IDs and diagnostic text. The panel wrapping fix is implemented and awaits a fresh frontend package and browser recheck. No accessibility or security audit is inferred from these layout checks.

Completed Workflow journals now schedule cleanup after one day. Journals contain IDs and generations rather than source or repository content. No interrupted-worker staging test has yet passed.

## Local runner policy and native probes at 2026-09-30 07:15 UTC

The Windows runner now includes vault-backed public pairing, authenticated dispatch, single-worker generation leases, heartbeat cancellation, recovery receipts and a trusted-base patch broker. Synthetic tests cover forbidden paths, mismatched base text, secret rejection, default-denied approvals, termination before upload and lost-heartbeat interruption. These are unit checks, not actual local coding success. The actual vault write/read/delete check passed.

The official Codex 0.142.3 Windows readiness endpoint returned ready. Two actual elevated sandbox probes permitted writing inside the workspace and denied outside writes, synthetic home-canary reads and network access. Both allowed reading a synthetic sibling-repository canary. A dedicated CODEX_HOME permissions profile failed to return probe results. Isolation therefore failed, and local execution remains disabled. No customer secrets were read, no local OAuth session was copied and no permissions were made unrestricted. See infra/windows-readiness-evidence.json and docs/operations/vibescroller-runner.md.

PR publication now inspects the trusted base tree and preserves regular-file executable modes, while rejecting symbolic-link, submodule and directory changes. Complete end-to-end local execution, device certification and a reviewed Windows adapter remain unresolved. Moondream license consent and verified usage pricing remain pending.

At this checkpoint, `pnpm check` passed 75 document checks, 12 skill snapshots, zero-warning lint, all type checks, 75 root tests and 10 auth tests, and both production builds. Three provider integration tests were skipped by default. `pnpm audit --prod` reported no known vulnerabilities. `git diff --check` passed. The full-repository Prettier check failed on 69 existing files, including preserved handoff files. Those originals were not rewritten. Changed-code formatting is checked separately. The native Windows sandbox failures above remain release blockers.

## Hosted checkpoint at 2026-09-30 07:30 UTC

Commit `fffcc5ebd183a9629687a43b36456e96d1a7d046` passed GitHub CI `36683097952` and Linux packaging `36683098131`. Convex deployed at 07:19 UTC. The exact package deployed to Worker version `a49f8786-661b-4dc0-97a8-6e1fff2bea14`, startup 19 ms, upload 15,203.25 KiB and gzip 3,301.96 KiB. Byte comparison across 3,947 artifact files found zero configured credential occurrences; this does not resolve the earlier scanner candidate-provenance review. The staged diff passed Gitleaks.

All 60 private-screen layout/navigation checks passed at requested widths 320, 360, 390, 412, 768 and 1440, comparing document width to the requested width. This verifies the earlier Runs & PRs wrapping fix. `infra/browser-responsive-evidence.json` records each view; it does not claim full journeys or accessibility at every width. WorkOS name is now VibeScroller; Google and email codes remain enabled, while GitHub, Apple and Microsoft sign-in are disabled. Production provider credentials and full recovery/logout acceptance remain separate gates.

The work-package table above now distinguishes remaining implementation from real staging evidence. The paid V1 release is not complete. Internal gaps include Repomix/profile drafting, customer-key execution routing, benchmark quality evaluation, invoice reconciliation and restore tests. External blockers include native Windows isolation, vision consent/pricing, fresh GitHub callback confirmation and official legal/tax evidence. Deployment instructions are in docs/operations/vibescroller-deployment.md. No production or legal approval is asserted.

## Profile drafting and Repomix checkpoint at 2026-09-30 07:43 UTC

The quoted profile-draft action uses only inspected repository excerpts and a strict seven-field schema. It preserves unknowns rather than inventing business facts. A single pending reservation prevents duplicate attempts; SHA/profile-version changes discard late output. Drafting never confirms or replaces the saved profile. Copying or editing text clears its confirmation checkbox. Shared action buttons now use type=button, preventing a connection-revoke action from also submitting a credential form. No customer API key was configured or sent.

Repomix 1.18.1 prepares the actual inspected tree through its public programmatic API. Root Git ignore and Repomix ignore rules are applied independently with ignore 7.0.10. Manifest entries preserve blob hashes, regular-file modes and sizes within a 5,000-file/600-KB metadata ceiling. No checkout, hooks, history commands or customer code run. ADR 008 records the limited context-preparation scope and unfinished semantic retrieval.

The first check stopped on an unused import, which was removed. The next check failed because ignore rules supplied as whole array strings did not split multiline policies, and a test assumed a trailing newline absent from Repomix output. Splitting rules fixed the real exclusion bug; the output assertion now follows actual upstream behavior. The subsequent pnpm check passed 76 documents, 12 skill snapshots, zero-warning lint, types, 78 root tests plus 10 auth tests, and both production builds. Three staging integrations were skipped by default. pnpm audit --prod reported no known vulnerabilities. The final checkbox change requires its targeted frontend check before packaging. Actual hosted AI drafting, updated snapshot refresh and the new frontend remain pending.

## Hosted resource failure and recovery at 2026-09-30 07:53 UTC

The hosted selected-repository action and workspace refresh initially returned Cloudflare HTTP 503 HTML titled Worker exceeded resource limits. The frontend displayed an internal JSON parse error. This is a real hosting failure, not a passed acceptance test. Removing raw snapshot text, excerpts and manifest internals from the dashboard query restored a 37,883-byte HTTP 200 workspace response. A real selected-repository refresh then succeeded at base f299310. Readonly operator metadata inspection verified Repomix version, 748 manifest entries and 14 excerpts; see infra/repository-snapshot-evidence.json. Cold-route and sustained production capacity remain unverified.

The client now reports non-JSON host failures without claiming action success and clears private state on changed authentication/access. The product route reuses its already verified WorkOS session for the backend client instead of reading it twice. These changes do not bypass authorization. The new query test verifies that snapshot internals are absent from dashboard responses. pnpm check passed 88 root/auth tests, document validation, lint, types and both builds on the working tree after f299310. Default staging tests remain explicitly skipped.

## Refunds, customer-key routing and nested exclusions at 2026-09-30

The dedicated Stripe sandbox probe paid one EUR 10 invoice through two EUR 5 PaymentIntents and refunded EUR 2.50 from each. InvoicePayment associations were unambiguous and the aggregate refund was EUR 5. The synthetic customer has no application billing link, so this is provider allocation evidence, not a live application entitlement result. See infra/stripe-multiple-payment-evidence.json. The resumable script initially failed on missing synthetic email, default invoice currency and reuse of an idempotency key after replacing an empty draft. Binding invoice-specific keys to the new invoice corrected the retry path without duplicate payments or emails.

The ledger now aggregates all charge reversals against the verified invoice paid total, rejects changed allocation totals and rounds exact integer credit fractions using BigInt. Targeted product tests include two payments, reordered cumulative refunds, complete reversal, future allowance grants and the 29% of 600-credit rounding case. The preceding pnpm check passed 89 root/auth tests and both builds before customer-key changes.

Customer API-key coding now has fresh owner authentication, free model-list verification, a strict expiring operator model/price registry, separate USD provider and platform-credit budgets, credential-revision binding, trusted broker dispatch and single-use request authorization. Rotation and revocation cancel customer-key runs while preserving managed runs. The sandbox never receives the customer key. Unknown provider usage is retained for reconciliation without automatic retries. No operator OpenAI credential was added; no funded customer-key provider test passed. The registry stays empty until verified provider records exist. See docs/operations/customer-api-keys.md.

A targeted test found that JSON string comparison of model settings incorrectly depended on database field order. Explicit validated field comparisons corrected the bug. pnpm exec vitest run tests/product.test.ts tests/customer-ai.test.ts then passed 43 tests; pnpm typecheck passed root and both apps. Nested Git and Repomix ignores now apply to analysis and cloud coding snapshots, with bounded policy reads and parent-directory exclusions that child negations cannot bypass. Ten targeted repository, publisher and customer-provider tests passed. Zero-warning lint passed at that checkpoint.

A source search incorrectly included an ignored environment file and exposed the staging encryption key and the already rotated dedicated Stripe sandbox key in tool output. The encryption key was replaced with version 2, one connection migrated through compare-and-swap, zero historical ciphertext versions verified, and version 1 removed from local runtime files and Convex. A second Stripe rotation is still unresolved because Chrome requested renewed remote-debugging permission. The owner was notified and further Stripe provider tests stopped. The earlier Stripe rotation does not resolve this later exposure. See infra/credential-search-incident.json. No production credential exposure or completed second Stripe rotation is claimed.

Browser acceptance is currently blocked by renewed Chrome permission. The customer-key route, updated frontend and nested-ignore snapshot require hosted verification. The next full check covers these changes; the work-package table remains in_progress wherever acceptance is incomplete.

The full pnpm check for this checkpoint passed 77 document checks and 12 skill snapshots, zero-warning lint, root/app types, 87 root tests plus 10 authentication tests, and both production builds. Three credential-dependent staging integration tests were skipped by default. The captured command output is outputs/check-20260930-customer-keys.log. This is 97 passed tests, not proof of a funded customer-key request or completed browser acceptance.

## Recovery, retrieval and approval checkpoint at 2026-09-30

Durable account/workspace deletion markers, restore locking, recovery quarantine and source evidence workspace binding are implemented. An actual encrypted offline backup rehearsal validated 179 records across 87 tables, rejected altered authenticated metadata and removed temporary plaintext archives. Two initial rehearsal failures were corrected, including treating Convex table metadata as documents. This did not import into a fresh hosted database or recover R2 objects. See [recovery instructions](operations/backup-recovery.md) and infra/backup-rehearsal-evidence.json.

Semantic repository selection now uses confirmed tenant profiles, permits up to five tentative matches and explicitly records an empty result. Plan drafting uses inspected excerpts and produces an unconfirmed draft; saving a plan and approving execution remain separate actions. Incremental snapshot preparation reuses recent unchanged hash-bound excerpts, records bounded added/changed/removed metadata and keeps a separate snapshot timestamp. Nested exclusions remain independent of model output.

The first actual semantic selection returned zero candidates honestly. The following real profile draft failed with GITHUB_UNAVAILABLE. That failure is retained in infra/planning-staging-evidence.json. Hosted reconnection then exposed a missing GitHub callback allowlist entry; the staging callback was added and the authenticated hosted callback returned github=connected. Further provider verification is pending.

Three targeted planning/retrieval tests passed, including exact approval replay, cancellation on plan edits and retention of a late receipt from already authorized publication. Foreign PR receipts and unapproved publication receipts were rejected. Recovery and snapshot-cache targeted tests passed previously; the next full check determines the new total.

Chrome permission returned and the second exposed Stripe sandbox key was rotated with immediate expiry. The old key returned HTTP 401, the replacement matched the dedicated staging account, and Convex/local runtime configuration was updated without printing it. Both exposed staging keys are now replaced. The search incident and earlier failure remain recorded in infra/credential-search-incident.json. This does not claim a production security review.

The next full `pnpm check` passed 78 document checks and 12 skill snapshots, lint, all TypeScript checks, 93 root tests plus 10 authentication tests, and both production builds. Three staging tests were skipped by default. Output is `outputs/check-20260930-recovery-planning.log`. Dedicated Convex development deployment completed at 13:44 Berlin time. After hosted GitHub reconnection, the actual profile draft passed; subsequent matching stopped at PROVIDER_LIMIT. No paid fallback or fabricated relevant proposal was used.

Commit `9a609467f10372db04bc10a13903c37440add430` passed GitHub CI `36710533262` and Linux packaging `36710533261`. The packaged frontend deployed to Worker version `9ad0b8d3-0c25-43ea-94fa-6a78eb0ff64c`, startup 18 ms. Comparing 3,959 artifact files found zero configured credential occurrences. The staged scanner initially flagged three synthetic request identifiers, which received exact-line test annotations; the final staged scan passed. Historical generated-artifact candidate review remains open.

Authenticated hosted library and source detail loaded on this package. New main-point/project-selection controls were visible in the accessibility tree. The 390-pixel source detail had document width 390 and no resource-limit error. An authenticated route returned HTTP 200 with private, no-store and CSP. No additional inference request was issued during this browser check. This is focused responsive/header verification, not the full mobile or accessibility acceptance suite.

A subsequent synthetic tenant matrix denied 15 foreign-workspace read/write operations and rejected a complete asset pointing across workspace boundaries for both workspace owners. The owned source remained unchanged. `pnpm exec vitest run tests/planning-retrieval.test.ts` passed four tests, including this new matrix, then `pnpm typecheck` and `pnpm lint` passed. This adds one test after the 103-test full checkpoint; a full all-endpoint/table matrix and HTTP evidence-route acceptance are still incomplete. Only tests and documentation changed after deployed commit 9a60946.

## Benchmark evaluator checkpoint at 2026-09-30

`pnpm benchmark private-observations.json outputs/benchmark-report.json` now validates strict rights and observation mappings, separates held-out results, and reports transcription/evidence/matching/abstention counts without assigning perfect scores to empty denominators or zero to unknown costs. Forty clips, category coverage, two annotated repositories and held-out reviews are required for a complete report. It does not run the actual dataset or establish clip rights. See [benchmark instructions](operations/benchmark.md).

`pnpm exec vitest run tests/evaluation.test.ts` passed three synthetic tests, including actual Node command execution and overwrite refusal. Invalid rights, duplicate observations, foreign references and impossible counts are rejected. Types and lint passed for the implementation; document validation now passed 79 documents and 12 skill snapshots. These tests were added after the 103-test full checkpoint and one later tenant test. No new frontend or backend runtime behavior was deployed for this evaluator.

The exact 9a60946 artifact scan still reports 38 generic API candidates and 16 private-key candidates. Representative private-key provenance was traced to the WorkOS SDK PEM interpolation formatter, and generic candidates include generated Next server/preview keys and compiled variable assignments. Configured credential byte comparisons remained zero. This partial source review does not claim all candidates were classified; complete artifact review remains a gate.

The subsequent source review accounts for all 54 scanner candidates in the exact 9a60946 artifact. Sixteen private-key matches are WorkOS PKCS#8 validation header expressions, not serialized private-key data. Generic matches include sixteen generated Next runtime-key occurrences, thirteen WorkOS variable assignments and nine framework expressions. The four generated framework values have zero occurrences in public assets. See infra/artifact-review-9a60946.json. This resolves candidate provenance for this package only, not a full security audit or future artifact review.
