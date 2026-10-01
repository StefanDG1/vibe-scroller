# Enter the dashboard after sign-in

Status: accepted, 1 October 2026, explicit owner request.

The app entry route creates a personal workspace when an authenticated active account has no active membership, then opens its dashboard. An existing active membership is reused. Workspace creation, owner membership, audit entry and saved default are one Convex transaction, so simultaneous first visits do not create duplicates. This does not purchase a subscription, connect a provider or authorize inference or coding.

The saved default is checked against current membership and workspace status on every entry. Revoked or deleting workspaces cannot be reopened through that preference. An explicit workspace selection must pass the same access check before becoming the default. Recovery lock and account deletion still block access. Creation retains existing rate and membership limits.

The workspace list and manual creation move to `/app/workspaces`, reached from account settings. `/app` now enters the dashboard directly and preserves a bounded shared-content draft. This supersedes the earlier requirement for a new user to complete a workspace form before reaching the library.

Tests cover concurrent first visits, existing workspace reuse, selected defaults, lost access, foreign selections, deleting workspaces/accounts, anonymous access and recovery lock. A production redirect and dashboard render must pass before this onboarding is reported as deployed and usable.
