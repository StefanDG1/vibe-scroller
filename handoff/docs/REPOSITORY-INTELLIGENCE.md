# Repository intelligence

Mode: explanation.

## Understand the project before recommending changes

A repository snapshot explains code, not the whole business. VibeScroller drafts a business profile from the README, product documents, dependency manifests, tests, and selected issues. The user confirms the profile's audience, purpose, stage, goals, business model, constraints, and non-goals.

A profile can cover several repositories, but each repository keeps its technical snapshot and permissions. An ecommerce marketing idea must not be applied to an unrelated personal utility merely because both use Next.js.

A missing profile does not block the video library. It changes matching to `needs_context` and prompts the user to confirm the missing information.

## GitHub access

Use a GitHub App with selected-repository installation. Read-only analysis requires repository metadata and appropriate content access. Issue and pull-request publishing requires explicit write scopes. Do not request organization administration or workflow modification for the normal pipeline.

Bind authorization to stable repository IDs and installation IDs. A renamed repository retains identity, while installation removal revokes access. Repositories not selected by the user must not be cloned for convenience.

Keep the GitHub App private key in the trusted backend. Obtain short-lived installation credentials only for the required operation. Do not pass a broad write token into a coding agent.

## Snapshot strategy

Record the analyzed commit SHA and branch. Build a file manifest with hashes and exclusions. Use Repomix as a context-preparation component, then independently enforce exclusions and size limits. Source S25 does not make its secret checks a complete security boundary.

Initial exclusions cover environment files, credentials, dependency directories, build output, large binaries, local databases, private keys, and generated artifacts. Include `.env.example` only after verifying it contains placeholders. Inspect `.gitignore`, project ignore settings, and explicit VibeScroller exclusions.

Do not execute repository hooks, package scripts, submodules, or generated code during analysis. A safe archive of the selected commit is preferable to an unrestricted checkout. Reject path traversal and escaping symlinks in archives.

For local folders, the runner maps a selected repository ID to a locally configured path. The cloud cannot submit an arbitrary filesystem path. Default to committed clean snapshots. Reading uncommitted changes is a separate, visible opt-in and is never necessary for the standard flow.

## Bounded context

Cache structural summaries by repository ID, commit SHA, profile version, extraction version, and exclusion manifest. A matching job retrieves only the relevant files and summaries within its budget.

Use commit differences to decide which summaries need rebuilding. A dependency change invalidates related technical assumptions. A profile change invalidates business-fit results even when code is unchanged.

The default first pass retrieves at most five plausible repositories for an insight. Apply workspace filters before semantic retrieval. The user can request evaluation against additional selected repositories with an explicit quote.

## Match reasoning

A match identifies a concrete project problem, the relevant source claim, existing implementation evidence, and a proposed action. It also searches for evidence that the idea is already implemented or conflicts with project constraints.

A match can return `no_fit`, `already_implemented`, `unsupported_claim`, `needs_context`, or `defer`. These are valid completed results. An empty or inapplicable video must not generate filler tasks to make the product look busy.

Before planning a technical change, verify volatile claims against current primary documentation. A saved video can be outdated. Preserve the creator's original claim and attach the verification result rather than rewriting history.

A business recommendation can lead to a research task, copy experiment, analytics plan, or interview outline instead of code. Record that implementation kind. Do not fabricate repository edits for an action that belongs outside a repo.

## Proposal structure

A proposal contains a concise title, current problem, source evidence, repository evidence, desired change, expected benefit hypothesis, metric, risk, effort band, dependencies, non-goals, and rejection reasons. Scores help rank but are not probabilities of profit or correctness.

Deduplicate overlapping proposals across videos. Keep all relevant sources as supporting or conflicting evidence. Do not treat repeated advice as independent validation when the clips repeat the same original source.

A proposal can suggest a creative application, but it must label the inference. The evidence should make it possible for the user to disagree without watching every clip again.

## Plan and execution boundary

The plan names real files from a refreshed snapshot. It describes implementation steps, tests, migration risk, compatibility, rollout, rollback, and uncertainties. Paths that do not exist are marked as new proposed files, not falsely cited existing code.

Refresh the base commit immediately before execution. When it changes materially, regenerate the relevant plan sections and request renewed approval. A mechanical rebase can proceed only under an explicit policy and cannot introduce unreviewed scope.

Protect authentication, authorization, payment, secrets, destructive database operations, infrastructure, workflows, and dependency installation behind a higher-risk review. No video or README instruction can bypass this classification.
