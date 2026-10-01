# Personal analysis on a paired laptop

Status: accepted for a gated personal alpha, 1 October 2026.

The owner wants to approve analysis from a phone and spend their own connected ChatGPT plan on their laptop. WorkOS remains app identity. OpenAI consent and credentials remain in the laptop's existing encrypted local store. General hosted subscription inference stays disabled pending its commercial access gate.

The first connected slice accepts supplied text. A verified WorkOS subject must appear in `PERSONAL_ALPHA_SUBJECTS_JSON`, which defaults to an empty list. This is an operator restriction for personal testing, not an email-based admin assignment or commercial permission. The device must belong to the approving account in the same active workspace. Its available model catalogue must have been reported within 60 seconds. Approval uses fresh authentication, an exact source generation, an exact model, medium reasoning in the UI, and an explicit own-plan choice.

The separate `/runner/personal/v1` endpoint dispatches no shell command, repository script, raw media decoder or coding task. It permits one active source per device. A queued approval expires after 15 minutes. A claimed text task has a three-minute deadline and a 40-second renewable lease. No uncertain model request is automatically retried. Disconnecting a device or removing its workspace access stops further lease renewal. Cancellation and source deletion fence late results. Recovery lock also denies dispatch.

The backend validates the source/run references, coverage, evidence allowlist, secret detection and output size before committing a result. Personal text analysis reserves and settles zero platform inference credits. Actual reported plan tokens are recorded when available; missing usage is unknown. This does not imply unlimited plan usage or free cloud compute. Coding retains its independent isolation and approval requirements.

Approval also binds the exact local ChatGPT profile through an opaque hash. A profile change fences dispatch and completion, and the adapter checks the expected profile before requesting inference. Tokens and provider profile identifiers are not uploaded.

The verified operator may keep up to 1,000 active sources in a workspace they created for this personal alpha. Ordinary trial capture retains its three-source limit. This exception changes neither paid entitlements nor the trial inference wallet, and does not grant other workspace members personal-plan access.

Local Whisper is a separate utility for normalized PCM audio from an isolated decoder. It uses pinned converted OpenAI Whisper weights and offline model loading. Raw customer video decoding, sampled-frame analysis and private evidence retention are not completed by this text slice. The implementation status and owner guide must distinguish those paths.

Validation covers foreign accounts, consent, model selection, stale authentication, disabled access, cancellation, source deletion, device revocation, membership loss, recovery lock, expired leases, fabricated evidence, duplicate completion and zero platform debit. Browser-to-laptop and production tests require actual environment activation and owner sign-in.
