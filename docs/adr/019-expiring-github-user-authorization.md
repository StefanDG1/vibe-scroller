# Renew expiring GitHub user authorization

Status: implemented; real refreshed-provider verification remains pending. Date: 2026-10-02.

The real staging snapshot refresh returned GITHUB_UNAVAILABLE after the original GitHub authorization had aged beyond eight hours. The previous OAuth adapter saved the access token alone and discarded GitHub’s refresh token. GitHub enables expiring user-to-server tokens by default, so that representation could not support a durable repository connection.

New authorizations store a versioned access/refresh credential envelope inside the existing workspace-bound authenticated encryption. Neither token nor its ciphertext is returned by the connection-status query or account exports. The expiry clock starts before the token exchange. A one-minute margin triggers renewal before a repository read. The refresh uses the documented grant, verifies the same GitHub user, and retains the independently checked selected repository and current push permission. Installation credentials remain separate and never enter a coding agent.

A 120-second database lease serializes one-use refresh tokens. Completion requires the same encrypted credential, lease and active workspace. A replacement or disconnection rejects late completion; it cannot recreate the connection. A stalled lease permits a later bounded retry but fences the old worker. A provider-rejected legacy credential becomes needs_reconnect. Existing discarded refresh tokens cannot be reconstructed; those connections require one normal OAuth reconnect. No permission or isolation check is removed to work around expiration.

Tests cover expiring and incomplete provider responses, refresh expiry before any request, legacy compatibility, concurrent renewal, reconnect and revoke races, stalled leases and stale-result rejection. Windows pnpm check passed 194 application tests, eleven authentication tests, six PCM tests and both builds, with three credential-gated suites skipped. Mocked refresh responses prove the adapter boundary; they are not a real GitHub refresh pass.

Official contract checked October 2: [refreshing GitHub App user tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens). A user token expires after eight hours; the six-month refresh token is rotated on use. Do not disable expiration to avoid implementing renewal.
