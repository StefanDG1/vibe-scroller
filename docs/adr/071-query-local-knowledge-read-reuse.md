# ADR 071: Reuse knowledge document reads within a query

Mode: reference. Status: accepted. Date: October 6, 2026.

## Context

Real production issue and evaluation pages exceeded Convex's 16 MiB read limit as drafts accumulated. A 30-row page repeatedly loaded the same large repository snapshots and source records while checking current evidence. Production logs recorded 16,783,660 bytes for `issues:list` and 16,787,971 bytes for `knowledge:evaluations` before failure. Reducing page size would leave the same duplication and make navigation harder.

## Decision

Both list queries use a document-read context scoped to that invocation. Identical `db.get` calls share their promise, including absent documents. Other database operations retain their normal receiver and behavior. The context is restricted to read-only queries and is never shared between requests, workspaces or mutations.

Authorization, source rights, generation and revision checks, repository and profile versions, manual topic bindings, redaction and pagination remain intact. Every new request obtains a new Convex snapshot and a new read map. No provider, budget, storage or deployment policy changes.

## Validation

Regression tests cover repeated large reads, concurrent context separation, complete pages, pagination, foreign workspace denial, profile changes and source deletion between requests. The production failure remains recorded; successful production verification must be recorded separately after deployment. See the implementation status ledger for exact commands and results.
