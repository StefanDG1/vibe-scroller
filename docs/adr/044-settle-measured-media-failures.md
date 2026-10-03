# Settle measured media failures

Status: accepted. Date: October 3, 2026.

## Problem

The corrected owned quality batch produced twelve ready analyses and three failures. One was a provider error and two failed output validation. The media action retained its full service reservation whenever inference had started, even when the broker had already measured and settled that request. Those holds contributed to the unchanged monthly trial ceiling refusing the next five-source transaction. The historical failures and unknown holds remain recorded; this correction does not retroactively assume their cost.

## Decision

After validating and settling broker usage, report it to the enclosing media action before parsing speech, frame or insight output. The action accumulates each measured stage exactly once. A subsequent validation or incomplete-output failure settles compute plus that confirmed aggregate. A missing, mismatched or interrupted response remains held. Do not retry a failed generation or switch funding automatically.

Keep strict timestamp, frame identifier, output and source-evidence validation. Include the actual probed duration explicitly in the speech instruction. Schema-path diagnostics contain only bounded paths and error codes, never speech, output values or pixels. Increment the media pipeline version so cached extraction cannot masquerade as the corrected pipeline.

## Validation

Ten focused provider/settlement tests passed in outputs/media-measured-settlement-focused.log. Six tests in outputs/media-failure-transaction-focused.log additionally include the actual media action and service-ledger transaction: measured malformed output settles two synthetic credits and releases the unused hold; an unknown response retains all ten credits. Neither test accepts invalid output or retries inference.

The first complete check hit two five-second test timeouts during parallel execution. Both unchanged tests passed the focused retest, and pnpm check passed the complete rerun in outputs/media-measured-settlement-full-retest.log with 310 application tests, three explicit external skips, eleven authentication tests, six PCM tests, three proxy tests, three frame-boundary tests, five build-policy tests, lint/types and both builds. The two additional transaction tests were added afterward and passed separately; final CI must include them.

## Limits

No provider reservation, historical service hold or trial ceiling is cleared merely to finish the benchmark. A valid cost receipt is distinct from a valid analysis. Actual post-deployment media observations and the complete quality dataset remain separate acceptance work.
