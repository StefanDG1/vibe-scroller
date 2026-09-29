# Repository coding skills

Twelve skills are bundled under `.agents/skills` and routed by `AGENTS.md`. Their full local supporting files are included, so reading them does not depend on the owner's global directories. `skills-manifest.json` records hashes and source snapshots.

The selection covers core data design, simplification, redesign, debugging, frontend design, Next.js, shadcn, browser inspection, technical writing, and prose editing. The licensed `seo-audit` snapshot and original `companynerve-launch` guidance cover website review and provider setup. See [the reuse assessment](research/reuse-and-skills.md). Multi-agent orchestration, broad platform packs, and unrelated product skills are excluded.

Browser Harness requires its own executable and browser connection. Provider tools and API credentials are not installed by copying instructions. Upstream skill references can be stale or tool-specific; use current official documentation and available equivalents, and disclose missing capabilities.

To update a skill, review the upstream diff, copy its supporting files and notices, update that entry's hashes, and run `node scripts/validate.mjs`. Do not overwrite local skills automatically. Check redistribution rights before public release. The exact source notice status is in `skills-manifest.json` and the root third-party notices.
