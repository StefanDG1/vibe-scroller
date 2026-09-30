# Test your Instagram library privately

Mode: how-to. Checked September 30, 2026. The owner requires OpenAI models and accepts a laptop-assisted personal test with local OpenAI Whisper and eligible ChatGPT-plan reasoning. Do not interpret the saved ChatGPT preference as an active funding route or run managed analysis as a substitute.

## What can be tested now

The deployed development app supports mobile sign-in, URL capture, a normalized CSV/JSON link import and library review. It does not offer a working Instagram-account connection or automatic Saved synchronization. Imported links wait for permitted media or supplied text; saving is not analysis.

The separate Windows utility passed actual owner ChatGPT consent, model discovery and text inference. It is not connected to browser jobs and cannot decode or transcribe videos. Hosted activation is false. No phone-only, subscription-funded video-analysis journey has passed.

## Test a few links on your phone

1. Open https://vibescroller-staging.danistefangheorghiu.workers.dev/app in Chrome or Safari. This is development staging; the selected production domain is not configured. Sign in with the same Google/email identity used for VibeScroller. Instagram login is separate.
2. In Instagram, open a Saved Reel and copy its link through the sharing menu.
3. In VibeScroller, choose **Add source**, **Video URL**, add its title/link and confirm permitted submission, then save. Repeat with three to five examples, including one unavailable source if possible.
4. Check the library state. Do not approve managed analysis for this OpenAI-only test. That currently uses the configured Cloudflare route, not your ChatGPT subscription. The preference checkbox does not change that fact.

The free staging Worker previously returned resource-limit errors. Later focused page checks passed, but reliable capacity is not established. Report an unavailable host as a failure rather than repeatedly retrying a write.

## Prepare your Saved export

[Meta places information export in Accounts Center](https://about.fb.com/news/2023/10/manage-your-information-across-apps/). It is [rolling out the Meta Account name](https://about.fb.com/news/2026/04/meta-account/), so labels can differ.

In Instagram's profile/settings menu, open Accounts Center or Meta Account, then **Your information and permissions** and **Export your information** or **Download your information**. Choose your Instagram profile and export to your device. If category selection is offered, choose only Saved. Choose all time and JSON. Download when Meta makes the export available.

Keep the archive local. Use only saved-post/collection files, not messages, contacts or login records. This is a request for saved metadata; do not assume it supplies creator video files or contains every historical/deleted/shared-collection item. Inspect the actual export and compare counts.

The current app accepts a JSON array of objects with `url` and optional `title`, `collection`, `saved_at`, or equivalent CSV. Dates must be UTC ISO strings. It does not directly accept Meta's archive ZIP or nested native export format. Convert only the relevant metadata before import. A native-export adapter remains implementation work; providing the saved files locally allows its mapping to be verified against your actual export rather than guessed.

Import limits are 500 rows and 140 KB per file, plus the workspace's source allowance and rate limits. A manifest reports duplicates, invalid/unsupported rows and waiting records. Some waiting rows may not have been saved because the allowance was reached; inspect accepted counts. Begin with a small sample before splitting the full library into batches. No import promises automatic media access or analysis of every saved video.

## Use your plan for the currently supported text test

Your earlier consent already succeeded. On the connected Windows computer, from the repository, use `pnpm chatgpt:local status` and `pnpm chatgpt:local models`. Reconnect only if required; do not send tokens or codes to the app or support.

For a supplied transcript that you may process, run:

```powershell
pnpm chatgpt:local summarize OBSERVED_MODEL private/transcript.txt private/transcript-summary.json
```

Replace the example paths with a private transcript and a new output file. The command uses only the selected account's available OpenAI model and refuses alternate funding. It is a desktop utility; its output is not automatically attached to the phone library. See [local setup](chatgpt-local.md). A transcript summary is not full audiovisual analysis.

## What is needed for the requested complete workflow

[OpenAI's current preview](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations) accepts supported text/image inputs but excludes raw audio/video and transcription. Logging in cannot remove that limit. The [deployment overview](https://developers.openai.com/siwc/token-sharing-open-source) directs paid/remotely hosted apps to the commercial interest process; no commercial access is recorded for VibeScroller.

A possible OpenAI-only local design is permitted media acquisition, isolated non-AI decoding, local [OpenAI Whisper](https://github.com/openai/whisper) transcription, and transcript/sampled-frame reasoning through an eligible model on the user's ChatGPT plan. Whisper would use the computer's resources, not ChatGPT allowance. This design is not implemented end to end. Supplied captions/transcripts can avoid ASR, but must be labeled accurately. If every AI stage must use ChatGPT allowance, the current protocol cannot supply the required transcription stage.

The owner accepted keeping the Windows computer on while testing from the phone. This establishes the desired personal-test architecture, not a completed bridge, commercial permission, unlimited usage or an exception to isolation. A later hosted release still needs the complete browser-usable hosted option.

Remaining implementation includes the native export adapter, device/browser pairing for inference, source-bound approved jobs/results, image-input support, compatible transcription, provenance, revocation/limit tests and a real phone journey. Local credentials must stay on the trusted computer. No model or paid funding fallback is authorized for this personal test.

## Release owner actions

- Provide the saved-only export locally and a few videos/transcripts you may process for the real test. Do not provide Instagram passwords/session cookies.
- Confirm an eligible production hosting arrangement or an approved spend cap. Existing inspected accounts had no eligible paid host; no purchase is authorized. Final subdomain HTTPS and callbacks still need verification.
- For a hosted ChatGPT-plan offering, pursue OpenAI's official commercial access process. Local test consent is not that approval.
- Ask the accountant for the remaining applicable tax/invoice confirmation in [the operator checklist](operator-tax-and-publication.md). Identity papers are already supplied. Confirm Oblio series and RO e-Factura responsibility.
- Complete the [legal publication checklist](../../legal/POLICY-IMPLEMENTATION.md) and active provider agreements before paid launch.

Engineering still owes the integration above, reliable hosted workload checks, the benchmark, restore/deletion and tenant/security acceptance, full approved coding/PR cases and a production smoke test. These are not tasks solved by asking the owner to log in again. Use [implementation status](../implementation-status.md), [release gates](../LAUNCH-CHECKLIST.md) and [deployment instructions](vibescroller-deployment.md) for evidence. Physical Android testing was previously deferred; the current request begins a personal phone test rather than retroactively marking it passed.
