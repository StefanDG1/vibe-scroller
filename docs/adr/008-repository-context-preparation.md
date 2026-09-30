# Prepare inspected repository context with Repomix

Status: implemented, staging verification pending. Date: 2026-09-30.

The handoff requires Repomix in snapshot preparation while keeping exclusions and isolation independent. Repomix 1.18.1 supports Node 22 and later, including the selected Node 24 runtime. Its exported `generateTreeString` API prepares the structural context for the exact excerpts inspected by the trusted GitHub broker. The pinned lockfile also uses ignore 7.0.10 for root `.gitignore` and `.repomixignore` rules.

This integration deliberately consumes bounded provider blobs rather than invoking Repomix's checkout, local-file search, git history, compression workers or CLI. No repository hooks, package scripts or submodules execute during context preparation. The model receives the Repomix tree and independently selected whole-line excerpts with blob hashes. It cannot cite uninspected manifest files.

Independent VibeScroller exclusions override negated repository ignore rules. Nested policies are bounded to 20 KB each, 100 files and 100 KB total. Snapshot entries preserve paths, blob hashes, modes and sizes, capped at 5,000 files and 600 KB of serialized manifest metadata. Larger snapshots require explicit bounded selection rather than silent truncation. Raw retention clears the prepared tree and excerpts while retaining structural manifest metadata for incremental comparison. GitHub revocation clears this metadata too.

Nested ignore files now apply to analysis and cloud execution. Recent unchanged excerpts can be reused only when extraction version, blob hash, mode and size agree. Snapshot time is independent of profile edits. Added/changed/removed eligible paths and inspected paths form a bounded structural summary. Semantic repository selection uses confirmed tenant profiles and returns up to five tentative candidates or an explicit no-fit result. Technical matching still requires separate inspected repository evidence. Complete benchmark evaluation remains unfinished. A structural tree is not an isolation boundary or a complete secret scan. No full Repomix pack or repository-code execution is claimed.

Validation: repository-context unit cases cover project ignores, forbidden-path precedence, size bounds and the actual Repomix tree output. Profile-draft boundary tests cover tenant access, quote binding, pending duplication, stale output, caching and separate confirmation.

References: [Repomix upstream](https://github.com/yamadashy/repomix), [repository intelligence](../REPOSITORY-INTELLIGENCE.md).
