# Caching and retention

Mode: reference.

## Cache boundaries

V1 reuses work only within the same authorized workspace. Cross-workspace cache lookup and reuse are disabled. A cache hit must not reveal whether another person saved a source.

A source-processing cache key contains workspace ID, canonical source ID, content fingerprint, acquisition version, transcript model/version, frame-selection version, analysis prompt version, and relevant input settings. Use a workspace-scoped keyed digest for deduplication identifiers exposed outside trusted storage.

A repository match cache additionally includes repository ID, base commit, business-profile version, insight hash, and matching version. A source summary can be reused while its project matches need recomputation.

Cache validity requires current access and a non-deleted source. A URL alone is insufficient to conclude the content is unchanged. For a new unverified acquisition, revalidate metadata or content fingerprint before reusing an old result.

## Concurrent imports

A transaction creates or joins one active processing job for the same valid key. The second importer gets the shared workspace result and does not reserve another complete analysis charge. Its original capture channel can be recorded separately.

Only committed stages can be reused. A failed transcript does not count as a valid cached analysis. A retry after matching failure can reuse a verified transcript and frames rather than charging for them again.

## Retention defaults

| Data | Default policy | Reason |
| --- | --- | --- |
| Temporary original media | Delete within 24 hours after successful processing | Processing, not permanent media hosting |
| Failed acquisition or decode objects | Delete within 24 hours of terminal failure | Avoid abandoned raw media |
| Abandoned uploads | Delete after 24 hours | Prevent unreferenced storage |
| Temporary audio and redundant frames | Delete with the raw-media cleanup | Keep only selected evidence |
| Selected evidence, transcripts, summaries, insights | While the user keeps the source and the workspace is entitled to retention | Product library content |
| Intermediate cache artifacts | Maximum 7 days, unless promoted to a saved evidence record | Retry support |
| Raw repository snapshots | Delete within 24 hours after the relevant run or matching operation | Minimize retained code |
| Repository summaries and manifests | While the repository remains connected, with version pruning | Matching context |
| Run diagnostic logs | 14 days by default, redacted | Troubleshooting |
| Security and access audit events | 90 days by default, minimal content | Abuse and incident investigation |
| Exports | Signed download expires quickly; object deleted after 24 hours | User portability |
| Service backups | Rolling maximum 30 days for non-statutory content | Recovery with bounded deletion lag |
| Billing and legal evidence | Separate legally required retention schedule | Do not invent the required period |

These are product defaults, not claims that every provider has the same deletion timing. The privacy page must identify provider-specific differences. Statutory records require a documented operator schedule before live billing.

## Deletion

A user can delete a source, project connection, workspace, or account. Deletion immediately removes normal access and schedules object, index, cache, and provider cleanup. The target completion for active product data is seven days, with backups aging out within their documented window unless a lawful hold applies.

Keep a content-free tombstone so restoring a backup cannot resurrect deleted sources. Reapply tombstones before a restored service accepts traffic. A test of this behavior is a launch requirement.

Explain that an already published GitHub PR remains on GitHub unless the authorized user removes or edits it there. Private artifacts and source text under VibeScroller control still follow deletion.

## Disconnection and source revocation

Revoking GitHub stops new repository reads and writes. It does not fabricate a new PR status. Revoking Telegram stops captures from that link. Revoking an AI credential stops jobs that need it and deletes its stored secret.

If source access is withdrawn or a valid rights complaint requires removal, mark the affected source unavailable and purge retained content according to the complaint process. Do not serve a cache hit as a way around that removal.

## Future shared cache

A future shared cache requires a documented reuse basis, source-access revalidation, compatible provider terms, data-purpose analysis, removal propagation, and a user-visible policy. It must exclude private uploads, account-only content, repository context, prompts, feedback, and personal recommendations.

Shared records must not expose who submitted content. Deleting a user's account must delete its association even if an independently authorized shared record remains. Content fingerprints alone are not proof of anonymity.

The first financial model assumes zero cross-customer reuse. Any savings from a future cache require measured hit rate, validity checks, and legal review. Public availability does not by itself grant a right to store or reuse every transcript.
