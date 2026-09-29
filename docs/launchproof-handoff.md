# LaunchProof integration handoff

Updated 2026-09-12. This record covers the optional CompanyNerve template integration only. The pre-existing `docs/status.md` is preserved byte-for-byte.

## Compatibility patch 0.1.1

Implemented on 2026-09-12: bumped both integration contracts to `0.1.1`, accepting exactly runner `0.1.0` or `0.1.1`. Check adapter `companynerve-v1` remains `0.1.0`. Both `server.ts` files remain unchanged. Explicit integration config pins `adapterVersion: "0.1.1"`; the environment loader selects it automatically.

Tested: reproduced the current-runner rejection in both contracts before fixing it. All 27 LaunchProof integration tests and all 19 CompanyNerve integration tests then passed. Added cases verify legacy/current acceptance, unknown/prerelease runner rejection, and rejection of check-adapter `0.1.1`. Existing integration flows now exercise runner `0.1.1` and verify emitted integration version `0.1.1`. Updated source hashes are in the [adapter README](../packages/launchproof-integration/README.md).

Deployed for this patch: none. Externally verified for this patch: none. No build, browser/provider operation, commit, or push. Main owns the real hosted upload and summary verification. The earlier implementation and build/export evidence below predates this compatibility patch.

## Implemented

- Copied only the released `server.ts` and `contract.ts` into `packages/launchproof-integration`, unchanged at adapter version `0.1.0`.
- Added the server-only wrapper, streamed workspace dashboard status panel, and owner/admin setup route at `/app/[org]/launch-checks`.
- Added placeholder server environment variables, connection and disconnection instructions, contract limits, and synthetic integration/export tests.
- Kept authentication, Convex business logic, billing, and data export routes unchanged. No additional dependency, provider setting, cookie, identity link, payment, or paid plan.

## Tested

Local checks passed:

- `pnpm exec vitest run tests/launchproof.test.ts tests/template-export.test.ts tests/backend.test.ts`: 24 tests passed. These cover enabled synthetic summaries, disabled operation, actual backend membership removal during fetch, owner/admin/member isolation, token revocation, outages, timeout, redirects, malformed/oversized responses, deployment mismatch, cache authorization, disconnect, and existing billing/export boundaries.
- Root `pnpm exec tsc --noEmit`, starter typecheck, and `pnpm --filter @companynerve/starter build` passed. The build includes the new setup route. No LaunchProof build was run.
- A fresh export under ignored `work/launchproof-fresh-Gz0hXM/product` installed with `pnpm install --frozen-lockfile --offline --ignore-scripts`, passed the same 24 tests and root TypeScript check, and built the starter without local env files or credentials. The export process received synthetic enabled/token variables; exported examples still defaulted off and contained no inherited token.
- `node scripts/validate.mjs` validated 37 documents and 12 unchanged skill snapshots. `git diff --check` passed. A local scan of changed/untracked deliverables found no matches for configured secret values.
- Both adapter file hashes match the released bytes listed in their README. `docs/status.md` retains SHA-256 `7cecd7b57acf20684c06859793c2b16a33f4e0f6b15c6b2eeea19c8682361b52`, identical to the initial read.

The integration tests use synthetic HTTP responses and the actual CompanyNerve backend through `convex-test`; they are not hosted-service or browser evidence. The fresh install used cached packages with lifecycle scripts disabled. Marketing was not changed or rebuilt for this integration.

## Review paths

- [Released adapter](../packages/launchproof-integration/README.md)
- [Server wrapper](../apps/starter/lib/launchproof.ts)
- [Status panel](../apps/starter/components/launch-checks.tsx)
- [Setup route](../apps/starter/app/app/%5Borg%5D/launch-checks/page.tsx)
- [Environment examples](../apps/starter/.env.example)
- [Integration tests](../tests/launchproof.test.ts) and [export tests](../tests/template-export.test.ts)

The organization dashboard and sidebar import the optional components. The starter TypeScript config permits the released module's `.ts` imports; a test-only declaration lets the root checker resolve Next.js's server-only marker. Next.js still enforces that marker at build time.

## Deployed

Not deployed. No commit, push, provider operation, or browser action was performed for this integration.

## Externally verified

Not externally verified. Main owns staging connection, private report sign-in, layout inspection, deployment identity review, remote token revocation, and production release verification.

## Limits and next action

The mapping covers one target organization per starter deployment. Each request owns its adapter and discards the token reference and cache afterward. Owner/admin membership is rechecked through the existing backend before and after fetch. Environment changes require restart across all instances. Disconnect cannot erase a report already rendered in a browser.

The summary is a customer-run claim. It does not certify a deployment, independently verify identity, or establish execution time. The latest retained upload can be for a different target environment or become older after deletion. See [contract and limits](launchproof-contract.md) and [setup](operations/launchproof.md).

Main can review these CompanyNerve changes, then configure an explicitly approved synthetic staging mapping with a `reports:read-summary` token. Keep all target JWTs local or in customer CI. Do not expose the private LaunchProof repository or its documents through the public template.

## Main release verification, 12 September 2026

Integration revision dbeac55df7ab0238abda2d161370ce4976b40efb passed all 30 tests, typechecks, both builds and GitHub CI 34691605399. Vercel application deployment dpl_GFD4mfoqFCt6PWmSyFHWbApnqyid and marketing deployment dpl_FqQZDv8nrr47PE88miFCdWddqPNg reached READY with the expected production aliases.

The copied adapter 0.1.1 read an actual runner 0.1.1 report through the local LaunchProof production Next build and real staging backends. Its membership callback queried CompanyNerve staging before and after retrieval. The report contained three passing scoped checks. Missing commit/deployment identity remained comparison_unsupported. A summary-only token received 403 for the full report; after revocation the adapter returned unavailable. This was an explicit disposable staging mapping, not a permanent production connection. All created staging organizations, identities and sandbox subscriptions/customers were cleaned up. Production integration remains optional and default-off.

The pre-existing uncommitted docs/status.md remains unchanged. This publication note supersedes the worker's earlier not-deployed status above.

## Shared template authentication correction

A later production check in LaunchProof exposed an inherited anonymous private-page redirect bug in AuthKit 4.3.1: withAuth with ensureSignedIn attempted to write PKCE cookies during Server Component rendering. Both repositories now enable private-route proxy authentication and route any missing server-render session through the local sign-in handler. Sign-in, sign-up and callback paths remain exempt from proxy enforcement to avoid loops. No new identity sharing or parent-domain cookie is introduced. Ten tests execute the real installed proxy with synthetic configuration and check redirects, callback pass-through, invalid sessions, prefetched requests and the server-render fallback. The CompanyNerve suite now passes 40 tests and both builds.
