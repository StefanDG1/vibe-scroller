# System architecture

Mode: explanation. The implementation paths below are proposed paths for the new repository.

## Keep the interface in the browser

The browser owns navigation, capture, review, approvals, account settings, and progress display. It does not own long-running downloads or coding execution. Closing a tab must not lose a committed job.

A single Next.js application contains public marketing routes and authenticated application routes. Reuse CompanyNerve's exported components and tested boundaries. Consolidating its separate marketing and starter apps into one deployment is a deliberate cost-saving change. Preserve their authentication, SEO, billing, and export behavior in regression tests.

The optional runner is a small execution service, not a second product interface. A phone can approve a job for the user's paired laptop. The laptop must already be online and paired. A browser cannot silently launch processes on a remote computer.

## Components

| Component          | Selected implementation                                 | Responsibility                                                                      |
| ------------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Web application    | Next.js App Router, TypeScript, shadcn-style components | Public site, authenticated UI, callbacks, lightweight authenticated endpoints       |
| Identity           | WorkOS AuthKit                                          | Email-code and Google sign-in, sessions, identity lifecycle                         |
| Application data   | Convex                                                  | Workspace data, authorization, reactive queries, indexes, vector retrieval, budgets |
| Durable jobs       | Convex workflow component plus outbox records           | Stage orchestration, retries, waits, lease recovery                                 |
| Private objects    | R2 bucket with explicit EU jurisdiction                 | Temporary media, evidence frames, exports, approved patch artifacts                 |
| Cloud worker       | Vercel Sandbox ephemeral microVM, persistence disabled  | Bounded media preparation and approved cloud coding                                 |
| Local runner       | Node.js service using Codex app-server over stdio       | Paired, user-approved local coding; optional local media processing                 |
| Media tools        | yt-dlp, FFmpeg, PySceneDetect                           | Supported URL retrieval, audio extraction, timestamped frame selection              |
| Local ASR          | faster-whisper                                          | Optional local transcription on supported hardware                                  |
| Managed ASR        | OpenAI transcription API                                | Hosted transcription without a mandatory local GPU                                  |
| Reasoning          | Provider adapter, initial text/image model              | Insights, project matching, planning, and review                                    |
| Repository access  | GitHub App and Octokit                                  | Selected repositories, snapshots, branches, PRs, events                             |
| Repository context | Repomix plus explicit filtering                         | Bounded, commit-aware code context                                                  |
| Billing            | Stripe Billing and Checkout                             | Subscriptions, portal, invoices, refunds, lifecycle events                          |
| Notifications      | In-app records, Resend adapter, Telegram bot            | Optional delivery without making chat the source of truth                           |

Provider facts and limitations are recorded in [Sources](SOURCES.md), especially S01, S04, S10, S16, S19, and S20. Selection does not imply that a complete integration already exists.

## Proposed repository layout

```text
apps/web/                 Next.js site and application
packages/ui/              Shared accessible components and tokens
packages/contracts/       Runtime schemas and generated types
packages/policy/          Authorization, budgets, risk, and allowed operations
packages/providers/       AI, GitHub, storage, billing, and notification adapters
packages/runner/          Optional local Node.js runner
packages/media/           Media worker and extraction manifest
packages/evaluation/      Rights-cleared evaluation harness
convex/                   Schema, queries, mutations, actions, workflow definitions
infra/                    Host profiles and sandbox build recipes
prompts/                  Versioned model instructions
legal/                    Reviewed policy source and publication metadata
```

The implementation agent must inspect the export before moving code. These paths may require a documented mapping to the actual exported layout. Do not reimplement secure base functionality merely to fit this tree.

## Data flow

```text
Browser or Telegram
  -> authenticated capture request
  -> transaction: deduplicate and reserve budget
  -> durable source-processing workflow
  -> private object upload or permitted URL download
  -> sandbox: decode audio and select frames
  -> provider broker: transcription and visual reasoning
  -> transaction: commit evidence, insights, and actual cost
  -> retrieve plausible project matches
  -> proposal versions
  -> explicit plan and execution approval
  -> local runner or funded cloud sandbox
  -> validated patch and test report
  -> trusted GitHub publisher
  -> draft PR
  -> webhook plus reconciliation
  -> dashboard and user outcome feedback
```

Model output never directly calls GitHub, billing, or account-management APIs. A policy layer validates the requested operation and approval first.

## Backend boundaries

Convex mutations enforce membership, status transitions, idempotency, and cost reservations. Queries return bounded, tenant-scoped projections. Actions call external providers but must not be the only authorization check before an irreversible side effect.

Use an outbox to connect a committed state transition to a retriable external call. The outbox item has an idempotency key, attempt count, next attempt time, and last error. Mark external completion using the provider's stable identifier. Exactly-once transport is not assumed.

Limit each action's input and output. Large media never travels through the Next.js request body or a Convex document. Issue short-lived upload grants and validate the completed object before scheduling decoding.

A budget reservation is an atomic ledger operation. The available balance subtracts both settled usage and active reservations. A retry uses the existing reservation or obtains an explicit additional reservation. Two concurrent requests cannot both spend the same balance.

## Infrastructure cost policy

The default supported host is Vercel. A new commercial Vercel plan cannot fit the founder's EUR 10 ceiling because Pro begins at USD 20. An existing eligible paid plan can have lower incremental cost, but its allocated expense stays in the business model. Sources S13 and S14 establish this distinction.

Provide a separately tested Cloudflare Workers/OpenNext profile for the pre-customer budget. It keeps the application stack but changes its web runtime. Do not rent an always-on GPU. Cloud workers start for bounded jobs and terminate afterward.

Use the same application contracts on both host profiles. Avoid host-specific queue or storage assumptions inside business logic. Vercel-compatible deployment remains a required build target even when the budget profile runs first.

The owner's existing laptop can process the owner's content during development. It must not become an undocumented production worker for other customers.

## Regions and credentials

Choose an EU storage jurisdiction explicitly. Do not advertise EU-only processing unless each active provider contract and deployment guarantees it. Provider inference, authentication, telemetry, and coding execution can have separate processing locations.

The web layer and trusted provider broker can access their own narrow secrets. A media sandbox receives only its job artifact grants. A coding sandbox receives a bounded code snapshot and provider capability, not the GitHub App private key or payment credentials.

Store BYO API credentials with authenticated encryption and key rotation. Keep master keys in the host's managed secret store. Store only ciphertext and key version in application data. Prefer an existing reviewed secret service when its cost is justified, but do not add paid WorkOS products implicitly.

## Reliability

A job has a lease, attempt number, and fencing generation. Only the current generation may commit a result. A late runner cannot publish after a newer attempt or cancellation takes ownership.

Provider rate limits move a job to a retryable wait. Authentication failures request reconnection. Budget failures wait for a user decision. Content unavailability is a source result, not an internal crash.

Reconciliation repairs missed GitHub and Stripe events. It does not overwrite newer authoritative data with an older cached response. Every external state projection records its observed time and source identifier.
