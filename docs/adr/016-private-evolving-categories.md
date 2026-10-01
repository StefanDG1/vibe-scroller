# Keep evolving categories private until review

Status: implemented; production validation recorded separately. Date: 2026-10-01.

The owner needs specific subjects, including music and reading, rather than forcing every saved post into the original coding-oriented categories. Keep the coarse insight categories contract compatible and add optional bounded `topics` names. Personal and hosted analysis receive the reviewed shared vocabulary plus their own workspace's names. A new valid topic creates a workspace category automatically after validated analysis is committed. Invalid labels are ignored without inventing evidence or discarding valid analysis. Existing analyses are backfilled from their original category labels; explicit music and reading words add those subjects without re-running inference.

Materialized source-category links provide indexed category sorting and full-text search. Source joins check the organization. Search uses relevance; the sort selector is disabled while searching. Without search, sort by import date, title, update date or supplied save date before pagination. Sources without a supplied save date use import order within a selected category. Sparse disposition-filter pages preserve the continuation cursor and do not imply the whole library has no match.

Users can edit a source's categories and those manual assignments survive later processing. Workspace categories and counts are private. Deleting a source removes its links and decrements counts. Workspace purge deletes categories, links and submitted suggestions. The reviewed shared vocabulary contains names and aliases, never source IDs, transcripts, frames, repository content or tenant identifiers.

An owner or admin may explicitly submit a category name for review. There is no automatic publication or cross-tenant training. An internal operator API reviews and publishes a matching name; no public mutation can promote it. Suggestions can be rejected. This improves vocabulary reuse across the app without silently exposing customer content.

Tests cover alias normalization, new subjects, invalid labels, tenant access, idempotent suggestions, explicit promotion, manual overrides, indexed sorting across pages and deletion. This does not claim an automatically trained classifier, measured inference speedup or completed public release gates.
