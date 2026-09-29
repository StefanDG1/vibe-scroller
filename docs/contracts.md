# Runtime contracts

The source of truth is `convex/schema.ts` and `packages/company-config/index.ts`. This document describes the shipped starter, not a future extension engine.

## Company configuration

`defineCompany` validates schemaVersion 1, a product slug/name/description, one of five recipe IDs, the owner/admin/member role tuple, and Free/Pro project limits between 1 and 100. The default limits are 3 and 100. Configuration has no provider keys or price IDs. Entitlement checks are backend logic; the separate `invariants` list points to behavioral tests and is not automatic proof.

## Identity and tenancy

WorkOS owns identity. Convex owns organizations, current memberships, and invitations. A verified WorkOS subject is resolved to a verified email through the WorkOS API before profile synchronization. Deleting users cannot bootstrap again while their deletion is pending.

Every organization operation checks the authenticated user, current membership, organization lifecycle, and required role. Record-by-ID operations also verify the record's organization. Removing membership denies the next database operation, including requests with an existing identity token. There is no WorkOS organization projection or eventual membership propagation window.

Owners manage roles, billing, exports, and organization deletion. Admins manage projects and invite members. Members read projects. Owners may invite admins. Invitations are bound to a verified email, store a token hash, expire after seven days, and are consumed once. The UI provides a shareable link; no invitation email is sent. A workspace supports at most 50 members and a user at most ten organizations. Final-owner removal and account deletion without ownership transfer are rejected.

## Data and deletion

Tables include users, organizations, memberships, projects, invitations, billing, processed billing events, audit records, rate limits, and identity-deletion jobs. Internal Convex IDs are organization keys; there is no WorkOS organization ID requirement.

Organization export contains that organization's name and project data. Account export contains profile and membership information. Organization deletion requires a matching name and no active billing obligation, locks access immediately, and purges organization-owned tables in batches. Account deletion requires a matching email and no sole ownership; it removes memberships and schedules WorkOS deletion with five attempts. Failed jobs remain for an operator to inspect. Organization audit references and authored content are not automatically erased by an individual account deletion. See [operations](operations/deployment.md).

## Billing

Stripe is authoritative. Convex stores one projection per organization. Only active/trialing state with an unexpired paid period and verification within 24 hours grants Pro access. Hourly reconciliation and owner-triggered refresh recover missed events. Each customer refresh reserves a revision; an older completion cannot overwrite a newer applied revision.

The HTTP handler verifies Stripe's raw-body signature and test/live mode. Supported events refresh current Stripe state rather than trusting event payloads. Event IDs are deduplicated. Checkout return parameters grant no access. Checkout/customer creation uses idempotency keys, and pending subscriptions lead to the portal rather than another purchase.

The sample paid feature is a project report and a higher project quota. CompanyNerve itself is free and has no live checkout.

## Future integrations

No adapter runtime, central evidence warehouse, connector credential vault, or autonomous action engine is included. A later integration must identify its released version, compatible template versions, required permissions, environment separation, setup/disconnect behavior, and verification evidence. It must fail safely when disabled. See [future products](future-products.md).
