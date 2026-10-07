# Resume encrypted evidence backups in bounded parts

Mode: reference. Decision October 7, 2026. Status: implemented candidate; actual full-object and serving recovery acceptance pending.

The retained production snapshot contains more JPEG bytes than the existing 200 MB batch can accept. Preserve that batch and restoration contract. The new operator path finishes one part at a time, choosing 190 MB while enforcing the same 200 MB upper bound and 1 MB per object. One checkpoint traverses at most 10,000 distinct objects, 1,000 cursors and 50 parts. It does not authorize additional inference, a bigger provider budget, temporary-media retention or a serving cutover.

An AES-256-GCM checkpoint binds source deployment, exact producing code commit, original inventory time, part limit, cursors, pending bounded metadata and archive counts. It expires seven days after the original time without renewal. Explicit resume rejects a different deployment/commit, wrong key, modified metadata or expiry. Pending records are whitelisted; no signed read URL, storage credential, prompt or provider secret enters the checkpoint.

Archive writes remain exclusive. An interrupted write can be reused only after authenticating and hashing the existing archive against the freshly authorized current inventory record. Current deletion, generation and expiry checks surround every read. Backup verification grants no restoration authority: restoration still requires the locked separate destination, newest deletion markers, current records and read-back hashes. A missing prior archive prevents a complete report.

The production read-only script atomically persists sealed checkpoints and stops after twenty minutes with an explicit incomplete failure. Scheduled artifacts upload even after failure so successful encrypted work can be resumed privately. Cross-run automatic artifact retrieval is not claimed. The operator supplies the original inventory time and exact checkpoint/files under the same code commit. No production mutation or runtime credential export is added.

Affected tests cover multiple parts, a crash after archive write before checkpoint, no duplicate download/overwrite, changed identity/key/expiry, tampered existing bytes, deletion races, repeated cursors and unchanged size limits. Existing locked restoration tests remain mandatory. Full retained-object backup, independent scheduled resumption and interrupted serving restoration require separate actual evidence.
