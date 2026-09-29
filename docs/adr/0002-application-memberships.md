# ADR 0002: Keep organization permissions in Convex

Status: accepted for the authorized implementation, 2026-09-11.

WorkOS authenticates users. Convex owns application organizations, invitations, roles, and membership lifecycle. This replaces the proposed WorkOS membership projection in ADR 0001 and the initial contracts draft.

Authorization reads the current membership inside each database transaction. Revocation takes effect on the next backend operation without waiting for an identity-provider webhook. Protecting the final owner, accepting invitations, applying quotas, and writing product records can share the same atomic boundary.

WorkOS tokens identify the person, not the active organization. The client supplies an organization ID and the backend independently verifies membership. WorkOS organization/SSO integration can be added later with an explicit synchronization design. It is not claimed as an included feature.

Stripe remains the billing authority. A single Convex projection enforces paid entitlements. An expired projection denies access until reconciliation. The sample starts in Stripe test mode.
