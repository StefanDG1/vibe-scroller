# Test the optional local ChatGPT connection

Mode: how-to. This is a Windows local text-inference utility. The separate owner personal dispatcher is verified; commercial hosted ChatGPT inference is not enabled. Check [ADR 009](../adr/009-chatgpt-plan-protocol.md) before offering it commercially.

Actual owner consent, model discovery and a completed GPT-5.6-Luna verification response passed on September 30, 2026. Earlier inference attempts failed before the response-header fix. This covers local text inference, not browser dispatch, coding isolation or commercial permission.

Use Node 24 with the repository's frozen lockfile. Your existing eligible ChatGPT account is sufficient for a consent/inference test; you do not need a new ChatGPT account or an API key. OAuth approval must happen in the official browser consent screen. Do not send tokens or codes to support.

```powershell
pnpm install --frozen-lockfile
pnpm chatgpt:local connect
pnpm chatgpt:local status
pnpm chatgpt:local models
pnpm chatgpt:local verify
```

`connect` opens the system browser and waits for the loopback callback. Choose your account/workspace and review plan-usage permission. `status` shows safe connection metadata. `models` lists the active account's discovered models. `verify` performs one small real request and reports completion metadata, without printing tokens. It consumes your permitted plan allowance. A model list alone is not a passed inference test.

To summarize a local text file, pass an observed model slug and a new private output filename:

```powershell
pnpm chatgpt:local summarize OBSERVED_MODEL private-transcript.txt private-summary.json
```

The utility cannot decode a video, transcribe audio, inspect repositories, approve a plan, run code or publish a PR. Summary output is AI generated and must be reviewed. Keep private transcripts/outputs outside the repository or in ignored storage. It refuses to overwrite an existing output. Use only content you have rights to process.

Add another account with `connect` without a profile argument. Use `status` to find a saved profile ID, `select PROFILE_ID` to switch, and `connect PROFILE_ID` to reconnect that exact registration. `disconnect` clears the active profile's tokens and attempts remote revocation, while retaining its registration. If remote revocation is unconfirmed, disconnect the app through [ChatGPT Settings → Usage](https://chatgpt.com/settings/usage).

Storage lives under `%LOCALAPPDATA%/VibeScroller/ChatGPT`. Session data is encrypted by Windows DPAPI for the current OS user and replaced atomically. Other processes cannot concurrently rotate credentials through this adapter. A crash may leave `session.lock`; close all adapter processes, verify no request is still running, then remove only that empty lock directory to reconnect. Do not delete `session.dpapi` as a routine retry or attempt to reuse uncertain refresh tokens.

The adapter intentionally provides no hosted token export or untrusted-code environment injection. The gated [personal dispatcher](personal-analysis-runner.md) implements device, app-user, profile-binding, generation and approved-funding checks. Its separate owner production video route passed on October 2: isolated preparation, automatic offline Whisper transcription, sampled-frame reasoning and saved cited insights. See [the personal video guide](../PERSONAL-VIDEO-GUIDE.md) for that complete route and its limits. This CLI utility alone remains text-focused; neither result activates hosted commercial access or local coding.
