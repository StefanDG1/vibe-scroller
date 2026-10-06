# ADR 074: Reduce repeated Convex reads and provider work

Mode: reference. Status: implemented locally, deployment pending. Date: October 6, 2026.

## Evidence

The owner's existing usage dashboard showed 30.95 GB of VibeScroller database I/O for September 26 through October 26. Production `issues.list`, `assets.registerEvidence` and `knowledge.evaluations` accounted for 14.32, 4.95 and 4.44 GB respectively. Production identity bootstrapping used 120K calls, 3.1 GB-hours of compute and 551.74 MB of action data egress. Team usage and other projects are separate from VibeScroller usage. Rounded dashboard numbers are observations, not an invoice or a forecast.

## Decision

Load the visible knowledge section, keep its editors mounted, poll active work quickly and idle views once per minute. Pause polling in hidden/offline documents, resume immediately on visibility/connectivity changes, serialize timer requests and back off failures. Posts disable the mounted knowledge poll. Mutations still refresh their results immediately. Local personal analysis polls idle devices every thirty seconds and refreshes the model catalogue every five minutes; its active ten-second heartbeat and forty-second lease remain unchanged.

Use a read-only, authenticated profile-freshness check before the WorkOS bootstrap action. The provider verifies email and updates the profile every fifteen minutes, or at initial setup. Each backend function continues checking the current JWT, user state and workspace membership. No cross-request credential or authorization cache is added.

Keep large repository context, tree text and excerpts in `repositoryContent`. Repository metadata retains authority, version fences, selected paths and small evidence locations. Explicit analysis, planning and snapshot reuse load the content. Existing inline records remain readable; a bounded internal migration moves one repository per transaction without changing versions or timestamps. Retention, GitHub revocation, restore quarantine and workspace purge include the new content. This extends ADR 071's invocation-local read reuse to topic lists/details.

Maintain `storageUsage` atomically for every asset insertion and confirmed deletion, including thumbnails, normalized audio and evidence. Initialize each legacy workspace once from its asset records. Evidence retries with the same key/size/etag reuse the original asset; conflicting retries fail. Expired/deleting bytes count until a deletion receipt removes the asset, conservatively enforcing physical storage. No quota is increased.

Workspace shells skip source/proposal count scans they never render. Default overview callers retain the existing counts. Empty deployments check for billing/completed runs in inexpensive mutations before starting Node reconciliation actions. Both billing projections keep their hourly reconciliation; PR reconciliation keeps its fifteen-minute interval.

## Verification and release

See [the usage report and rollout procedure](../operations/convex-usage.md) and [implementation status](../implementation-status.md). Local tests, browser checks and builds do not establish deployed savings. Keep the compatible backend and bounded data migration separate from frontend release verification. An older backend that only reads inline context is not a safe rollback after compaction.
