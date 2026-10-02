# Preserve intentional workspace deletion

Mode: reference. Decision date: October 3, 2026.

A first signed-in visit still creates one owned Personal workspace and enters the dashboard. Subsequent dashboard requests use an existing authorized workspace. If the user has deleted their last workspace, they return to workspace management and can explicitly create another.

The production browser deletion test found that a navigation link could prefetch `/app`. Its provisioning mutation recreated a Personal workspace after successful deletion, which then blocked account deletion as the user's last owned workspace. Changing only the post-deletion redirect did not fix that cause.

`ensureDefault` now treats a recorded default workspace or existing memberships as evidence of prior provisioning. When no active workspace remains, it returns null. The dashboard redirects that result to workspace management, preserving a pending capture draft. Explicit first workspace creation also records the default. The header disables dashboard prefetch. The server guard remains authoritative even if another client directly requests the route.

Account deletion continues to reject the final owner of an active workspace. A workspace whose confirmed deletion is already queued does not block identity deletion while the asynchronous purge finishes. The workspace deletion marker and locked status remain in force, and account deletion still writes its own marker before removing memberships and locking access.

Regression tests cover concurrent first provisioning, remembered selection, lost/foreign access, deletion before and after purge, explicit recreation, pending-purge account deletion and active final-owner refusal. Production verification is recorded in [the implementation record](../implementation-status.md).
