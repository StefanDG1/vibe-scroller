# Preserve release and backup authority across the repository rename

Mode: reference. Decision October 7, 2026. Status: compatibility deployed; existing repository renamed. Subsequent delivery acceptance remains pending.

The owner authorized renaming the existing GitHub repository from `StefanDG1/vibe-scroller` to `StefanDG1/vibescroll`, preserving its history and provider identities. Repository ID `1396686369` and node ID `R_kgDOUz--IQ` identify that repository. A replacement repository with a familiar display name must not inherit release or backup authority.

Release and scheduled-backup guards require the stable repository ID and one of the two explicitly accepted names. The workflow gates backup on that same immutable ID, main and the existing explicit backup flag. Existing deployment-key, encryption-key, read-only operation, event and retention restrictions remain required. No public rename changes an authentication audience, CompanyNerve namespace, legal record, invoice, historical version or source evidence identity.

Merge and verify this compatible guard before the external rename. Verify existing refs, backup recovery and provider bindings; rename the existing repository rather than create one. Update the authoritative checkout's remote, current links and affected provider connections afterward. Keep old historical URLs and private recovery materials intact. The local root stays `C:\Code\VibeScroller\vibe-scroller`, as ADR 077 permits. Do not mutate the separate existing worktree's work.

`tests/repository-identity.test.ts` checks both authorized names with the stable ID and rejects a different repository, missing ID, unrelated owner and unapproved name. Exact GitHub workflows, external binding compatibility and post-rename delivery need real receipts; unit tests do not establish them.

The owner-authorized GitHub API rename succeeded after PR 54's exact main checks and release. The new name retains both repository IDs and main `17a15015eb134a8de929fc8f816835eb85e66e4f`; the old API route resolves to the same renamed repository. The authoritative remote now uses `https://github.com/StefanDG1/vibescroll.git`. Vercel retains the same numeric repository binding, although its display slug still reads `vibe-scroller`. Verify its next webhook/build before treating that integration as accepted. The canonical domain still serves the exact compatible version. No replacement repository, account, project or database was created.
