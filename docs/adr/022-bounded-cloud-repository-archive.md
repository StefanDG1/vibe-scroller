# Assemble cloud snapshots from a verified GitHub archive

Mode: explanation. Decision: October 2, 2026.

Reading every source blob in separate GitHub requests could consume much of a bounded cloud runtime before generation or tests began. The trusted broker now downloads the archive of the exact approved commit. It still reads the immutable tree and bounded ignore policies first.

Only the exact HTTPS codeload.github.com legacy ZIP redirect for the selected repository and commit is accepted. The broker does not forward its installation credential to that host or log the short-lived redirect capability. Redirect chains are rejected. The compressed stream is capped at 25 MB even without a Content-Length header.

Archive entries never become filesystem paths on the host. One safe root, no traversal or duplicate names, manifest-selected regular files, declared sizes and recomputed Git blob hashes are checked. At most 2,048 text files, 1 MB per file and 20 MB selected data enter the existing cloud snapshot profile. Ignore exclusions and whole-file binary/secret checks remain in force. A forbidden approved file stops the job. Executable modes are preserved before baseline creation and checks using shell-quoted canonical paths; deleted files are excluded from the second mode pass.

The archive and dynamic source text remain in trusted action memory; they are not persisted as a new cache. GitHub credentials never enter the coding sandbox or model. The model sees the same approved files and small README/package context as before. Source-derived instructions cannot expand paths, funding, test runtime or publication rights.

An actual read-only check of the selected owner repository at 968626b0baf4ba3add96296b85e6f4e93b5ef7cf checked 946 immutable file identities and assembled 942 safe text files from a 1,915,725-byte ZIP in 2.095 seconds. Four binary or credential-bearing files were omitted. No raw archive was written, inference sent, sandbox started or PR published. See [measured archive evidence](../../infra/repository-archive-evidence.json). This timing measures the complete trusted read-only probe and does not promise cloud execution latency.

Tests cover altered bytes/sizes, traversal in excluded entries, mixed roots, binary approved paths, redirect restrictions, credential separation, bounded downloads and executable-mode shell quoting. Paid/provider balance, execution cancellation, checks and PR acceptance remain separate work.
