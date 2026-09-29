# State machines

Mode: reference. These state names are canonical for the specification.

## Source processing

`received -> validating -> queued -> acquiring -> extracting -> analyzing -> ready`

Alternate terminal or waiting states are `needs_upload`, `needs_auth`, `unsupported`, `unavailable`, `low_confidence`, `budget_paused`, `failed`, `cancelled`, and `deleted`.

`low_confidence` can have a usable partial result. Its `coverage` identifies `full_sampled`, `audio_only`, `visual_only`, `caption_only`, or `metadata_only`. Only `full_sampled` means both a transcript and sampled visual analysis exist. It never means every frame was analyzed.

A retry creates a new attempt under the same processing run or a new explicitly versioned run. It does not create a second source. Failed acquisition must not advance to a fully analyzed state.

## Matching and proposals

A match disposition is `relevant`, `no_fit`, `already_implemented`, `unsupported_claim`, `needs_context`, or `defer`.

A proposal review state is `new`, `reviewing`, `accepted`, `rejected`, `deferred`, `superseded`, or `archived`.

Accepting a proposal can start plan generation under the user's analysis budget policy. It does not authorize code execution. Editing an accepted plan invalidates an approval that references the old hash.

## Execution

`awaiting_approval -> approved -> queued -> waiting_for_runner -> preparing -> running -> checking -> awaiting_patch_review -> publishing -> completed`

A cloud run normally skips `waiting_for_runner`. A local run can stay there while its device is offline. Alternate states are `budget_paused`, `approval_expired`, `auth_required`, `cancel_requested`, `cancelled`, `failed`, and `blocked_by_policy`.

Default execution approval expires after 24 hours if not claimed. The default coding attempt lasts at most 20 minutes, with a separate maximum token budget. A user can authorize a bounded extension. No automatic extension increases a paid ceiling.

`checking` can produce failing tests. Those failures lead to repair within the existing approved budget or to `awaiting_patch_review` with explicit failure status. A successful process exit is not proof that the change is correct.

The default V1 flow requires a final patch review before publication. A user can approve "run checks and publish a draft PR" at execution approval, but cannot authorize merge or production deployment. High-risk changes always require final review.

## PR state

The GitHub projection has `state=open|closed`, `isDraft`, and nullable `mergedAt`. User-facing statuses derive from these fields:

| Condition | Label |
| --- | --- |
| Open and draft | Draft PR |
| Open and not draft | Open PR |
| Closed with mergedAt | Merged |
| Closed without mergedAt | Closed without merge |
| Cannot verify after access loss | Status unavailable |

A merged PR remains a historical merge even when a subsequent PR reverts it. Add a `reverted` outcome with evidence rather than rewriting history. A reopened unmerged PR returns to open. A delayed close event cannot overwrite a newer merged state without authoritative reconciliation.

## Outcomes

`not_measured`, `measurement_planned`, `positive`, `neutral`, `negative`, or `inconclusive` describe benefit. Outcomes require an author or evidence source and an observation date. The app cannot infer `positive` from acceptance, a merge, a green test, or lack of complaints.

## Billing and jobs

Credit reservations are `active`, `settled`, `released`, or `expired`. Settlement and release are mutually exclusive. A partially consumed reservation settles actual usage and releases the remainder in one transaction.

Subscription access derives from a verified provider state and the product's grace policy. Cancellation at period end retains the current paid entitlement until that end. It does not grant a new period. Renewal events and reconciliation converge on one period record.

## Race handling

Each external result carries an operation ID, attempt number, lease generation, and artifact digest. Reject a stale generation. A cancellation records intent before sending a stop command. A revoked runner cannot claim new work. The backend refuses stale results after revocation except for a redacted diagnostic receipt.

A job that created a PR but failed before recording completion must reconcile by its idempotent branch and run marker. It must not open another PR on retry.
