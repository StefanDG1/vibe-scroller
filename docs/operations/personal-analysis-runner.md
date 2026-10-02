# Use the personal analysis runner

This route is a restricted personal alpha. It analyzes permitted videos, selected frames and supplied text through your own connected ChatGPT plan. Local Whisper automatically transcribes audio after isolated decoding. Supported public links use the bounded acquisition worker; private, blocked and unsupported posts can require a permitted-media fallback. No paid inference fallback is used. Coding requires separate approval and verified isolation. See [the video guide](../PERSONAL-VIDEO-GUIDE.md) for the current automatic route.

## Prepare the laptop

Use Node 24 and the repository's pinned pnpm version. Sign in with `pnpm chatgpt:local connect`, review OpenAI consent, and check `pnpm chatgpt:local models`. Choose an actual available model. GPT-6.1 Sol was absent from the owner's tested catalogue; GPT-5.6 Sol supported the tested image request.

Copy [the runner configuration](../../packages/runner/config.example.json) to an ignored private local file. Set `server` to the dedicated environment's HTTPS `*.convex.site` origin, `workspaceId` to your app workspace, and `deviceName` to your computer's name. Keep `credentialVaultAdapter` as `windows-credential-manager`. Do not put OpenAI credentials in this file. Isolation fields do not activate coding for this separate text route.

Run `node packages/runner/pair.mjs C:\absolute\private\config.json`. In the app's Computers screen, paste the public request, compare the fingerprint and confirm. A fresh app sign-in is required. The device credential remains in Windows Credential Manager.

The operator must activate only the verified owner's WorkOS subject through `PERSONAL_ALPHA_SUBJECTS_JSON` in the matching Convex environment. Do not copy a staging subject into production or use an email address as a substitute. Leave this gate empty for customer access until its provider eligibility is verified.

Run `pnpm runner:personal C:\absolute\private\config.json`. Keep the computer awake. The runner uses outbound HTTPS; no inbound port or browser access to a local socket is needed. Stop it with Ctrl+C. The runner writes neither prompts nor model output to its console.

## Approve from your phone or laptop

1. Sign in and use Add source to submit a supported public link, import a reviewed Saved export, or choose the permitted-media fallback. Select automatic personal analysis and review its rights and own-plan consent.
2. Open the source. Under Use your ChatGPT plan, select your online computer and an available account model.
3. Check the own-plan permission and approve the personal analysis. The interface selects medium reasoning. Reauthenticate if requested.
4. Wait for the source summary. Review the main points, transcript, private frames and coverage. Frames are sampled; supplied post text alone does not establish audio or visual coverage.
5. Cancel from the source screen or revoke the computer if needed. Started work may still count against OpenAI's allowance. Check the official plan usage screen before retrying an uncertain request.

Approval expires after 15 minutes if unclaimed. The runner never switches to another model, API key or another user's account. Platform storage and future cloud decoding have their own allowances. This personal route does not replace the normal hosted product's metered cloud option.

The [owner testing guide](owner-testing-guide.md) records which production and video tests remain. Do not treat successful unit tests or the standalone Whisper sample as completion of those tests.
