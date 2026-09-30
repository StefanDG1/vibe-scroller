# Implementation status

Release label: Development. No production or legal approval is claimed.

Foundation: CompanyNerve commit `74642451d605dcad43546ddf651097960615810e`, exported with its official `scripts/export-template.mjs`. The upstream working-tree status addition was read and left unchanged.

Original lockfile SHA-256: `BE6C21CEA25342F979FBCCB2C1AAD7F4A9FEC49E8583610964143E994CD58468`. The selected stack remains in place. Convex was updated to compatible 1.46.0. E2B 2.51.0, the rate limiter 0.4.0, Resend 0.2.8 and convex-helpers 0.1.124 were added with pinned versions. Upstream notices and skill snapshots are preserved. The complete supplied package is retained under `handoff/`.

Repository: https://github.com/StefanDG1/vibe-scroller

## Work packages

| Package   | State                                   | Evidence                                                                                                                                                                                                           |
| --------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| WP01      | implemented, final checks pending       | Export committed before implementation; frozen install passed                                                                                                                                                      |
| WP02      | implemented, browser acceptance pending | Labeled synthetic demo, responsive website and private app shell                                                                                                                                                   |
| WP03-WP17 | in_progress                             | Real tenant functions, source lifecycle, strict contracts, repository snapshots, approval fences, execution adapters, credit pools, deletion and webhook reconciliation implemented; acceptance remains incomplete |
| WP18      | blocked_external                        | Tax record, provider setup, legal publication and production authorization absent                                                                                                                                  |

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

## Current activation gates

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
