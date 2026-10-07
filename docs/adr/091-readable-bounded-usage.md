# Readable bounded Usage

Mode: reference. Decision October 7, 2026. Status: implementation candidate; production acceptance follows separately.

An owner-authorized ten-credit fit assessment refused before inference because only four credits were available. The existing Usage surface displayed raw ledger JSON and a fixed legacy trial sentence. Those records did not clearly distinguish available allowance from unresolved holds.

Usage now shows actual available and reserved credits, a supplementary labeled native meter with its visible allowance range, the next available allowance expiry and up to ten recent settled service-credit entries. Dates explicitly use UTC. Missing or invalid allowance data remains unavailable. No default allowance, invoice settlement or automatic paid conversion is invented.

Availability excludes expired, spent, reserved and revoked credits. Unresolved reservations remain visible, including holds in expired pools. The advisory execution-quote helper now excludes revoked credits consistently with existing authoritative reservation behavior. Reservation, reconciliation, purchase, funding and execution authority are unchanged. Permission to prepare work cannot create allowance or release a hold.

The authenticated Usage loader calls only the existing organization-details and product-usage queries. It returns a safe projection without raw source, repository, reservation or ledger identifiers. The existing product-usage query still reads its indexed pools, wallet and bounded recent ledger pages. This is a request and serialization change, not proof of reduced database I/O or provider billing. No schema, index or backend deployment is needed.

The existing charcoal studio, typography, tokens and mobile navigation remain. Native numeric balances lead; the meter supplements them without a chart library, animation or additional request. Billing remains a separate review link, with no purchase action on Usage.

Affected tests are the allowance projection, revoked-credit advisory calculation and authenticated workspace-route tests. They cover expiry, revoked allowance, retained expired holds, bounded recent coverage, safe serialization, the two-query slice and foreign-workspace denial. Genuine staging viewport review at 390, 1440 and 1567 CSS pixels and a fresh design reviewer cover the changed surface only. Exact commands, failures, commit, production comparison and remaining external gates belong in implementation status.

## October 7 exact bounded Usage release

PR 76 production main d8407a951a3e passed exact CI/release, canonical health/version and fixed Basic queued settings. Matched Usage returned 1,014 versus 436,367 decoded bytes, with actual four available/ten reserved credits and no raw ledger/private identifiers. This is serialization/transfer acceptance only. Backend and financial authority remain unchanged; implementation status and the coarse evidence receipt record exact timestamps and retained external gates.
