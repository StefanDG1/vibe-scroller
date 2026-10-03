# Data model

Mode: reference. Names describe proposed Convex tables and serialized concepts.

## Shared fields

Every tenant-owned record includes `workspaceId`, `createdAt`, and `updatedAt`. Timestamps use UTC epoch milliseconds internally. Display uses the user's locale and timezone. Identifiers are opaque strings, not sequential customer counts.

Versioned records include `schemaVersion` and an immutable content hash. Public routes must not accept a workspace ID as sufficient authorization. Membership comes from the authenticated identity and is checked against the object's actual workspace.

## Core records

| Record                 | Required fields and indexes                                                                                            | Retention or behavior                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `users`                | WorkOS user ID, display preferences, accepted-policy versions                                                          | App identity, separate from provider connections                          |
| `workspaces`           | owner, name, plan projection, timezone, status                                                                         | Owner cannot delete the last owner without transfer or workspace deletion |
| `memberships`          | workspace, user, role; unique pair                                                                                     | Owner, member, viewer. Billing actions require owner                      |
| `connections`          | workspace, provider, actor, granted scopes, encrypted secret reference, status                                         | No plaintext tokens in query output                                       |
| `captureRequests`      | channel, workspace, client idempotency key, submitted URL or object ID                                                 | Unique workspace and key                                                  |
| `sources`              | platform, canonical ID, canonical URL, source kind, title, creator, source dates if known, capturedAt, state, coverage | Capture time never masquerades as the platform save time                  |
| `sourceAssets`         | source, private object key, media type, bytes, duration, fingerprint, expiry                                           | Signed object access after authorization                                  |
| `processingRuns`       | source, pipeline version, provider choices, stage, cost reservation, errors                                            | Original outputs remain traceable across reruns                           |
| `transcriptSegments`   | run, segment index, startMs, endMs, originalText, correctedText, confidence flag                                       | Corrections record author and evidence                                    |
| `frames`               | run, timestamp, object key, selection reason, quality, extracted observations                                          | Not an exhaustive frame-by-frame claim                                    |
| `insights`             | source, run, title, claim, summary, category IDs, evidence refs, uncertainty, verification status                      | Multiple distinct insights per source                                     |
| `tags`                 | workspace, slug, label, origin                                                                                         | User labels and platform collections remain distinct                      |
| `sourceTags`           | source, tag                                                                                                            | Unique association                                                        |
| `repositories`         | installation ID, provider repo ID, owner/name, default branch, enabled capabilities                                    | Selective access and repo-specific policy                                 |
| `businessProfiles`     | repository or project group, version, purpose, audience, stage, goals, model, constraints, nonGoals, confirmation      | Draft and confirmed profiles distinguished                                |
| `repoSnapshots`        | repository, commit SHA, branch, manifest hash, exclusions, summary, embedding version                                  | Invalidate related matches when material context changes                  |
| `matches`              | insight, repository, profile version, snapshot, disposition, score details, rationale                                  | Ranking scores are not success probabilities                              |
| `proposals`            | match IDs, repository, current version, review status, risk class                                                      | One proposal can combine several insights                                 |
| `proposalVersions`     | proposal, version, problem, change, source/repo evidence, benefit hypothesis, risk, acceptance, plan hash              | Immutable after review, edits create a version                            |
| `approvals`            | approver, plan hash, repo ID, base SHA, executor, funding route, spend ceiling, expiry                                 | Revocable and consumed by an exact approved operation                     |
| `runnerDevices`        | workspace, user, public key, credential hash, capabilities, lastSeenAt, revokedAt                                      | Never stores the user's local Codex OAuth token                           |
| `implementationRuns`   | approval, executor, state, lease generation, deadline, budget, artifact refs                                           | No model-only permission changes                                          |
| `pullRequests`         | repo ID, provider PR number/ID, run, URL, isDraft, state, mergedAt, mergeCommitSha, observedAt                         | GitHub-authoritative projection                                           |
| `proposalPullRequests` | proposal, PR, contribution note                                                                                        | Handles one proposal to multiple PRs without double counting              |
| `outcomes`             | proposal or PR, metric, baseline, observation, time window, evidence, author, benefit status                           | Merge does not populate benefit automatically                             |
| `feedback`             | actor, target type/ID, action, reason, note, model/prompt version                                                      | Append-only events with edit history                                      |
| `notifications`        | recipient, event key, channel, safe payload, delivery state                                                            | Unique recipient/event/channel                                            |

