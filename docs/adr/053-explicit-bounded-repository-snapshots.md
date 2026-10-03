# Select bounded repository paths explicitly

Mode: reference. Decision October 4, 2026. Status: implemented locally; deployed acceptance is tracked separately.

The real owned private repository could not prepare a snapshot: its nontruncated tree contained 8,728 eligible files and a 2,774,129-byte serialized manifest. The existing limits are 5,000 files and 600,000 bytes. A generic retry cannot resolve this failure. The owner requested genuine app-generated issues from saved videos for both selected projects, preserving budgets, privacy and existing features.

Extend the existing repository checklist with optional literal repository-relative file/folder paths. At most twenty paths, 300 characters each and 4,000 characters in total are accepted. Blank selection retains the eligible-tree behavior. Wildcards, traversal, absolute paths and forbidden secret/build paths are rejected. Folder matching uses a slash boundary. Every requested path must contain eligible files at the current commit; existing ignore rules, symlink exclusions and blob limits still apply.

GitHub metadata and bounded ignore policies establish eligibility. Only selected eligible content blobs are read. The selected manifest still obeys the same file/byte limits. A truncated tree remains refused. No limit, allowance, provider or build setting changes. The snapshot records selected paths, included and omitted eligible-file counts; context remains bounded to excerpts. Retrieval, knowledge evaluation and AI profile drafting refuse a requested scope that has not been prepared. Issue text discloses partial repository coverage.

The existing selection version fences late work and stale evaluations/publication approvals. Omitted scope in legacy selection requests preserves saved paths; explicit empty paths restores the eligible-tree selection. Confirmed profiles and manual corrections survive. A changed scope clears only the old completed AI context proposal; pending requests and unknown cost holds remain subject to existing reconciliation. Preparation persists a safe allowlisted failure code, with a useful path-selection action for oversized snapshots.

The legacy single-repository connection delegates to the existing bounded batch preparation so other selected repositories cannot remain permanently preparing. This reuses the same authorization, concurrency, quotes and per-project failure handling.

Tests cover path validation and sibling-prefix rejection, existing ignore/privacy boundaries, whole-tree failure, successful bounded selection without omitted blob reads, both unchanged manifest limits, scope changes before provider reads, tenant projection and selection fencing, confirmed context preservation, and legacy partial failure. Live provider and native UI evidence belong in [implementation status](../implementation-status.md); local mocks do not establish those passes. Independent usefulness, publication approval and human acceptance remain separate.
