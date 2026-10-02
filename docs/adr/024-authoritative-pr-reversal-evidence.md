# ADR 024: authoritative PR reversal evidence

Status: accepted. Date: October 2, 2026.

A merged PR stays a historical merge. Record a subsequent verified reversal separately; do not turn a merge into a closure or infer business benefit from either outcome.

Manual refresh, scheduled reconciliation and authenticated webhook reconciliation use one GitHub observation adapter. Original PR access errors become access_lost. Reversal inspection errors retain the authoritative merge and expose an incomplete check.

Bound reversal discovery to the selected branch's twenty newest commits since the merge, with at most three candidate commits. An exact Git revert message identifies a candidate only. Verification requires matching original and candidate changed paths and exact opposite immutable blob identities and file modes across their four GitHub trees. Refuse partial reversals, unrelated changed paths, intervening changes, symlinks, oversized changes and truncated trees. Store the original merge SHA, reversal SHA, same-repository commit URL and observation time. Do not claim this detects every manual, partial, old or rewritten reversal.

Backend projection validates the proof's repository and historical merge. Later access loss preserves previous verified history. An unchanged branch head avoids repeated tree inspection. An already verified reversal remains historical evidence even if later commits reapply the change; it does not establish the current content or measured benefit.

Completed runs expose their PR status and report without another publish or cancel action. Only an awaiting-review patch can be authorized for publication. Failed approved checks remain visible before review; publication does not imply all checks passed. Viewer and busy states disable unavailable actions.

Tests cover immutable tree comparison, candidate-message insufficiency, bounded inspection, preserved merge history, foreign-repository proof refusal and reconciliation caching. Production lifecycle acceptance is recorded separately in the implementation record.
