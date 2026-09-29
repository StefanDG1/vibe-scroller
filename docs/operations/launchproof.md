# Connect an optional LaunchProof summary

LaunchProof is optional. A fresh CompanyNerve export works with the connection disabled, without a LaunchProof account or token. The owner or admin can open **Launch checks setup** from a workspace sidebar. The page provides instructions; it does not store credentials or change server settings.

## Configure the connection

1. Sign in separately at [LaunchProof](https://launch.companynerve.com). Create a reporting application in your own LaunchProof workspace.
2. Record its application ID and the workspace slug in its private dashboard URL.
3. Have that LaunchProof workspace owner issue a token scoped only to `reports:read-summary` for that application. Do not use `reports:read`, an upload token, or a target JWT.
4. Open the target Company's workspace setup page and copy its organization ID. Explicitly approve its relationship to the reporting application. Do not infer this mapping from an email, identity subject, domain, or session cookie.
5. Configure the variables below in the **starter server** environment. For local use, use ignored `apps/starter/.env.local`. Keep `LP_INTEGRATION_ENABLED=false` until the mapping is reviewed. Each product and environment supplies its own values.

```dotenv
LP_INTEGRATION_ENABLED=false
LP_INTEGRATION_ORIGIN=https://launch.companynerve.com
LP_INTEGRATION_APPLICATION_ID=
LP_INTEGRATION_WORKSPACE_SLUG=
LP_INTEGRATION_TARGET_ORGANIZATION_ID=
LP_INTEGRATION_TARGET_ORIGIN=
LP_INTEGRATION_ENVIRONMENT_ID=
LP_INTEGRATION_SUMMARY_TOKEN=
LP_INTEGRATION_CACHE_TTL_MS=60000
LP_INTEGRATION_TIMEOUT_MS=3000
LP_INTEGRATION_CURRENT_COMMIT=
LP_INTEGRATION_CURRENT_DEPLOYMENT_ID=
```

Use the target **Convex origin exercised by the runner**, such as `https://your-target.convex.cloud`, for `LP_INTEGRATION_TARGET_ORIGIN`. The environment ID must match the report. Origins must have no trailing slash, path, credentials, or query. Supply the full lowercase Git SHA or exact deployment ID of the tested target backend in the current identity fields. Leave unknown identities empty. A frontend deployment ID does not identify a separately deployed Convex backend.

6. Set `LP_INTEGRATION_ENABLED=true` and restart the starter after reviewing the mapping. Reload the workspace dashboard as a current owner or admin. An enabled connection with no retained upload shows **No retained LaunchProof report**.
7. Use LaunchProof's separately supplied local runner instructions to prepare synthetic staging workspaces, review the exact plan, approve its digest, and run permitted checks locally or in your own CI. Upload only the sanitized report through the runner's separate upload flow. No new paid plan or real payment is needed for this integration.

Keep target JWTs, test-user credentials, and customer target secrets in local tooling or CI secrets. Never enter them on the hosted LaunchProof website. The summary token only reads a summary. It cannot run checks or upload reports. Do not put it in a URL, `NEXT_PUBLIC_` variable, company configuration, browser component, log, or export.

## Check the result

Reload the target dashboard. Only current owners and admins in the exact mapped organization receive the summary. The panel displays the reported scope counts, tested identity, target, environment, upload time, retention expiry, and fetch time. Follow **Open Launch Checks** for the private report. LaunchProof may require a separate sign-in.

Treat a matching report as a customer-declared claim. Upload time is not execution time, and the report is not a certification. A different environment, origin, commit, or deployment produces **Not tested for this deployment**. Missing immutable identity produces **Deployment comparison unavailable**. See [contract and limits](../launchproof-contract.md).

If the panel reports unavailable, check the server mapping and token without exposing either in diagnostics. A revoked token requires a newly issued summary-only token. A rate limit or outage requires a later manual reload. Authentication, projects, and billing do not depend on LaunchProof. The disabled panel makes no LaunchProof request and reads no summary token.

## Disconnect or remove

1. Revoke the summary token in the owning LaunchProof application's token settings.
2. Set `LP_INTEGRATION_ENABLED=false`, remove the token and mapping variables, and restart every app and preview instance that received them.
3. Reload the dashboard and confirm that the optional panel is absent. The setup instructions remain available. Disconnect does not delete reports, projects, users, memberships, or subscriptions.

Each dashboard read creates a request-local adapter and calls `disconnect()` in `finally`. This clears its cache, aborts an in-flight fetch, and releases its token reference. There is no shared session or persistent cache. Turning off a variable takes effect when running instances receive the new environment. Revocation can prevent later reads; it cannot erase a summary already rendered in a browser.

To uninstall the source, remove the dashboard import and Suspense block, sidebar setup link, setup route, `LaunchChecks` component, wrapper, and `packages/launchproof-integration`. Remove the optional env entries and integration tests. No backend data migration is required.

## Upgrade or roll back

Integration `0.1.1` accepts runner `0.1.0` and `0.1.1`; the check adapter stays `companynerve-v1` `0.1.0`. Explicit programmatic configuration must use `adapterVersion: "0.1.1"`. The environment loader selects this version automatically. The `server.ts` bytes are unchanged; refresh the running app to load the new contract before reading runner `0.1.1` summaries.

Pin both released runtime files to the same reviewed version. Compare the new contract, destinations, scopes, and bounds before enabling it. Run the CompanyNerve integration, backend, and template-export tests and starter build. Disable first for rollback, restore the reviewed version, then configure a valid summary-only token. A fresh export must still default off and build without credentials.
