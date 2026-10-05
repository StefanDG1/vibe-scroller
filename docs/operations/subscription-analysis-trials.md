# Try personal subscription analysis

This is an operator runbook for the owner-authorized experiment in [ADR 059](../adr/059-personal-subscription-analysis-trials.md). The agent performs setup and import. The owner only reviews account security/consent and the resulting comparison. It is not an unattended full-library pipeline.

## Prepare the laptop

Use the existing Docker Desktop installation. Ask the owner to approve actual Windows or Docker consent prompts. Build only the narrow trusted contexts with `node scripts/build-subscription-images.mjs`; image digests are saved in ignored `private/subscription-images.json`. No credentials or repository-wide Docker build context are included.

Supply an authenticated saved link, source ID, the built media image digest and the canonical repository-private output root in a private request JSON. Run `node scripts/prepare-local-media.mjs private/request.json`. Source URL restrictions, public-network broker, resource limits and offline decoder are reused. A failed transport status is not evidence that the video was understood. No managed processing job or app wallet charge is created.

Only normalized PCM goes to the existing offline `transcribeNormalizedAudio` adapter. For this repository experiment supply `privateDirectory` under the repository's private folder; the installed Python/model paths remain in the private runner configuration. Preserve transcription provenance and warnings. Local files remain private and are not committed or attached to GitHub issues.

## Connect the official local client

Run `node scripts/start-subscription-session.mjs` interactively; do not redirect its login output into a file. It creates an ephemeral isolated official-client session with only an allowlisted OpenAI transport broker. It prints the official verification link and a transient device code. The owner must enable device-code sign-in in ChatGPT Security and login if necessary, review the login and approve it. Never store codes, copy the Windows OAuth cache or approve the account's security controls for the owner. Session credentials remain only in the VM-local temporary mount and disappear with teardown.

The verified session metadata, containing no credentials, is saved in `private/subscription-session.json`. It expires after 30 minutes. Keep the laptop awake for local work. Run the prepared app bundle with `node scripts/run-subscription-trial.mjs private/laptop-trial.json`. The adapter checks the real container, own ChatGPT account, current official-client model/effort and authenticated read/write/network/credential boundary before inference. It rejects rerouting, unexpected tools, invalid evidence and incomplete turns. One attempt per selected post is allowed; there is no paid API retry or fallback.

## Compare in the browser

After the feature is verified and released, the personal account's Library includes “Try your Codex subscription.” Choose one to five posts with prepared text, laptop or cloud, and low or medium depth; approve use of your own allowance. The exported evidence has a 24-hour expiry and exact content hash. Choose “Copy for Codex” for the agent instructions. For cloud, choose a private published environment for `StefanDG1/vibe-scroller`, GPT-6.1 Sol and the same effort. Do not give this task production credentials or publish the private evidence.

Return `{trialId, bundleHash, results}` using the supplied source insight contract. The agent imports the JSON through “Add your agent's result.” Compare the summaries and evidence, and delete trial evidence when finished. Existing source analyses and manual corrections take precedence. A result returned by an agent is user-provided material; schema validation does not independently attest its provider or prove usefulness.

This comparison supplies prepared text only. It does not watch unprovided video frames, perform the 96-link backlog, update knowledge, evaluate repositories or publish issues. Those existing managed stages retain their disclosed costs and approval gates until a separately verified local route is integrated. A Codex subscription covers eligible AI usage within its allowance; laptop electricity/storage, existing hosting costs and optional purchased Codex usage are separate. No extra usage purchase is authorized by this runbook.
