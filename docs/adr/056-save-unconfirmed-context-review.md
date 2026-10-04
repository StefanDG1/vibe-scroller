# Save context review edits before confirmation

Mode: reference. Decision October 4, 2026. Status: implemented; release evidence recorded separately.

The owner asked to finish all independent work, including a detailed repository-derived business context. The editor previously persisted changes only through confirmation. Add a zero-inference Save review edits action using the existing repository draft fields. Reviewers can correct evidence and preserve a proposal for later owner confirmation without changing the authoritative business profile.

The mutation checks active workspace membership, owner/admin role, enabled repository, current SHA, profile and selection versions, matching snapshot scope and the exact previous saved draft. A concurrent draft change is refused rather than overwritten. Pending or unknown-usage generation blocks saving, preserving its reservation and reconciliation boundary. Nonempty text, the complete 8,000-character limit and secret refusal remain enforced server-side. An audit records the actor and repository, without profile text. Saving never reserves credits or invokes a model.

Confirmed text, its version and confirmation flag remain unchanged. The saved proposal is pinned to current inputs and can be reviewed in the existing editor; a later identical generation request reuses it. Saving review edits does not confirm business hypotheses, approve matching against an unconfirmed profile, authorize an issue, or approve execution. Existing confirmation and invalidation continue to control authority.

Affected code: `convex/profiles.ts`, authenticated product proxy and business-context editor. Tests cover authorization, stale/concurrent inputs, scope change, disabled repositories, secret/length refusal, unknown holds, wallet and confirmed-profile preservation, and cached reuse. [Interface contracts](../API-CONTRACTS.md), [execution ledger](../V1-KNOWLEDGE-EXECUTION.md) and [implementation status](../implementation-status.md) track the release. Existing providers and fixed Basic queued builds remain unchanged.
