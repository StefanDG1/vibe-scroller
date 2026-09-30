# ChatGPT plugin scope and publication

Mode: reference. Research checked 30 September 2026. No plugin has been submitted, approved or published.

The current [official plugin quickstart](https://developers.openai.com/plugins/build/app-quickstart) supports MCP tools and optional embedded UI. The directory can distribute packages to ChatGPT and Codex. This provides another interface to VibeScroller, not automatic commercial authorization to spend a user's ChatGPT allowance through the hosted application.

## A useful first scope

Expose capture of a permitted URL or supplied text, library search, retrieval of a selected source's summary/main points and proposal/PR status. Return concise structured records and links to VibeScroller for private evidence and review. Every private operation must recheck the linked user's current workspace membership. Keep model instructions and source text outside permission decisions.

A ChatGPT conversation can help users interpret information already returned by the tool. Explicitly distinguish that host's conversation inference from VibeScroller's background media processing, transcription and coding costs. The plugin cannot promise that ChatGPT will fetch a restricted video or fund those backend jobs.

Keep plan acceptance, coding execution and draft-PR publication in the existing reviewed website flows for the first adapter. Do not expose merge/deploy tools. A tool request or a model's interpretation is not an execution approval. If capture becomes a write tool, declare its mutating behavior and require the user's intended action; do not silently auto-analyze using credits.

## Required implementation

Use an HTTPS MCP resource server with narrow tools and bounded pagination/results. Connect to the existing WorkOS identity through an OAuth 2.1 authorization boundary with PKCE, protected-resource discovery and resource-bound access tokens. WorkOS browser-session cookies alone are not suitable MCP bearer tokens. Validate issuer, audience/resource, expiry, scopes and actor identity for every call; retain server-side membership checks even after consent. Do not use an OpenAI plan token to authenticate to Convex or assume a ChatGPT email matches an app account.

The [official authentication guide](https://developers.openai.com/plugins/build/auth) specifies discovery, scope handling, callbacks and client registration. Implement the exact currently documented callback and issuer-identification behavior, not an invented generic callback. Register narrow read/capture scopes, revocation and unlinking independently of the user's WorkOS account and VibeScroller subscription.

Add protocol tests, foreign-tenant/foreign-source tests, prompt-injection cases, resource/audience mismatch tests, revoked/expired tokens, idempotent capture, pagination/output bounds and safe UI deep links. Then run real ChatGPT developer-mode linking against labeled sample content. No such acceptance test has passed yet.

## Publication gates

The [official submission guide](https://developers.openai.com/plugins/deploy/submission) requires publisher identity, an accessible verified domain, packaged metadata, automated checks and review. Prepare the plugin ZIP without secrets. Marketplace approval is external and must not be claimed by this implementation task.

Private MCP submissions need review access: a dedicated VibeScroller sample-data account plus positive/negative scenarios and a walkthrough. This is different from the owner's ChatGPT account used to test SIWC consent. Never give reviewers the owner's ChatGPT credentials or real private library. Configure an appropriate dedicated reviewer authentication path without weakening ordinary production authentication.

Current blockers are the domain/hosting release decision, implemented MCP OAuth/resource server, developer-mode end-to-end verification, reviewed policy/data disclosure and verified publisher/reviewer setup. This optional interface can follow the web V1; it must not replace completing the core browser workflow or bypass hosted funding approval. See [ADR 009](../adr/009-chatgpt-plan-protocol.md).
