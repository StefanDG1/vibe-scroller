# Recover a workspace backup

Mode: how-to. Locked hosted staging database restoration passed on October 2. A bounded owned evidence-frame recovery also passed. Scheduled independent production backups and bulk recovery acceptance remain incomplete.

The dedicated staging rehearsal encrypts a Convex export with AES-256-GCM, decrypts it offline, validates every document and rejects altered authenticated metadata. It exports the latest deletion markers separately after the snapshot. This verifies archive integrity, not a hosted database import or object-storage recovery.

1. Keep the encrypted export, later encrypted deletion markers and backup encryption key in separately controlled storage. The current local rehearsal is not an independently scheduled production backup.
2. Set `RESTORE_LOCK=true` before importing into a separate recovery deployment. Never import an old snapshot over a serving production deployment.
3. Import the snapshot using the official Convex import command. Confirm deployment identity first. The October 2 rehearsal imported the actual staging export into rare-echidna-358, a separate locked preview with one-day expiry. Production was untouched.
4. Decrypt the latest marker archive privately. Call internal `recovery:applyMarkers` in batches of at most ten markers while the restore lock is enabled. Apply markers recorded after the snapshot too. Deleted sources must stay redacted; deleted workspaces and accounts must stay deleted.
5. Call internal `recovery:quarantinePage` for each supported table until its cursor is exhausted. Remove restored credentials, device pairings and GitHub authorization bindings. Cancel unpublished execution and discard raw repository context. Preserve existing PR receipts and unresolved cost reservations for reconciliation.
6. Check internal `recovery:readiness`. Independently verify source deletion against private object storage, account and tenant isolation, webhook cursors and unresolved provider costs. A readiness result does not prove those external checks.
7. Require users to reconnect credentials and confirm repository context again. Release the restore lock only after the recovery checks pass and the operator chooses the recovered deployment.

`BACKUP_ENCRYPTION_KEY` is a private operator backup key, separate from runtime credential encryption. Never commit it, print decrypted documents or place either key in a public deployment artifact. The rehearsal script deletes its temporary plaintext archives. Encrypted archives still contain sensitive staging data and require restricted access and retention.

Run the current dedicated staging rehearsal with `node --env-file=.env.local scripts/backup-rehearsal.mjs`. Review `infra/backup-rehearsal-evidence.json` for measured scope. R2 object recovery and scheduled independent retention remain release gates. The separate hosted database restore now has evidence below.

The hosted rehearsal restored a pre-deletion synthetic source, applied the newer marker, confirmed redaction, denied private access while locked and quarantined thirteen restored connection/device/repository records. Temporary plaintext was removed. [Hosted recovery evidence](../../infra/hosted-recovery-evidence.json) records the exact scope; it does not certify R2 object recovery or an independent backup schedule.

## Restore selected private evidence

The operator-side `packages/recovery/evidence-backup.mjs` seals a JPEG of at most one million bytes with AES-256-GCM under the independent backup key. Authenticated metadata binds workspace, source generation, original object key, content hash and a restoration deadline of at most seven days. Existing asset expiry still applies. It is not a runtime download endpoint or a complete production backup service.

Before decrypting, supply current records from the locked recovery deployment after applying the latest independent deletion manifest. A deleted workspace/source, retired key, changed generation, foreign asset, expired record, absent deletion lists or unlocked destination is rejected. Never use the archive's old records as evidence that content still exists. Quarantine restored provider credentials before unlocking.

The October 2 real rehearsal exported staging into the locked rare-echidna-358 deployment, encrypted an owned synthetic JPEG, removed its object, recovered it and checked its SHA-256. Private browser access remained denied under the restore lock. A newer source deletion was then applied; recovery refused the earlier frame and the temporary object was physically purged. [Object recovery evidence](../../infra/object-recovery-evidence.json) records the boundary. This does not certify a separate backup storage account, scheduled retention or recovery of all raw media. No serving production database or customer object was overwritten.
