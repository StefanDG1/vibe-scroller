# Capture and media processing

Mode: reference.

## Supported entry points

V1 accepts a pasted source URL, an uploaded video, a supported audio file with optional images, a text transcript labeled as supplied text, a bulk list of links, and a Telegram message containing a link. Android sharing is progressive enhancement over the same capture endpoint.

A user can create a saved-link record even when processing cannot proceed. Such a record is not counted as an analyzed video. A source imported as text has no implied audio or visual coverage.

Accept CSV with a `url` column and optional `title`, `collection`, and `saved_at` columns. Accept JSON arrays of equivalent objects. Validate row count, encoding, dates, and URLs before creating records. Initial batch size is 500 links, queued under workspace limits. Show an import manifest with accepted, duplicate, invalid, unsupported, and waiting entries.

Instagram and TikTok URLs use platform-specific normalization. Strip tracking parameters without discarding identifiers needed to access the source. Expand supported short links through the safe fetcher. A supplied URL is not authority to fetch arbitrary internal addresses.

## Source access policy

Use yt-dlp only for technically supported and permitted content. Do not bypass paywalls, DRM, CAPTCHA, authentication challenges, or explicit access restrictions. Do not ask customers to paste Instagram session cookies into the hosted application.

An automated Instagram adapter based on Instaloader can be evaluated in a separate experimental local integration. Its existence does not establish permission or complete synchronization. Keep it disabled until access, rights, reliability, and revocation behavior pass a documented review. Sources S22 and S23 describe capabilities, not legal clearance.

TikTok portability is a separate gated importer. Use only the approved scope that actually includes the desired saved-video links. Discard unrelated archive content as soon as possible. Do not retain direct messages, contacts, or other personal fields merely because a full export included them. Sources S29 and S30 explain the relevant API.

Record the acquisition basis as `user_upload`, `authorized_connection`, or `permitted_public_fetch`. A user attestation does not override a provider block or establish ownership of someone else's video.

## Pipeline stages

1. Validate the capture request, quota, source type, and access policy.
2. Normalize its identifier and check for an authorized same-workspace result.
3. Estimate processing cost and reserve credits under the user's auto-analysis policy.
4. Acquire the media into a private temporary object.
5. Probe the actual format, duration, stream count, and decoded resource limits in a sandbox.
6. Extract normalized audio and select timestamped frames.
7. Transcribe and analyze visual evidence through the selected permitted providers.
8. Produce structured insights, coverage, uncertainty, and source references.
9. Commit the result, reconcile cost, and schedule temporary-media deletion.
10. Retrieve plausible project candidates and create bounded matching jobs.

Stage output includes an artifact hash and pipeline version. Restart from the latest valid stage rather than downloading and transcribing again after an unrelated matching failure.

## Resource limits

Initial accepted maximum is 250 MB and 10 minutes per source. Restrict decoded dimensions, frame count, audio length, subprocess time, and temporary disk usage independently. Reject media with pathological streams or invalid metadata. The acquisition step has byte and elapsed-time limits even when the server omits Content-Length.

Use a prebuilt sandbox image with pinned yt-dlp, FFmpeg, and PySceneDetect versions. Record its digest. Disable unnecessary network access during decoding. Delete the sandbox and its temporary files at completion or deadline.

Do not invoke a shell with a concatenated URL or filename. Pass argument arrays and isolate all paths under the job directory. Do not follow uploaded symlinks. Do not extract arbitrary archives as media.

## Audio

The hosted baseline uses a supported OpenAI transcription API. The local optional route uses faster-whisper. Start local quality evaluation with `large-v3`; choose quantization or a smaller model only after measuring the actual device. Do not assume the laptop's GPU can run ASR and a large visual model together.

Long or oversized audio is split at bounded intervals with overlap. Preserve segment offsets and deduplicate overlap. Do not call a text correction model a transcription model.

Store original transcription, corrected display text, word or segment timing, model identifier, language, and uncertainty. Technical terms can be corrected from visible evidence or a confirmed repository glossary. Retain the correction and its basis. Never silently replace unclear speech with a plausible package name.

An uncertain transcript can still produce a draft summary, but execution proposals dependent on uncertain details need verification. The UI must expose this state.

## Visual evidence

Use scene boundaries, periodic sampling, and additional samples around visual activity. For a short clip, begin with a target of up to 24 selected frames. Cap the initial total at 120. Dense code or rapid UI changes trigger a bounded second pass if the user authorizes its quote.

Deduplicate near-identical frames and preserve timestamps. A scene detector alone can miss changing text within a fixed editor view. Include periodic samples even when no cut occurs.

Use a vision-capable model to describe relevant visible evidence. OCR can be an optional focused tool for an unreadable region, not a substitute for whole-video reasoning or an automatic claim that all text is correct. Do not execute displayed commands.

Record what the model observed separately from its interpretation. "The button label changes to Continue" is an observation. "This probably improves conversion" is a hypothesis.

## Analysis output

Each source gets a concise summary and zero or more distinct insights. Each insight contains a claim, context, evidence references, uncertainty, category, and verification needs. Summaries preserve criticism, qualifications, satire, and conflicting claims where detected.

Categories begin with coding, AI, video editing, sales, business operations, marketing, product design, and general advice. Users can edit tags. Multi-label classification is allowed. Do not force unrelated content into a business category.

A source can be valuable as reference without generating a project action. Missing or weak evidence must lower confidence rather than inflate usefulness to justify processing.

## Telegram

Pair a numeric Telegram user ID to a workspace through a single-use browser-confirmed token. Expire it after 10 minutes. Do not trust a username or forwarded message as identity.

Verify the webhook secret header, deduplicate update IDs, and rate-limit linked users. Acknowledge receipt with a safe source status and a link to the web app. Messages do not authorize code execution or payment. Direct the user to the authenticated web approval screen.

Telegram is not an end-to-end encrypted storage vault. Avoid sending source transcripts, private repository code, credentials, or detailed billing data through it. Users can disconnect it without deleting their library.

## Testing and licence record

Test permitted owned clips, invalid links, private posts, removed posts, short-link loops, spoofed media, duplicate imports, large batches, and interrupted stages. Record import completeness separately from transcription quality.

Keep a dependency inventory with source licences and distributed binary obligations. Do not assume a downloader or FFmpeg binary inherits the application's MIT licence. The application must not redistribute creator media as part of its source repository.
