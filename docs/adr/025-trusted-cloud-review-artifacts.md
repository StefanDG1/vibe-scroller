# ADR 025: trusted cloud review artifacts

Status: accepted. Date: October 2, 2026.

Guest Git output cannot define the patch a user authorizes. Approved checks can alter source files, Git configuration or the index. The trusted publisher previously used generated file contents while the guest produced the displayed diff; those artifacts could disagree.

Build the bounded textual review patch outside the guest from the exact immutable base and generated file contents. Reject duplicate or unsafe paths, absent-file deletion, unchanged files, secrets and oversized content. Keep existing executable modes; mode-only, binary and empty-file additions need a separately supported review profile.

Before checks and after each approved command, independently verify every snapshotted source and approved deletion. A privileged fixed Python verifier traverses descriptor-relative directories without following symlinks, reads only regular single-link UID-1001 files, and compares exact byte length, SHA-256 and executable status. Build outputs outside the source manifest may remain; altered source files cannot produce an accepted report. Customer commands never execute in this privileged verifier. Worker namespaces and bounded teardown remain mandatory.

Before creating GitHub blobs, the publisher applies the reviewed patch to authoritative immutable GitHub base blobs and compares the resulting path/content set with the supplied publication files. A mismatch fails before any Git write. Existing verified run markers still reconcile prior publication receipts without duplicate writes.

Pure comparison, fake guest output, changed source, publisher mismatch and retry tests accompany the implementation. Real Vercel acceptance separately checks normal publication artifacts and refusal of source mutation, symlink and hardlink substitutions. Tests that rewrite sources, such as formatting in place, require a new reviewed generated patch; this adapter does not silently publish their changes.
