# Operate the Vercel sandbox workers

Mode: how-to. Date: October 2, 2026. Follow [ADR 023](../adr/023-vercel-isolated-execution.md). Full paid execution acceptance remains open.

## Build clean tool snapshots

From the repository root, obtain a dedicated project's local short-lived OIDC token using the authenticated Vercel CLI environment pull into an ignored private file. Set VERCEL_SANDBOX_TEAM_ID and VERCEL_SANDBOX_PROJECT_ID to that project only. Never print or commit the pulled token. Run node with that private env file and scripts/vercel-sandbox-build.mjs media, then coding. The script checks the pinned universal image digest and downloader hash, pins pnpm 12.3.4 for coding, disables persistence and closes/deletes the build VM. Output `private/vercel-{kind}-{projectId}-build.json` starts unverified and records its project, team and actual snapshot expiry. Check those identifiers against the intended deployment before setting either snapshot environment variable. Staging builds cannot overwrite production build records. Snapshots contain tools only and expire in seven days. Use the bounded renewal procedure below after its actual acceptance; otherwise schedule manual renewal before expiry.

Set VERCEL_MEDIA_SNAPSHOT and VERCEL_CODING_SNAPSHOT from those exact records in the private test environment. Run pnpm exec vitest run --config integration/vercel-sandbox.config.ts with VERCEL_OIDC_TOKEN, the dedicated project/team and VERCEL_OWNED_TEST_CLIP pointing to the rights-cleared synthetic video. These are provider-metered tests; normal unit tests never create VMs. The suite verifies real public HTTPS, private/control denial, owned audio/frame decoding, pinned pnpm, a synthetic patch, artifact attacks and repeated external cancellation. Do not promote a snapshot based on its build alone.

## Authorize Convex without an account token

Generate 32 random bytes and store the hex value as SANDBOX_BRIDGE_SECRET in Vercel Production and the matching Convex deployment. Configure SANDBOX_BRIDGE_ENABLED=true on both, SANDBOX_TEAM_ID and SANDBOX_PROJECT_ID on Vercel, and VERCEL_SANDBOX_TEAM_ID, VERCEL_SANDBOX_PROJECT_ID plus SANDBOX_BRIDGE_URL=https://your-canonical-domain/api/internal/sandbox-credentials on Convex. APP_URL must be that canonical origin. Deploy the backend nonce mutation and the frontend endpoint before enabling media work. Preview and Development do not inherit Production secrets. No broad Vercel CLI/account token is uploaded.

The route rejects browser requests and replay, and exchanges an authenticated short-lived machine request for official project OIDC. Treat its output as a secret; never include it in logs, screenshots, app state or sandbox files. Verify wrong signature, old timestamps, repeated nonce and foreign Origin refusal. Then test a real provider operation from the backend.

## Budget and activation

Set CLOUD_SANDBOX_PROVIDER=vercel, exact tested snapshot IDs and the reviewed positive SANDBOX_CREDITS_PER_SECOND. The current conservative ceiling is 0.02 credits/second, with a five-minute media cap and ten reserved media compute credits. Include minimum memory billing granularity, transfer and teardown exposure; shared Pro credits do not erase metered costs. Verify [current regional pricing](https://vercel.com/docs/sandbox/pricing) and the team's spend controls before paid activation.

Keep MEDIA_VERIFIED, ACQUISITION_VERIFIED and CLOUD_VERIFIED false during migration. Enable media only after actual production owned-clip decode plus cleanup and accounting. Enable acquisition only after its actual production restricted-public retrieval and refusal paths. Cloud coding additionally needs approved plan/version/base/executor/funding/spend enforcement, real draft-PR publication and lifecycle, cancellation/outage reconciliation and provider agreements. User code never receives GitHub write keys or AI billing credentials.

## Teardown and incident response

Customer jobs explicitly disable provider persistence and have bounded lifetimes. Normal completion and cancellation stop/delete the sandbox. External cancellation uses Sandbox.get with resume=false, and repeats safely for already deleted jobs. Log only coarse acknowledgement and credit settlement. Verify orphan cleanup independently; a stopped VM is not a deletion audit.

Pause the three verification flags when image expiry, isolation, broker, spend or teardown acceptance fails. Never restore E2B or unrestricted execution. Preserve prior approved evidence and use an exact verified Vercel frontend deployment for rollback. Frontend rollback does not undo backend state or charges.

## Restrict acceptance before public release

Worker verification and public commercial approval are separate. Set CLOUD_PUBLIC_RELEASE_APPROVED=false and provide CLOUD_EXECUTION_SUBJECTS_JSON as a JSON array containing only the verified operator identity for production acceptance. An absent, malformed or oversized list denies execution. CLOUD_VERIFIED still needs to be true, and DISABLE_CLOUD=true denies everyone. Approval, worker claim and publication all recheck this audience. Do not enable public release merely because an owner integration test passed. Hosted video analysis additionally requires HOSTED_MEDIA_ANALYSIS_VERIFIED=true after its licensed vision model and actual audiovisual quality checks; media-worker verification alone does not enable it.

## Reconcile failures before work begins

A trusted authorization failure before sandbox creation or model use releases the unused service-credit reservation at zero. Its receipt requires no sandbox-start marker, no issued customer-provider request and the matching generation. Cancellation stays canceled; accepted output and publication receipts cannot be overwritten by late failures. Unknown creation, model usage or teardown still retains its hold for reconciliation. This is not a generic zero-cost exception.

The worker also compares GitHub's actual default branch/head with the exact approved base before creation and before checks. A stored snapshot match cannot substitute for this provider check. Refresh the project snapshot and review a new approval after BASE_CHANGED; do not silently rebase. See [ADR 026](../adr/026-current-github-base-before-execution.md).

## Renew verified clean images

[ADR 028](../adr/028-bounded-clean-tool-snapshot-renewal.md) adds internal six-hour maintenance. Keep SANDBOX_SNAPSHOT_RENEWAL_ENABLED=false until real media/coding renewal and replacement-worker acceptance pass. The configured initial snapshots remain the reviewed seeds. Internal toolMaintenance:renew reads actual provider expiry and creates a single bounded clean clone when fewer than 36 hours remain. It never receives customer inputs. Its optional force argument is for authenticated operator acceptance only, not browser use or routine scheduling.

The active project-scoped IDs and actual expiry are stored in sandboxToolSnapshots and returned only through the signed machine broker. New jobs validate the selected expiry; cleanup remains available if a snapshot expires. A per-kind atomic lease and six-hour failure backoff prevent repeated concurrent builds. Known successful probes, bounded runtime and stop/delete acknowledgement are required before promotion. Lost promotion receipts are reconciled before deleting an abandoned candidate. Unknown cleanup is not reported as verified.

This clone renewal preserves the current pinned tools. New tool versions or base-image/security updates still require rebuilding and rerunning the complete live worker suite. Renewal uses separately metered operator infrastructure; it does not debit customer task credits or establish a settled provider invoice. If renewal fails or an image has already expired, inspect the coarse lastError, provider records and actual active metadata, then rebuild manually when required. Do not clear a lease or select an unverified image simply to bypass a failure. RESTORE_LOCK pauses renewal and broker issuance.
