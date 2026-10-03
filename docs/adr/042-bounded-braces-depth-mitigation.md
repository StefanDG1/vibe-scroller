# ADR 042: Bound recursive brace processing

Status: local mitigation implemented; final deployment pending. Date: 3 October 2026.

The current registry audit lists high-severity GHSA-vfj7-8cjw-p6xm in braces 3.0.3 through Repomix. The official advisory reports no patched release. VibeScroller calls Repomix's structural tree generator, not its glob packing API; repository ignore processing uses the separate ignore package. Preserve that narrower reachability assessment without assuming future calls are safe.

Keep the selected Repomix stack and pinned versions. Apply an exact pnpm patch to braces' compile, expand and stringify entry points. An iterative preflight refuses child depth above 128, cyclic child references and more than 100,000 nodes before recursive processing. Caller options cannot raise the ceiling. Normal parser parent links are not traversed.

The original direct AST APIs each reproduced stack exhaustion on an owned 12,000-level AST. The original 4,000-level string test completed on this Windows runtime; larger string tests hit the existing 10,000-character parser limit. These are distinct observations. Patched tests verify bounded refusal for direct AST and nested string inputs and preserve ordinary ranges, alternatives, nesting and escapes. This is a local mitigation, not an upstream release or a clean registry audit. Do not suppress the advisory globally. Recheck upstream by November 2, 2026 and replace the patch with a verified official fix when available.

The first isolated diagnostic correctly refused a generated lockfile exceeding the existing 100,000-character generated-file bound. Do not enlarge that bound to make a test pass. A separate owned fixture included the reviewed lockfile, workspace metadata, patch and regression test as its baseline. The production-selected read-only cache applied the patch offline, executed the actual test and preserved reviewed source bytes in 95.48 seconds, with confirmed teardown. This fixture is dependency acceptance, not model-generated code or a publishable customer patch.

Clean cache builds now accept only bounded patch files whose package, path and SHA-256 match the reviewed public profile. The updated lock and patch hashes feed renewal; no customer source, hooks, lifecycle scripts or mutable shared cache are admitted. Actual clean-image build and production selection evidence remain separate from the existing-cache acceptance.

Reference: [official advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Raw audit and failed/retested diagnostics remain in ignored outputs; the committed patch and regression tests are reviewable source.
