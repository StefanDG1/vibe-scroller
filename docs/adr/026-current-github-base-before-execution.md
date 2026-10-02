# ADR 026: current GitHub base before execution

Status: accepted. Date: October 2, 2026.

The stored repository snapshot and immutable approval can agree while GitHub's actual branch has changed. A publication-time comparison alone can waste an approved compute budget on a stale task. Local database equality is not proof of the current provider head.

Cloud execution checks the authorized user's current repository metadata, default branch and exact branch head before sandbox creation, then again before isolated checks. A branch or commit mismatch requires refreshed context and a new plan approval. Never silently rebase or substitute another commit. The trusted publisher keeps its independent final comparison and run-marker receipt reconciliation.

Authorization refusal before worker creation and model use uses the known-zero settlement boundary. A later mismatch retains measured/unknown usage until acknowledged teardown and reconciliation. An accepted artifact or completed publication cannot be overwritten by a late failure.

Regression tests verify changed branch, changed SHA, encoded branch names and unsafe repository identifiers. Production stale-base acceptance must separately prove no sandbox start, no model use and unchanged spent credits; a unit test alone is not that evidence.
