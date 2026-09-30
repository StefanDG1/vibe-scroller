# AI providers and funding routes

Mode: reference.

## Supported modes

| Route                                 | V1 role                                                                    | Funding and limits                                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Managed API                           | Hosted transcription, vision, reasoning, planning, and funded cloud coding | Included processing allowance or prepaid credits                                                             |
| Customer API key                      | Supported reasoning and coding providers                                   | Provider charges the customer; platform compute still has a disclosed cost                                   |
| Official local Codex session          | Approved coding on a paired computer                                       | User's eligible ChatGPT account or local API configuration                                                   |
| Official local ChatGPT-plan protocol  | Optional Windows text-inference utility                                    | Separate account permission and eligible local deployment; real account test and browser dispatch incomplete |
| Optional local inference              | Local ASR and compatible local models                                      | User hardware and electricity; quality and capability checks still apply                                     |
| General hosted ChatGPT-plan inference | Disabled capability gate                                                   | Requires verified official commercial permission and working contract                                        |

WorkOS identifies the application user. OpenAI authorization grants a separate capability. Disconnecting an AI account must not sign the user out of VibeScroller or cancel a platform subscription unexpectedly.

## Initial managed configuration

Use a text-and-image model with structured output support for source analysis and project reasoning. The initial candidate is `gpt-5.4-mini`, selected as an economical baseline rather than declared universally best. Its published standard price at research was USD 0.75 per million input tokens and USD 4.50 per million output tokens. See Sources S07 and S08.

Use `gpt-4o-mini-transcribe` as the initial managed ASR candidate, with an estimated published USD 0.003 per audio minute. Benchmark higher-quality transcription for difficult clips and disclose the increased quote before escalation. Audio and raw video are not passed to a model that only accepts text and images. See S09.

Provider selection is task-specific. The transcription provider can differ from the visual or coding provider. The model registry stores exact model ID, version where available, input types, structured-output support, context limits, rate limits, unit price, data-handling policy reference, and last verified date.

Discover account-available models where an official API supports discovery. Otherwise use a reviewed allowlist. Never offer an invented or unavailable model because its name appeared in conversation. Do not hardcode the implementation agent's marketing name as a production model ID.

## Local Codex

Integrate the official app-server over stdio inside the optional runner. Pin a tested Codex version and generate or validate against its protocol schema. The app-server owns its supported local authentication flow. The product must not scrape OAuth tokens from another desktop application.

The runner can start a new supported session for an approved task. It does not promise to inject a message into an existing Codex desktop conversation. Sources S04 and S05 are the verified integration basis.

A local coding session can send repository context to OpenAI. Describe that data flow before connection. "Runs on your laptop" does not mean "all AI computation stays on your laptop".

## Verified September 2026 protocol and activation gates

The September 2026 [official plan-usage overview](https://developers.openai.com/siwc/token-sharing-open-source) now documents public Responses access for eligible open-source/local apps. Earlier failed page verification is historical, not a current absence claim. WorkOS remains application identity; plan permission is a separate capability. Paid/remotely hosted access remains gated pending official commercial approval. See [ADR 009](adr/009-chatgpt-plan-protocol.md) and [local setup](operations/chatgpt-local.md).

The local protocol adapter is independently authored. OpenAI's DevKit has a noncommercial license and is not included. Direct Responses preview does not support raw audio/video or transcription. The local utility exposes text summary only; browser-connected dispatcher and actual account inference tests are incomplete. A saved funding preference grants neither OAuth consent nor permission to change existing jobs.

A commercial subscription adapter can be activated only after recording permitted deployment type, allowed workload, endpoint, authorization method, token storage rules, model access, rate limits, revocation, and commercial approval if required. Tests must cover revoked and exhausted accounts.

## BYO API credentials

Accept credentials only in a dedicated authenticated settings form. Redact them immediately in the UI. Encrypt them at rest using a managed secret boundary and authenticated encryption. Never include them in browser storage, telemetry, source exports, or normal database query output.

Offer a test connection action with a disclosed small maximum provider charge when testing is not free. Record scopes or capabilities when discoverable. Users can revoke a key and request its deletion. Replace keys atomically and stop jobs that would use a revoked credential.

Keep provider requests in a trusted broker. A sandbox receives a short-lived capability restricted to the job, model set, token ceiling, and endpoint allowlist. It does not receive unrestricted provider credentials unless an explicitly reviewed provider protocol makes that unavoidable, in which case the feature stays gated until a safe route exists.

## Failure and escalation

A provider rate limit queues a retry with bounded exponential backoff and jitter. Authentication expiry requests reconnection. A refusal is displayed as a provider outcome. Insufficient funding pauses the job.

A model escalation, provider fallback, additional visual pass, or new paid search requires a new quote unless it fits a pre-authorized budget and allowed provider list. No route silently consumes a different account's allowance.

Set provider timeouts, output caps, maximum tool calls, and total run budgets. Tool output remains untrusted. Structured-output validation failure can trigger at most two bounded repairs before returning a typed error.

## Data and evaluation

Store provider usage and processing metadata, not hidden chain-of-thought content. Preserve source citations and a concise decision rationale. Use official provider settings such as non-storage options only where supported and verified. Do not claim zero retention merely because a request used a local option name.

Benchmark quality and cost using the same rights-cleared evaluation set before changing defaults. Keep a rollbackable provider configuration version. Changing model aliases cannot silently change existing customer privacy commitments.
