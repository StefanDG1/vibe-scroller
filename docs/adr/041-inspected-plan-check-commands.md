# ADR 041: Inspect package commands before drafting checks

Status: implemented; production model retry pending. Date: 3 October 2026.

Two real Google-generated plans named prose checks or guessed npm commands for a pnpm repository. The second draft requested an application lint script that did not exist. Native review corrected both before execution. Preserve these quality failures; a stronger prompt alone did not prevent them.

Planning retrieval now prioritizes the actual root package manifest and containing package manifests alongside cited implementation files. Git blob hashes, eligible modes, secret exclusions, the 24-excerpt and 40,000-character bounds remain enforced. Partial JSON windows cannot establish package metadata. Complete inspected objects provide the pinned manager and nonempty script names by directory to the planner.

A generated-draft quality guard rejects recognizable package commands using a different inspected manager, an absent script, or an uninspected package directory when other package context exists. It is not a complete shell parser or an execution security boundary. Complex commands and unknown stacks still require review. Explicit owner-edited plans retain their existing approval contract. Existing isolated execution, snapshot integrity and final publication review are unchanged.

Focused tests include a source-heavy manifest that previously displaced package.json, partial metadata, the observed npm/app-lint mistakes, chained commands and backend refusal before saving a draft. Actual production draft behavior is recorded separately after deployment.
