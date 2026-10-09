# ADR 097: Stable mobile Library navigation

Status: accepted owner direction, October 9, 2026. Implementation and release evidence are separate.

The owner rejected the shipped mobile layout with five phone screenshots. This decision supersedes the category-pair cap, automatic deepest-branch opening, detached evidence and mascot shell in ADRs 095-096.

## Decision

Keep Tree/Folders and Personal/Business switches together in a fixed toolbar. Display one filing root in Tree. Filing changes organization only and grants no access. Category rows show every returned sibling in its original order, with horizontal scrolling when needed. Selection does not reorder or scroll a card. Opening a category shows only its immediate children. Folders use the same saved hierarchy and expand only the chosen path.

Keep navigation mounted when evidence arrives. Reset evidence independently when its topic, generation or revision changes. Scope and workspace changes still reset private state. Pointer branch switching closes the old branch before opening the next; keyboard and reduced-motion selection are immediate. Closed content is inert. Motion starts no inference and adds no polling.

Both views use vertical insight rows. A row expands its full unchanged claim, source link and any exact recorded proposal inside that row. Read project connections only after an actual insight click; reuse the existing bounded current-topic cache and source-reference filter. No connection is fabricated or treated as coding approval.

Use the favicon artwork as the app logo, linking to Home. Remove the Home mascot and mobile top account control. Keep the same five bottom actions on every page. Bottom Account opens the existing menu, preserving every destination. Show the authenticated user's HTTPS OAuth profile picture when available, falling back to the first-name initial. Do not fetch another user's profile or store credentials.

## Verification

Require the emulated layout viewport to equal its requested width, in addition to checking overflow. Verify toolbar and bottom-navigation geometry across representation, filing and page changes. Preserve the reproduced production failure: requested390 yielded actual846 for Folders on the preceding deployed commit. Phone screenshots outrank earlier desktop-emulation claims. Native browser interaction, exact CI and canonical deployment results are recorded separately. Physical-device motion quality and independent comprehension remain unverified without their actual evidence.

No API-token categorization, model calls, financial hold releases, new permissions or backend table scans are part of this UI change. Fixed Basic queued Vercel builds and the cumulative EUR2 limit remain unchanged.
