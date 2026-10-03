# Score retained quality cases

Mode: how-to. P01 uses retained outputs before spending on another collection. Existing owner approval of 23 examples remains qualitative. No assistant assigns the required human scores.

Run `node scripts/prepare-quality-review.ts private/path/evaluation-input.json private/path/new-review-folder` from the repository root. Both paths must stay inside ignored `private/`. The command validates rights/mappings, hashes the exact input and writes a new packet without overwriting an earlier review. All human fields start null. Keep transcripts, frames, source references and identities private; publish only permitted aggregates.

The October 3 packet at `private/post-v1-20261003/reviewer/review-packet.json` covers 41 retained cases and both repository profiles. Its freeze hashes 166 retained files. The original split put eight first-set cases in development while their variants were held out. Collection-driven fixes also prevent an untouched attestation. The conservative audit groups twenty synthetic scenarios and one licensed human scenario, marking all 41 development. This supports annotation and error discovery, not a new comparative accuracy claim.

## Apply the rubric

For every case record the actual reviewer and UTC review time. Inspect original permitted media, reference speech, transcript, selected frames, main points and the two repository references. A pipeline-produced transcript is not its own human reference.

| Field                                | Human judgment                                                                                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main points and supported points     | Count each distinct point once. Faithful correspondence to speech/frame evidence counts as source support; it does not prove the creator's claim true |
| Supported inference                  | Mark interpretation explicitly and explain its evidence; do not silently relabel it as a creator claim                                                |
| Contradictory/invented points        | Record conflicting captions, unsupported assertions and invented APIs/files; mark critical claims separately                                          |
| Timestamp counts                     | Review every candidate timestamp; useful means it leads to relevant readable/hearable evidence                                                        |
| Reference speech and technical names | Correct the human reference with a recorded reason, never to improve a model score; calculate WER and name recall against it                          |
| Repository dispositions              | Inspect each profile/version and expected reference; score useful, no-fit, already-implemented, unsupported or needs-context with rationale           |
| Missing data                         | Leave null and explain absence. Zero is a reviewed count, never a substitute for unknown                                                              |

Human-approved counts feed a new strict evaluation input; preserve original references and corrections. Each reviewed result needs its own reviewer. `scenarioId` groups related variants; `usedForTuning=true` cannot be held out. A new untouched subset requires a frozen timestamp, manifest digest, rights, pinned versions and truthful `untouchedHeldOut` attestation before any tuning. The digest field records provenance; the operator must verify the actual manifest bytes and collection history. The evaluator does not independently authenticate human identity or an attestation.

Run `pnpm benchmark private/path/input.json outputs/new-report.json`. Exit 1 means invalid input/output; exit 2 means incomplete or below-target quality. A complete report needs at least 40 clips, required category coverage and both repository references on reviewed held-out cases, valid grouped provenance and the suggested zero-critical/90-percent support target. Do not alter answers to pass. A scoped failure remains unresolved and informs development plus a new untouched evaluation.

Quality and cost remain separate. `costComplete=false` and null settled cost cannot close P02/AC53, even if quality exits 0. No held-out observations now produce unknown cost rather than a fabricated zero. [The cost runbook](cost-reconciliation.md) covers invoices. Counts, scenario counts, denominators, synthetic predominance and missingness accompany every published claim.
