# Allow an optional VibeScroll local project root

Mode: reference. Decision October 7, 2026. Status: owner-approved implementation preparation; no directory move performed by this documentation update.

The owner allows the implementation agent to retain `C:\Code\VibeScroller\vibe-scroller` or create the project root `C:\Code\VibeScroll` if it improves the setup. This supersedes the earlier instruction to work only in the original checkout. It does not authorize work in unrelated repositories or a replacement GitHub repository, database or provider project.

Follow the [plan's backup and rename sequence](../VIBESCROLL-EVOLUTION-PLAN.md#11-backup-and-vibescroll-rename). Verify resolved source/destination paths and existing destination contents before any move or deletion. Preserve history, refs, dirty/untracked work and necessary private configuration. Never overwrite existing work or commit secrets/private files. Prefer retaining the old checkout while verifying the new one; rebuild caches and dependencies rather than duplicating generated data. Update affected project registrations, worktree attachments, runner paths and current handoff references. Keep stable provider identities, production domain, temporary-session restrictions and privacy boundaries intact.

Affected checks are backup restoration, Git history/remote identity, preservation of local work, ignored/private-file exclusion, relevant local setup and one authoritative working root. A folder change alone requires no corpus reanalysis, database migration or production deployment. This update performs none of those actions.

The implementation begins with an access preflight while the owner is available: prepare actual official login, MFA, consent and security prompts, batch feasible owner actions, and explain time-bound or action-specific approvals that cannot happen upfront. Do not store codes, bypass approvals, extend restricted sessions or treat login as authorization for a charge/publication. Continue independent work if a later approval blocks one step.

Documentation QA, October 7, 2026, local checkout based on `b20d084dc969bd4d3f2c550f253b59f5702e0c5b`: `pnpm validate` passed for 198 documents and 12 skill snapshots; Prettier processed all three changed/new Markdown files; `git diff --check` passed. These checks do not establish that a backup, folder transition, login or application acceptance test has been completed.

Implementation update, October 7: the authoritative root remains `C:\Code\VibeScroller\vibe-scroller`; no folder transition was necessary. Verified all-ref Git restoration, protected configuration round trip and independent database/object backups are recorded in the [execution ledger](../VIBESCROLL-EXECUTION.md). Actual owner-completed official login/consent steps and later renewal are recorded separately. Temporary isolated recovery resources were cleaned up while preserving archives, history, private configuration and useful authentication sessions.
