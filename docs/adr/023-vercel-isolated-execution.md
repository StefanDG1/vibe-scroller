# ADR 023: Vercel isolated execution

Status: accepted provider decision; production activation requires recorded acceptance. Date: October 2, 2026.

The owner selected existing Vercel Pro, withdrew Netlify and preferred avoiding E2B. Active E2B SDK calls and dependency are removed; old scripts stop explicitly. No automatic provider fallback is allowed.

Use official Vercel Sandbox 3.5.1, explicit persistent=false, two CPUs/four GB, Frankfurt, no exposed ports or region failover, bounded lifetimes and clean pinned tool snapshots. Only trusted setup uses the privileged SDK process. Every customer command uses separate PID, mount, IPC, UTS and network namespaces, UID 1001, no capabilities, no_new_privs and an empty inherited environment. Root and SDK-user homes are inaccessible. Offline coding/decoding cannot reach the guest control API or internet.

Online retrieval also has an empty guest network namespace. A root-owned Unix HTTPS CONNECT broker alone resolves approved public DNS hosts. It rejects literals, private/mixed DNS answers, non-443 ports and unapproved destinations, pins the validated address and bounds connections, requests, bytes and time. A namespace-local loopback bridge exposes only that broker. Provider network policy adds a host allowlist; it is not the sole private-network control. Download completion changes provider policy to deny-all before decoding. No customer or provider credentials enter the VM.

Real tests found two incompatible assumptions: Vercel rejects IPv6 CIDRs in the subnet policy and its guest kernel does not support the previous nftables table. Neither failure permits a bypass. IPv6/private denial is enforced by empty namespaces and the broker's numeric-address checks. Artifact reads use descriptor-relative O_NOFOLLOW and require a single-link regular UID-1001 file within size/path bounds.

Convex gets short-lived project-scoped official OIDC authorization through a same-origin Vercel machine endpoint. A 256-bit HMAC secret authenticates a timestamped, purpose-bound request; a Convex atomic nonce receipt blocks replay. The endpoint rejects browser Origins, caps request bytes, returns no-store and never logs credentials. The key belongs only in trusted Production stores. User tenancy, approval and atomic spending remain enforced before the machine call. A broad account PAT is not copied into the backend or guest.

Worker acceptance passed with owned synthetic data, including cancellation and cleanup. It does not verify model funding, complete production PR publication, independent recovery, legal-provider terms or the quality benchmark. Keep cloud coding disabled until those gates pass. Tool snapshots expire after seven days and must be rebuilt, retested and explicitly selected before expiry. Never snapshot customer workloads.

The runbook and implementation record carry commands, source versions and failures. Historical E2B evidence remains history.
