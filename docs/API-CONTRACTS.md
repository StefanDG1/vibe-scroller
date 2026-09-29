# Interface contracts

Mode: reference. These are proposed application interfaces, not existing provider endpoints.

## Public and authenticated HTTP boundaries

| Route | Method | Authentication | Contract |
| --- | --- | --- | --- |
| `/api/capture` | POST | App session and CSRF protection | URL or uploaded object reference, workspace selection, idempotency key |
| `/share` | GET or POST | Login before committing an import | Receive share text, show confirmation, then call capture |
| `/api/uploads/grant` | POST | App session | Bounded media type/size grant to a private object key |
| `/api/uploads/complete` | POST | App session | Verify object metadata and fingerprint before workflow start |
| `/api/webhooks/github` | POST | Verified GitHub signature | Persist receipt, acknowledge, process asynchronously |
| `/api/webhooks/stripe` | POST | Verified Stripe signature | Reject wrong mode or account before entitlement changes |
| `/api/webhooks/telegram` | POST | Secret webhook header and linked user | Deduplicate update ID, store capture request |
| `/api/runner/pair/start` | POST | Device challenge, rate-limited | Create short-lived untrusted pairing request |
| `/api/runner/pair/approve` | POST | Browser session and reauthentication | Bind exact device key and named workspace |
| `/api/runner/lease` | POST | Narrow device credential | Claim one authorized job compatible with capabilities |
| `/api/runner/events` | POST | Device credential, current lease | Bounded redacted events with sequence numbers |
| `/api/runner/artifacts` | POST | Current job capability | Grant upload for approved artifact type and maximum size |
| `/api/runner/complete` | POST | Current lease and artifact digest | Validate result and move to patch review |
| `/api/health` | GET | Public minimal output | Service availability only, no secrets or internal configuration |

A GET request cannot import, approve, bill, delete, or execute work. The GET share receiver only populates an uncommitted draft. Login callbacks must prevent open redirects and bind the intended draft to the current session.

## Application backend functions

Use Convex queries for `library.list`, `sources.detail`, `dashboard.overview`, `proposals.detail`, `runs.detail`, and `usage.current`. Use mutations for `capture.create`, `proposal.decide`, `plan.edit`, `execution.approve`, `run.cancel`, `connection.revoke`, and `source.delete`.

Every function checks identity, workspace membership, role, object ownership, and current state. Write functions accept expected version numbers for optimistic concurrency. The frontend cannot supply an arbitrary new billing tier or an approval's trusted cost.

Return typed errors with a stable `code`, safe `message`, `retryable`, and optional `nextAction`. Codes include `AUTH_REQUIRED`, `FORBIDDEN`, `SOURCE_UNAVAILABLE`, `UPLOAD_REQUIRED`, `UNSUPPORTED_SOURCE`, `INSUFFICIENT_CREDITS`, `RUNNER_OFFLINE`, `APPROVAL_STALE`, `BASE_CHANGED`, `RATE_LIMITED`, `POLICY_BLOCKED`, and `PROVIDER_ERROR`.

## Model contracts

`contracts/insight.schema.json` defines the extraction output. `contracts/proposal.schema.json` defines project-specific reasoning. `contracts/runner-job.schema.json` defines an approved execution envelope. Schemas reject extra fields. Server code validates evidence references, repository file references, and permissions separately. Schema validity is not proof of truth.

The provider adapter exposes `capabilities`, `estimate`, `analyze`, `plan`, `cancel`, and `usage`. It returns provider model IDs, prompt version, output hash, and actual usage. Model aliases resolve to a pinned compatible version in the provider registry.

## Repository and PR contracts

A repository snapshot contains provider repository ID, commit SHA, selected branch, file manifest, exclusions, and profile version. Source repository names are display fields, not the authorization identity.

A patch result contains base SHA, diff digest, changed paths, test commands/results, dependency changes, risk flags, and limitations. The publisher independently validates that changed paths are permitted and that the base SHA still satisfies policy.

The publisher uses a stable branch such as `vibescroller/<run-id>`. A PR body contains the run ID, proposal version, source attribution links approved for publication, verification results, and rollback notes. Private source evidence is omitted from a public PR unless explicitly authorized.

## Idempotency and limits

All mutation requests that can create cost or external effects have a client request ID scoped to the workspace and operation. Same key plus different payload returns a conflict. The service stores request hashes and completed results for at least the relevant job retry window.

Limit inbound JSON to 256 KB except specifically designed artifact endpoints. Limit an event batch to 100 events and each redacted event to 8 KB. Raw transcripts and logs use bounded private artifacts, not unrestricted event payloads.

Webhook handlers retain raw bodies only long enough to verify signatures and persist minimal necessary evidence. They reject oversized requests and do not fetch URLs embedded in a webhook without independent validation.

## Streaming

The browser receives bounded progress through authenticated Convex subscriptions. The runner sends ordered progress batches over outbound HTTPS. App-server transport stays local over stdio. The app does not expose Codex's local socket to the internet.

A reconnect reads the authoritative run state and events after a cursor. Duplicate events are ignored. Event delivery is not permission to execute a command.
