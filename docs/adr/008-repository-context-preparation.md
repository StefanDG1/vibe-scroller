# Prepare inspected repository context with Repomix

Status: implemented, staging verification pending. Date: 2026-09-30.

The handoff requires Repomix in snapshot preparation while keeping exclusions and isolation independent. Repomix 1.18.1 supports Node 22 and later, including the selected Node 24 runtime. Its exported `generateTreeString` API prepares the structural context for the exact excerpts inspected by the trusted GitHub broker. The pinned lockfile also uses ignore 7.0.10 for root `.gitignore` and `.repomixignore` rules.

This integration deliberately consumes bounded provider blobs rather than invoking Repomix's checkout, local-file search, git history, compression workers or CLI. No repository hooks, package scripts or submodules execute during context preparation. The model receives the Repomix tree and independently selected whole-line excerpts with blob hashes. It cannot cite uninspected manifest files.

Independent VibeScroller exclusions override negated repository ignore rules. Root ignore policies are bounded to 20 KB each. Snapshot entries preserve paths, blob hashes, modes and sizes, capped at 5,000 files and 600 KB of serialized manifest metadata. Larger snapshots require explicit bounded selection rather than silent truncation. Raw retention and GitHub revocation clear the prepared tree and manifest metadata with source excerpts.

Nested ignore files, semantic selection across several repositories, commit-difference summary rebuilding and complete benchmark evaluation remain unfinished. A structural tree is not a semantic retrieval engine, an isolation boundary or a complete secret scan. No full Repomix pack or repository-code execution is claimed.

Validation: repository-context unit cases cover project ignores, forbidden-path precedence, size bounds and the actual Repomix tree output. Profile-draft boundary tests cover tenant access, quote binding, pending duplication, stale output, caching and separate confirmation.

References: [Repomix upstream](https://github.com/yamadashy/repomix), [repository intelligence](../REPOSITORY-INTELLIGENCE.md).
