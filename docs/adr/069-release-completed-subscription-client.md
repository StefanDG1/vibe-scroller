# Release the completed sign-in client

Mode: reference. Decision October 6, 2026. Status: implementation candidate.

The isolated subscription bridge stopped with `fork(): Resource temporarily unavailable` during a real two-client summary run. Inspection found an unused completed sign-in client with sixteen threads and orphaned zombie bridge processes. The fixed worker process limit remains ninety-six; increasing it or restarting the credential-bearing worker is not the recovery strategy.

Close the official sign-in client after account binding is recorded. Keep the separate referenced deadline controller alive. Set the sign-in client's Tokio pool to two threads, matching the analysis clients, and start future workers with Docker's init process so orphaned children are reaped. All existing network, filesystem, credential, spending and expiry restrictions remain.

The affected current session recovered by closing only its completed sign-in client and restoring the same loopback bridge. Failed inference attempts remain unknown history; changed recovery keys bound retries rather than overwriting receipts. Real successful summaries after recovery and future short-lived Docker init probes are separate evidence. This decision does not promise that an external provider never disconnects or that the whole library is complete.
