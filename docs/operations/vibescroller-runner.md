# Pair and verify a local runner

The Windows runner is implemented through pairing, dispatch, leases and result ingestion. Actual local coding remains disabled. Native Codex probes on 2026-09-30 allowed reading a synthetic sibling-repository canary, so this laptop has not met the required isolation policy. `windowsSandbox/readiness: ready` does not prove the policy.

## Prepare pairing

Use Node 24 and the pinned official Codex 0.142.3 client. Sign in through the official client on the user's computer. Never copy its OAuth session to Convex, a cloud worker or another user.

Copy `packages/runner/config.example.json` into a private directory outside repositories. Set the dedicated HTTPS Convex `.convex.site` server, the workspace ID and exact repository mappings. Keep the remaining execution gates closed.

Run `node packages/runner/pair.mjs C:/absolute/private-config.json`. The script creates a device credential and private key in Windows Credential Manager. Only its public pairing request is printed. Paste that request into the authenticated application's Computers screen, reauthenticate if requested, compare the fingerprint and confirm it separately. Pairing does not authorize coding or certify isolation.

## Supply a reviewed isolation adapter

There is no verified Windows adapter in this release. Do not create a worktree-only adapter or change permissions to unrestricted execution. A reviewed adapter must be immutable bundled ESM outside mapped repositories. Its SHA-256 must match both configuration and evidence. Evidence must identify schema 1.0.0, Windows, Codex 0.142.3, the adapter hash, an expiry and successful actual checks for write boundaries, home secret denial, unrelated repository denial, network policy, descendant termination, symlink denial, credential separation, official Codex authentication and hook denial.

The adapter exports four asynchronous methods:

- `prepare({job, mapping, repository, signal})` creates a clean isolated snapshot of the exact approved base. Return an opaque handle, working directory, official app-server binary, arguments and a sanitized environment. Honor cancellation before returning. Keep transport credentials outside the task process. Disable repository hooks, user-configured MCP servers, connected apps, browser tools, web search and undeclared network routes. The official client may use only the user's supported authentication route.
- `check({handle, tests, deadline, signal})` runs only the approved checks under the same isolation and resource limits.
- `terminate(handle)` kills all descendants and returns `{terminated: true}` only after verifying termination. It must be idempotent and recoverable after restarting the runner.
- `collect({handle, baseSha, allowedPaths})` returns bounded UTF-8 patch and report strings after termination. It must never include credentials, hidden reasoning, unrelated files or private diagnostic payloads.

Operator certification of a device and backend enablement remain unavailable until that adapter and all tests have passed. Do not manually set device capabilities or `LOCAL_ISOLATION_VERIFIED` to make a demonstration run.

## Execute and recover

Once certified, run `node packages/runner/runner.mjs C:/absolute/private-config.json`. The runner validates the exact adapter bytes, evidence, repository identity and vault credential before polling. Every claim binds workspace, repository, base, plan, executor, funding, generation and zero service-credit spend. All new tool approval requests are denied. A lost heartbeat, expired task or cancellation stops the worker. A prior worker must be confirmed terminated before another claim.

Results return to the private browser application for review. The server rebuilds the patch against GitHub's approved base, checks allowed paths and secret patterns, and requires a separate publication approval. Local reports describe device-reported checks; they do not claim independent cloud verification.

To uninstall, stop the runner, reconcile any active worker, revoke the device in Computers and delete its `VibeScroller/<device-id>` Windows Credential Manager entry. Remove only its private configuration and recovery file after termination is confirmed. Revocation prevents new dispatch and result publication; offline processes still require local termination.
