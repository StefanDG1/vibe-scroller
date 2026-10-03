# Contribute to VibeScroller

Mode: how-to. Read [AGENTS](../AGENTS.md), [start here](START-HERE.md), [decisions](decisions.md) and the work package. Read all four [foundational documents](foundational/README.md) for copy changes. Preserve upstream notices and one core for personal and hosted use.

Use Node 24, pnpm 12.3.4, `pnpm install --frozen-lockfile` and [local development](local-development.md). The labeled demo needs no accounts. Real integrations use dedicated test accounts, never inherited production credentials.

Before a PR run formatting on changed files, `pnpm check`, `node scripts/audit-dependencies.mjs`, `git diff --check`, a redacted secret scan and relevant browser/integration checks. `pnpm check` bundles document validation, lint, types, tests and production builds. Retain failures/skips. Fixtures do not prove live integrations.

Record command, commit, environment, UTC time and result in [implementation status](implementation-status.md). Interface changes require widths, keyboard/focus/reduced-motion/touch checks; physical Android is separate. Tenant/deletion, exact approval, isolation, payment replay and reservations remain release blockers.

Stage only reviewed files. Ignore `.env*`, `private/`, `outputs/`, archives and provider exports. Never publish token-bearing failure logs. [Report security issues privately](SECURITY.md).

Application/policy changes use Basic queued builds; documentation follows the build-skip policy. Main updates get immutable alpha tags/prereleases after exact-commit CI. Contributions do not authorize customer-repository merges or marketing dispatch.
