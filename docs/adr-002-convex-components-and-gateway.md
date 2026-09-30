# Convex components and hosted inference

Date: 2026-09-30. State: accepted for implementation, provider activation remains conditional.

The operator requested a free hosted model through Convex where possible, deferred the OpenAI managed API key, and authorized compatible dependency updates. The existing Convex team has Starter access. A real deployment-scoped gateway model-list request succeeded. No provider API key was created.

Use the official gateway HTTP API with `getServiceToken("ai-gateway")` from `convex/server`. The exported Convex 1.45 already supports cloud tokens; update both backend and frontend to pinned 1.46 for current local-deployment support. This preserves the selected stack. Tokens stay inside actions and never enter application tables, browser responses, or sandboxes.

VibeScroller service allowance credits can fund a selected hosted gateway route. A gateway does not turn a third-party ChatGPT subscription into hosted API rights. Each customer's optional local Codex subscription session remains on their paired computer through official app-server.

## Components selected

| Component | Decision | Product boundary |
| --- | --- | --- |
| Rate Limiter 0.4.0 | Installed, capture uses a transactional per-account token bucket | Rate limiting supplements the transactional credit ledger; it never grants budget |
| Resend 0.2.8 | Installed for opt-in generic progress mail and signed delivery events | Exponential Education sender, owner preference, no transcript/code/title in email; real delivery requires configured sender |
| Workpool | Used internally by Resend | Durable delivery and retry do not authorize coding or inference |
| Workflow | Useful for a future refactor of stage orchestration | Existing generation fences and reservations must survive; never retry an uncertain paid submission automatically |
| R2 | Evaluated; keep the existing private object adapter for this implementation | Any adoption must retain workspace checks, short-lived private URLs, EU endpoint, deletion receipts and retention |
| Migrations | Useful when a live schema migration becomes necessary | Do not add a migration runtime before there is a migration to run |
| Aggregate | Useful for larger activity/outcome datasets | Counts must keep accepted plans, merged PRs and measured benefits distinct |
| RAG | Defer until repository retrieval evaluation warrants embeddings | Tenant-scoped namespaces and deletion propagation would be mandatory; V1 does not need global memory |
| Agent | Not required for bounded schema output | Model memory and tool loops cannot replace explicit approval and trusted execution |
| Action Retrier | Use only for demonstrably idempotent side effects | A timeout is not proof that a provider charged nothing or a PR was not created |

Added component peer dependencies accept the pinned Convex, React, Zod and TypeScript versions. `convex-helpers` 0.1.124 is pinned alongside the components. The original handoff and initial lockfile remain preserved in Git.

## Free model evaluation

The gateway catalogue exposes free model IDs, but discovery is not a quality or privacy test. The first Liquid diagnostic returned cost zero and no usable content at a 150-token bound. A second request with an unsupported reasoning control returned HTTP 400. Both used only explicitly synthetic content. Liquid's published endpoint terms permit training on prompts, and Poolside's free endpoint has a similar warning. Neither is enabled for private customer material based on a free price alone.

The adapter rechecks zero prompt/completion pricing before sending, requires structured response support, rejects incomplete responses, requires reported zero cost, and has no paid-model fallback. `privateDataApproved` must be backed by reviewed model/provider processing terms before activation. Production evaluation must cover real source grounding and repository relevance.

Sources: [gateway setup](https://docs.convex.dev/ai-gateway/setup), [access](https://docs.convex.dev/ai-gateway/overview), [billing](https://docs.convex.dev/ai-gateway/usage-and-billing), [component catalogue](https://www.convex.dev/components), [Rate Limiter](https://github.com/get-convex/rate-limiter), [Resend](https://github.com/get-convex/resend), [Liquid endpoint](https://openrouter.ai/liquid/lfm-2.5-2.6b:free), [Poolside endpoint](https://openrouter.ai/poolside/laguna-xs-2.1:free).
