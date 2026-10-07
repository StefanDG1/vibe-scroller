# Keep assistant judgments versioned and separate from measured outcomes

Mode: reference. Decision October 7, 2026. Status: implementation candidate.

The evolution plan requires explicit feedback without treating a save, dismissal or assistant inference as user approval. Reuse the existing feedback table for `record_feedback`, with an implemented `feedback:write` OAuth scope and app grant. The registered client must separately permit this scope. Existing public-PKCE preparation has five scopes; it does not enable this new permission or establish host acceptance.

The tool records only the explicitly requested useful, not-relevant, already-implemented, unsafe/unsupported or later judgment. It requires exact current granted source generation/revision, the reviewed grant version, a stable actor/client key and expected feedback version. Lost-response replay returns the same receipt. Corrections append a version and preserve previous judgments. A key cannot move to another source. Stale writers fail before recording anything.

Use `benefit=not_measured`. Do not create measured outcomes, rewrite canonical analysis, alter manual quality reviews, infer preferences, reserve credits or publish anything. Existing workspace/account feedback export and retention boundaries remain authoritative. Credentials in notes are rejected. The tool has the same ordinary Connect identity exclusion, private scope, current membership, write role, expiry, revocation, restore lock and HTTP provider checks as the existing assistant adapter.

Affected checks are actual Convex handler replay/correction/stale/revoked/scope tests, actual SDK schema and scope dispatch tests, existing authentication and both production builds. Real OAuth scope review, host invocation and judgment comprehension remain acceptance gates. Persistent Events and project suggestions are separate work.
