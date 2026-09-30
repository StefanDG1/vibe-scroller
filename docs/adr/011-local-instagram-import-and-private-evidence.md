# Local Instagram import and retained private evidence

Mode: reference. Decision date October 1, 2026.

## Decision

Process Instagram archives on the selecting device. Read the ZIP central directory and inflate only recognized Saved JSON or HTML metadata. Prefer JSON, normalize known fields, preview before submission and send bounded batches of source links. Do not upload or retain the full archive, messages, contacts or unrelated exported media. A Saved link is not proof of video availability or complete export history.

The owner permits local temporary storage for personal testing and private cloud storage for paid accounts. Retain useful sampled screenshots or crops when they support analysis or a later handoff. Use R2 objects and Convex metadata rather than storing image bytes in ordinary database documents. Preserve source identity, time, extraction method and crop provenance; enforce existing tenant, retention, quota and deletion boundaries. This is authorized implementation scope, not evidence that the complete retained-image integration is finished.

Keep categories, search and relevance rankings grounded in the analysis and selected project context. A model cannot gain permissions from a saved post or screenshot. Conversational retrieval must cite private sources and respect the same access checks when implemented.

## Current evidence and limits

The actual owner archive produced four links, including three Reels and one post with unverified media type. Local mobile-width browser import saved all four with zero analysis credits and a 1,103-byte normalized request. Unrelated archive files were not uploaded. A copied archive and raw extracted Saved data were removed; a minimal local link record and archive hash remain ignored. The user's original download remains untouched.

Synthetic tests cover JSON variants, HTML without resource execution, ZIP path/compression/size/CRC boundaries and bounded batches. An actual owner HTML export has not been tested. ZIP64 and multidisk archives are refused with an extracted-Saved-file alternative.

The independently authored local ChatGPT adapter now accepts bounded inline JPEG/PNG frames and explicit supported reasoning effort. A real synthetic-image request through the owner's plan passed. Browser dispatch, video transcription and the full source-bound local analysis journey remain incomplete. No hosted commercial permission or automatic funding fallback follows from this test.

## Affected checks

`tests/instagram-import.test.ts`, `tests/imports.test.ts` and `tests/chatgpt-local.test.ts` cover the new boundaries. Production-domain import, physical phone testing, retained-image deletion, local transcription and browser/device job reconciliation still need integration evidence.
