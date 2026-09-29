# Local execution runner

Mode: reference. The runner is optional. All user-facing review and approval stays in the web application.

## Responsibilities

The runner pairs a named computer with a workspace, advertises capabilities, waits for approved jobs, creates an isolated working copy, runs the official Codex app-server, uploads a validated patch and test report, and returns progress. The trusted backend publishes the PR.

The first supported operating system is Windows on the founder's laptop. Add macOS and Linux only after their isolation and credential-storage tests pass. The runner must not advertise a platform as supported because Node.js launches on it.

A user may run the process only when needed or enable an explicitly installed per-user background service. Auto-start is opt-in and reversible. The product does not promise to wake a sleeping laptop or execute while it is offline.

## Pairing

The runner generates a device key locally and creates a short-lived pairing request. The browser displays the device name, public-key fingerprint, requested workspace, and capabilities. The user signs in and confirms the match.

Use WorkOS's documented device flow when compatible with the app's required account context. Otherwise use a narrowly scoped app-specific pairing ceremony after browser sign-in. Pairing is not a new replacement for WorkOS authentication.

The pairing code expires after 10 minutes, can be consumed once, and is rate-limited. The runner receives a revocable scoped device credential. Store it in the operating system credential vault. Never ship a confidential shared client secret in the runner binary.

Record device ownership and workspace membership. Removing a user from a workspace revokes their device's ability to claim work there. Require reauthentication for adding a new device or increasing its capabilities.

## Repository mapping

The user maps each authorized GitHub repository ID to a local directory. Verify the remote identity and expected repository before accepting the mapping. Reject filesystem roots, home-directory roots, network shares unless explicitly supported, and paths escaping the selected directory through symlinks or junctions.

The server sends a repository ID and base commit, not an arbitrary shell command or local path. The runner selects its own registered mapping. A requested base commit must belong to the authorized repository.

Default to a clean committed snapshot and a separate working copy. Do not modify a user's existing dirty worktree. Reading uncommitted changes requires a visible, per-repository opt-in and a snapshot record.

## Isolation

A worktree is not a sandbox. The execution environment must enforce write boundaries, restrict external network access, and protect home-directory secrets. Use supported upstream Codex sandbox controls plus an appropriate OS boundary. Test the actual Windows mode. A WSL2-based restricted environment is an option only when it passes the same tests and does not mount unrelated host directories.

Do not pass the runner's device credential, GitHub App credentials, `.ssh`, browser profiles, cloud credentials, or other repositories into the working environment. Disable automatic git hooks, unapproved submodules, and arbitrary host package installation.

Treat tests and dependency scripts from the repository as executable untrusted content. A test command needs the same isolation as an agent-generated command. Reject a task when the required isolation is unavailable. Never fall back to unrestricted execution.

## Job envelope

Use `contracts/runner-job.schema.json`. The envelope references an approval ID, repository ID, base SHA, plan hash, lease generation, deadline, model route, allowed paths, network policy, and spending ceiling. The server signs or authenticates the envelope through a standard reviewed protocol. The runner verifies the current device session and lease before starting.

A queued approval expires after 24 hours. A run has a 20-minute default runtime ceiling and a bounded provider budget. The user can approve a new bounded continuation. A queued task cannot silently become a background agent with indefinite access.

Local subscription quota usage may not map to currency. Display the route and rate-limit state. Still cap runtime, number of turns, tool calls, and output size. Do not translate unknown ChatGPT quota usage into a fabricated euro cost.

## Codex integration

Launch a pinned official `codex app-server` process with stdio transport. Use documented methods for initialization, account state, thread creation, turn start, approvals, cancellation, and completion. Generate the typed client from the version's protocol schema where supported.

Keep app-server authentication on the local computer. The browser can show connected status and capability summaries but never receives refresh tokens. A fresh approved task starts its own controlled thread. Existing desktop conversation injection is not a requirement.

Bridge relevant tool approval requests into the web run screen. The runner resumes only after the correct user approves the specific operation under the current plan and budget. Text inside a video or repository cannot answer that approval.

The initial implementation must prove that the chosen app-server version can operate safely in the selected sandbox. Unsupported protocol features require a typed unavailable state, not an undocumented workaround.

## Leases and communication

The runner makes outbound HTTPS requests only. No public inbound listener or router port-forwarding is required. App-server sockets stay local.

Claim at most one coding job per device initially. Send a heartbeat every 15 seconds. A lease expires after 90 seconds without a valid heartbeat, but a new worker cannot publish while the old attempt remains unconfirmed. Use fencing generations to reject stale artifacts.

After a network interruption, reconcile the run state before resuming. Cancellation stops the child process and descendants, revokes job artifact grants, and uploads a redacted termination receipt. Device revocation stops new claims immediately and triggers cancellation of active jobs.

## Result and publication

Upload a patch against the approved base SHA, changed-path manifest, test report, dependency changes, and concise limitations. Scan outputs for secrets and deny forbidden paths. The backend performs its own validation before publication.

Default to final patch review. A pre-authorized draft-publication option can skip that extra click only for low-risk changes that stay inside the exact approved plan. High-risk changes require review. No local job can merge a PR or deploy production in V1.

## Distribution and support

Provide a versioned package with checksums and a signed release where available. Explain installation, pairing, repository mapping, start/stop, revoke, update, and uninstall in user docs. Prefer a single documented command or installer with a transparent manifest over an unexplained remote script.

The runner checks for protocol compatibility and notifies users about security updates. Do not silently self-update an executable during an active run. Uninstall removes service registration and local credentials while preserving user repositories.
