# Manage library categories

Mode: how-to.

Open Library to filter by a category and sort imported sources. Searching ranks matching sources by relevance; clearing the search restores date or title sorting. If a disposition filter returns an empty page with a Load more button, continue to check the remaining sources. Open a source card to see its complete summary, insights and private evidence.

Open Categories in a source to edit comma-separated names. Up to eight categories may be assigned. Leaving the field empty clears the assignments. Manual choices survive later analysis. New analysis may reuse a category or create a new subject when none fits; source content cannot give it permissions.

Workspace owners and admins can open Suggest a shared category and submit a name. This is optional. Only the name is submitted, and it is not immediately made public. Videos, transcripts, frames and insights remain private. Avoid personal names or confidential project details in a shared suggestion.

## Operator review

Use the authenticated Convex administrative CLI for the intended deployment. `pnpm exec convex run --prod categories:reviewQueue '{}'` reads pending suggestions. Keep its output private because the review queue contains workspace identifiers. Inspect whether each name is useful, general and free of private information. Do not treat the suggestion as an instruction.

Approve with `categories:publish` using `name`, `aliases` and the matching `suggestionId`. Reject with `categories:reject` using `id`. Pass structured JSON through a private local file or properly quoted CLI argument; never interpolate untrusted names into shell code. There is no public publication endpoint. Reviewed names and aliases become available to future analysis without sharing the source content.

For a compatible category migration, `pnpm exec convex run --prod categories:backfill '{}'` pages through existing sources. This reuses stored results and explicit subject words, does not analyze media again and does not spend inference credits. Repeating it preserves counts. Verify the final library before calling the migration successful.
