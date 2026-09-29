# Cloud execution

Mode: reference.

## Purpose

Cloud execution makes the complete product usable from a browser without a paired computer. It is an explicit paid choice. It is never a silent fallback for an offline laptop or an exhausted ChatGPT plan.

Use an ephemeral CPU sandbox provider through an adapter. E2B is the initial candidate because its published usage-based option has no recurring base fee. Do not rely on introductory credits in long-term pricing. Sources S20 and S21 describe the candidate, not a tested VibeScroller integration.

## Job classes

A media preparation job receives temporary object grants and a pinned tool image. It decodes the source, extracts audio and frames, writes a manifest, and terminates. It does not receive repository content or coding credentials.

A coding job receives a bounded repository snapshot, approved plan, network policy, provider capability, deadline, and resource limits. It returns a patch and test report. It does not receive the GitHub App private key or payment credentials.

Keep the two images and service identities separate. Media parsing vulnerabilities must not expose the coding environment or account secrets.

## Cloud coding runtime

Use an official API-funded Codex SDK or another reviewed agent adapter with the same task contract. The default local app-server integration does not imply that a customer's ChatGPT subscription is authorized for a hosted multitenant worker.

The provider broker enforces the model allowlist, maximum input/output tokens, tool-call count, and cost reservation. A sandbox makes authenticated requests through a short-lived job capability. The broker never treats an agent's claimed cost as authoritative.

Create one sandbox per coding run. Start with two virtual CPUs, four GiB RAM, a 20-minute deadline, and bounded disk. Increase resources only through a new quote. Repository workloads that need larger builds show an honest unsupported-or-upgrade state rather than repeatedly crashing at the customer's expense.

## Network and secrets

Deny access to cloud metadata addresses, internal services, other tenants, and unrestricted outbound hosts. Permit only approved package registries, provider broker endpoints, and artifact storage as required by the task. Verify the sandbox provider supports the enforced policy, not merely an advisory environment variable.

Run unprivileged. Do not mount a Docker socket or host filesystem. Do not allow nested infrastructure management. Tests cannot use production secrets. Use synthetic test services or explicitly configured disposable staging credentials scoped to the job.

The trusted publisher retrieves the patch after the sandbox finishes. Publication credentials never enter the sandbox. V2 account creation is not part of this runtime.

## Budget policy

Quote compute, inference, expected tool calls, bandwidth, and a bounded retry allowance before launch. Reserve platform credits atomically. When a user supplies an API key, quote platform execution separately and show that the provider bills inference directly.

Stop before exceeding the approved ceiling. Unexpectedly long output, build loops, or repeated failing tests cannot request unlimited resources. Allow at most one bounded continuation under the existing ceiling, then require new approval.

Before public launch, verify whether the provider can actually prevent spending after cancellation and measure billing granularity. Add that residual exposure to the reservation. A cancel button is not proof that the vendor stops billing instantaneously.

## Artifacts and teardown

The job writes a patch, test report, manifest, and redacted logs to private object storage. Each artifact has a checksum, size limit, expiry, and workspace owner. Reject unreferenced artifacts and unsafe paths.

Terminate the sandbox after result upload or deadline. Schedule cleanup independently so a crashed orchestrator does not leave an idle environment running. Record termination acknowledgement and reconcile billed runtime.

Limit retained diagnostic logs to the policy in [Caching and retention](CACHING-AND-RETENTION.md). Never retain a complete temporary filesystem as a convenient backup of customer code.

## Activation gates

Cloud mode is enabled only after a real staged run proves isolation, budget stopping, provider brokerage, artifact validation, cancellation, deletion, and draft PR publication. Verify applicable data-processing terms and transfer arrangements. Do not promise EU-only execution without evidence from the active provider configuration.

If cloud mode is unavailable, the application can offer local execution and plan export. The pricing page must not advertise a complete hosted coding option until the gate passes.
