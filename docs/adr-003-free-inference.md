# ADR 003: Explicit free inference during staging

The operator requested no OpenAI API key and no purchases. Convex AI Gateway model discovery works, but Qwen free calls returned provider HTTP 429. Liquid did not return a usable complete result. These are recorded failures, not successful analysis.

The existing Cloudflare account showed Workers Free as its current plan on 2026-09-30. A new VibeScroller staging token has only Workers AI Edit on that account. A synthetic Llama 3.3 70B structured-output request passed with a complete JSON response and measured neurons. This uses Cloudflare-hosted inference, without an OpenAI account credential.

`MANAGED_INFERENCE_ROUTE` selects one explicit adapter. There is no automatic provider or paid-model fallback. The Cloudflare free route requires a current operator plan verification, expires that evidence after 24 hours, and conservatively reserves at most 5,000 neurons per UTC day for this product. Provider failures keep the inference reservation until usage is reconciled. Customer credit reservations and the EUR 2 trial / EUR 10 overall monthly exposure ceilings remain separate.

Provider references checked during implementation:

- [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/): 10,000 free neurons per day. Workers Free fails beyond its allowance and requires a deliberate paid-plan upgrade for paid usage.
- [Workers AI data usage](https://developers.cloudflare.com/workers-ai/platform/data-usage/): no use of customer content for model training or service improvement without explicit consent.
- [Llama model and parameters](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/).

These checks do not constitute legal review, a DPA review, production tax approval or an inference-quality acceptance test. Production requires the subprocessor list, model licence and applicable transfer safeguards to be reviewed and published. A future provider change must update evidence and pass the same structured-output, privacy and cost checks.

Convex components selected so far are the rate limiter and Resend with its workpool dependency. Their compatibility was checked against Convex 1.46.0. Workflow, aggregate and agent components were considered, but are not required to replace the existing approval, fenced execution and credit ledger. Adding another component requires a concrete lifecycle or query need.
