# Retrieve repository evidence for each source

Mode: explanation. Decision: October 2, 2026.

The prefix-only snapshot sometimes omitted the implementation needed to assess a main point. Matching and plan drafting now retrieve bounded contiguous windows from the selected immutable manifest. The source title, claims and interpretations rank file paths; a plan prioritizes its already cited paths. The ranker is deterministic lexical retrieval, not a claim of semantic completeness.

A request reads at most 24 eligible blobs of at most 100 KB each and supplies at most 40,000 characters of excerpts, at most 4,000 per file. Exclusions, regular-file modes, binary and whole-blob secret checks remain mandatory. The Git blob hash is recomputed from the returned bytes. Current repository identity and user authorization are checked before retrieval. Only the recorded manifest supplies blob references; neither source text nor model output can request an arbitrary ref or filesystem path.

Each window retains actual complete line boundaries. Proposal and plan commits validate the internal inspected-context envelope against the current manifest. Existing evidence must fall within an inspected window. Changed repository bases and changed source generations remain stale; execution approval still binds the exact plan and base. Missing or oversized required evidence fails instead of being treated as inspected.

Dynamic raw context lives only in the action request and is not persisted into a proposal or extra cache. Existing bounded structural snapshots keep their current retention. Proposal citations retain the immutable base and line references. The match cache key includes the retrieval version so older prefix-only decisions are not silently reused. Concurrent jobs cannot replace each other's global snapshot with source-specific context.

Tests cover late-file inspection, true line provenance, path/size exclusions, altered blobs, citation ranges, immutable manifest bindings and the absence of persisted raw plan context. An actual staging match and plan attempt are recorded separately; unit tests do not certify recommendation quality or coding isolation.
