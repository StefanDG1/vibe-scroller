# Convex components for bounded V1 jobs

Mode: explanation. Decision recorded 2026-09-30. Status: implemented for source analysis and cloud coding; source dispatch verified in staging; cloud dispatch not repeated.

The selected foundation already uses Convex. The owner requested a review of the current component catalogue. This decision adds Workflow 0.4.8 and its Workpool 0.4.12 peer, pinned in the existing lockfile. Their published peer ranges include the exported Convex 1.46.0 and convex-helpers 0.1.124 versions.

Workflow starts in the same mutation as source generation changes or coding authorization. Two action steps can run concurrently across this component. External actions have retries explicitly disabled. Their existing cost reservations, generation fences, deletion checks and media fingerprint validation still govern effects. Failed workers preserve unknown cost reservations and record reconciliation requirements. Journals contain record IDs and generations, not transcript text, credentials or repository snapshots. This does not make an external charge exactly once, and no test claims that it does.

## Catalogue review

| Component                                                                                                         | V1 decision                            | Reason                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Workflow](https://www.convex.dev/components/workflow) and [Workpool](https://www.convex.dev/components/workpool) | Use Workflow and its internal Workpool | Bounded dispatch and persisted completion history match the selected architecture. Keep provider retries off.                                                                                          |
| [Rate Limiter](https://www.convex.dev/components/rate-limiter)                                                    | Keep installed                         | Capture and imports already use transaction-aware limits.                                                                                                                                              |
| [Resend](https://www.convex.dev/components/resend)                                                                | Keep installed                         | Existing staged delivery and signed event processing. Opt-in and production sender gates remain.                                                                                                       |
| [Action Cache](https://www.convex.dev/components/action-cache)                                                    | Do not add for private analysis        | Its documented concurrent cache misses may race. Our media stages also bind workspace, ETag, source generation, evidence ownership and pipeline hash, with explicit deletion.                          |
| [Aggregate](https://www.convex.dev/components/aggregate)                                                          | Defer                                  | Source counts already update atomically. Add namespaced aggregates when measured reporting needs justify a migration, without changing financial ledger authority.                                     |
| [Cloudflare R2](https://www.convex.dev/components/cloudflare-r2)                                                  | Retain current storage adapter         | Actual EU bucket grants, authenticated evidence links, finite raw retention and deletion outbox have staging evidence. Replacing these now adds migration risk without resolving an unmet requirement. |

Review used official catalogue descriptions and installed package README/type definitions. The catalogue's verification badge does not replace tenant, cost, privacy or staging tests. Components are implementation libraries, not a free inference entitlement. The separate free-provider routing decision remains unchanged.

## Validation

Run product boundary tests, full type checks, lint and the production build. Deploy the component schema separately to the staging Convex project. Exercise one labeled source through the browser to verify dispatch and record the Workflow result without another paid fallback.