## Commercial and operational records

| Record                   | Required fields                                                                               | Invariant                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `subscriptions`          | Stripe customer/subscription IDs, mode, price version, status, period, cancellation           | Server projection only                                        |
| `entitlementPeriods`     | subscription, tier, interval start/end, included credits, quota version                       | Unique subscription and period. Annual renews credits monthly |
| `creditPurchases`        | payment ID, credits, grant status, refundable remainder                                       | No balance before verified payment                            |
| `reservations`           | job, period or credit pool, estimated credits, estimate version, expiry, state                | Active reservations reduce available credits atomically       |
| `costEntries`            | job, provider, unit type, quantity, original currency, FX policy, actual amount, credit debit | Append-only settlement with correction entries                |
| `webhookReceipts`        | provider, delivery/event ID, signature result, processing state                               | Never process an unsigned event                               |
| `outbox`                 | operation, idempotency key, attempt, lease, nextAttemptAt                                     | Replayed worker delivery is safe                              |
| `auditEvents`            | actor, workspace, action, target, time, outcome, request ID                                   | No full prompts, tokens, or video transcripts                 |
| `deletionJobs`           | target, schedule, object/provider deletion receipts, legal hold                               | Tombstone prevents resurrection during restore                |
| `legalAcceptances`       | actor, policy version, action, timestamp, locale                                              | Marketing consent independent of service terms                |
| `taxConfigurations`      | official registration mode, evidence reference, effective date, jurisdictions, reviewer       | Production tax mode cannot be set by the AI                   |
| `invoiceComplianceTasks` | invoice ID, required destination/system, due date, submitted receipt, status                  | Stripe invoice does not imply Romanian filing completion      |

## Dashboard projections

A `sourceCard` query returns a summary, at most three preview main points, coverage, tags, related repo count, proposal counts, and PR counts. It also returns counts for no-fit, already-implemented, unsupported, and unreviewed matches. The detail query loads the full list.

PR counts use unique provider PR IDs. A source-level `hasMergedChange` is true only when at least one linked PR has a verified merge. The UI says "1 merged PR" rather than implying that every idea from the video shipped.

A source may have no PR because it was useful for a non-code task. Such an outcome uses `implementationKind=manual_task`, not a fabricated PR record.

## Indexes and retrieval

Create indexes for workspace plus source capture time, workspace plus processing state, repository plus snapshot SHA, proposal plus version, run plus lease generation, and provider plus webhook ID. Use pagination with stable tie-breakers. Do not load an entire workspace into the browser.

Embedding records include workspace, entity ID, model, dimensions, and content hash. Filter by workspace before returning candidate text. If a vector backend cannot enforce a tenant filter, query through separate tenant partitions or disable it. A filter after exposing results is insufficient.

## Corrections and deletion

Never overwrite raw transcription silently. Store a correction event and update the current projection. A new processing version can replace the current display only with provenance intact.

Deleting a source removes its raw media, transcript, frames, insights, and searchable content. Preserve a minimal redacted link from a historical PR if needed to explain that its source was deleted. Deleting an app record does not silently delete a user's GitHub PR.

Billing and legal-retention records are separated from content. Account deletion explains those exceptions and schedules remaining deletion. The exact statutory retention period comes from the verified operator policy, not a model guess.

## Workspace knowledge records

The implemented extension adds workspace-owned knowledgeTopics, knowledgeMembers, knowledgeJobs, knowledgePolicies, knowledgeEvaluations, issueDrafts and issueAttempts. Source references bind source ID/generation/revision/insight ID. Topic versions preserve corrections; evaluations bind repository SHA/profile version/source-set hash. Old single-source proposals remain unchanged. See [the execution ledger](V1-KNOWLEDGE-EXECUTION.md) for bounds, indexes, migration and acceptance.
