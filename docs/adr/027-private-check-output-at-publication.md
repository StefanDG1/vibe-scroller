# ADR 027: private check output at publication

Status: accepted. Date: October 2, 2026.

Raw command output is untrusted and may contain private repository content, source quotations or storage links. Reviewing the generated patch does not authorize copying that output to a GitHub PR body. The prior publisher included up to 4,000 characters of the check report automatically.

Keep detailed check reports in the authenticated workspace. Publish only the exact reviewed file changes, reviewed bounded title, idempotent run marker and fixed workflow text. Do not include source titles, transcripts, evidence links, raw stdout/stderr or reviewer notes in the PR body. The publication control explains which artifacts leave the app. The title validator rejects empty, oversized, control-character and recognized credential-bearing titles before any GitHub request.

Patch review remains mandatory: users must check the exact generated contents before sharing them with their selected repository. This default does not claim that every possible private string can be detected in user-approved source changes. A future source-evidence publication feature requires separate explicit permission and is not implemented by this change.

A publisher boundary test places a synthetic private transcript marker in successful command output and verifies that GitHub receives no marker or raw output. It also verifies title rejection before any provider request. Existing immutable patch binding and receipt-retry behavior remain required.
