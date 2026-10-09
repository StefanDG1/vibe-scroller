# ADR 100: Lazy library browsing and choice-free branches

Status: accepted owner direction, October 9, 2026.

## Decision

In Tree and Folders, follow each returned category with exactly one child until a leaf or a fork. A topic with its own insights and a child is also a choice. Do not open individual insights automatically. Preserve explicit collapse, sequential close/open motion, keyboard access, reduced motion and scoped location restoration. This supersedes the blanket no-deepest-branch rule in ADR097/098 only for choice-free paths. Paths remain limited to twelve levels; missing parents and legacy cycles never grant access.

Load the next bounded topic batch when its sentinel approaches the viewport. One initial visibility attempt is allowed; subsequent batches require a new wheel, touch-browse or navigation-key gesture. A cursor change alone cannot drain pages, including empty filtered batches. Duplicate cursor attempts are fenced. Failed reads clear the view and offer explicit Retry loading library. Keep a manual accessible fallback. No hidden-tab paging, per-node backend request, inference, grant or background scan is introduced.

Retain the metadata already returned by bounded server pages, including ancestors, and preserve sibling order when appending. This replaces the forty-node client eviction policy; server pages, permission checks and twelve-level paths remain bounded. Focus/scope/search revalidation resets the metadata view to current authorized results. Every evidence/proposal read still checks server authority and exact citations. Loading more categories reuses the open evidence instead of repeating its detail read.

Show five insights initially and reveal five more at a time. Further evidence pages append current returned members through an explicit disabled-while-loading action. A fresh selection/revalidation resets the evidence component; appending a page preserves its position. Use react-loading-skeleton3.5.0, MIT, for Library metadata, insight and proposal placeholders, honoring app and system motion preferences. The source-evidence navigation uses the shared outline Button with link semantics.

Show open proposals only in Library, with a notification number bubble on the right of insight cards and category nodes. Closed, rejected and merged records remain in Projects. Deleted records, stale evaluations and mismatched source/insight revisions stay excluded. Count distinct proposal IDs across cited insights and descendant categories, never sum overlapping child counts.

Read one indexed five-proposal page alongside a topic browse batch. Resolve exact current publications and current bound run observations. Match memberships through a new exact-reference index, with twenty membership matches and twelve ancestors per reference. Proof is incomplete when a cap, unknown lifecycle state or malformed hierarchy prevents a total. Suppress numeric bubbles until all permitted proposal pages are loaded and complete; a partial page is not a total. Additional proposal pages share the visibility/gesture gate with topic pages, with no per-card reads or background drain. Focus/scope/search revalidation clears the prior proof. Totals describe the current authorized records at those bounded reads; they do not predict later provider changes.

The public demo includes multiple open proposals and closed/merged records with matching read-only full-proposal/source routes, clearly labeled synthetic. Fixed citations keep category totals consistent across navigation. No inference, provider polling or backend writes start from this view.

## Verification

Test chain endpoints, forks, direct evidence choices, cycles, path limits, accumulated metadata and stable sibling order. Test cursor gates and exact open-proposal totals, lifecycle exclusions and permission isolation. Inspect native Tree/Folder actions, five-row reveal, source button navigation, full demo proposals, loading and reduced-motion states at mobile/desktop widths. Record local, emulated browser and production evidence separately. Physical-phone motion and real historical-proposal acceptance require their own evidence.
