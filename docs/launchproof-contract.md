# Optional LaunchProof contract and limits

The copied integration adapter is version `0.1.1`, using `launchproof-summary-v1`. It accepts exactly runner `0.1.0` or `0.1.1` and check adapter `companynerve-v1` version `0.1.0`. Other runner and check-adapter versions, including prereleases, are rejected. The exact response schema and status union are in [contract.ts](../packages/launchproof-integration/contract.ts). The source hashes are in the [adapter README](../packages/launchproof-integration/README.md).

The only outbound operation is `GET /api/v1/applications/{configuredApplicationId}/summary` on the configured service origin. It sends `Accept: application/json` and the summary bearer token. It sends no cookies, incoming request headers, query parameters, or target credentials. All redirects are rejected. HTTPS is required except numeric loopback HTTP for local fixtures.

One starter deployment maps one target organization ID to one reporting application ID, workspace slug, target origin, and environment ID. Other target organizations get no summary. The wrapper queries the existing `organizations.details` backend with the current authenticated session before and after the fetch. It takes no role from route data or a client component. The backend remains the authority for current membership and organization status.

The adapter validates both response application IDs and rejects unknown fields, invalid versions, inconsistent counts, token reflection, malformed JSON, and responses over 16 KiB. It constructs the private report link from validated IDs and the configured service origin. Only sanitized status data reaches the view. LaunchProof enforces remote scope, issuer membership, and application ownership. An opaque token does not let this wrapper attest its scope; owners must issue only `reports:read-summary`.

| Bound                       | Behavior                                                                                                                   |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Network timeout             | Default 3,000 ms; accepted 50–5,000 ms, including body reads through abort                                                 |
| Authorization wait          | Each current-membership check uses the same timeout bound                                                                  |
| Maximum nominal read wait   | Two authorization checks plus one fetch, normally at most 9 seconds with defaults; scheduler delays can add time           |
| Cache TTL                   | Adapter default 60,000 ms; accepted 0–300,000 ms                                                                           |
| CompanyNerve cache lifetime | One request only; wrapper always disconnects before returning, so subsequent requests fetch again                          |
| Retry                       | No automatic retry or stale-success fallback after a failed fetch                                                          |
| Disabled                    | No summary token read, backend authorization call, or outbound request from the wrapper                                    |
| Missing report              | No retained report or returned report expired                                                                              |
| Unavailable                 | 401 authentication; 403/404 mapping or scope; 429 rate limit; 3xx redirect; network/5xx service; timeout; invalid response |

The dashboard streams the optional panel inside its own Suspense boundary. Login, backend business behavior, billing, and exports have no dependency on the wrapper. Only the summary panel can become unavailable.

The API returns the latest retained **upload across all application environments**, not the latest executed check for a selected deployment. Deleting or expiring a newer upload can expose an older retained upload. A deployment mismatch keeps the report visibly marked as not tested for the current deployment. Missing immutable identity prevents comparison. Execution time is absent from this API. Commit and deployment identity are customer-declared; matching does not prove independent verification or test freshness.

Source exports include the optional source and blank env examples, with `LP_INTEGRATION_ENABLED=false`. Local env files and provider metadata are excluded. Account and organization data exports remain unchanged and do not include integration configuration or credentials. No private LaunchProof documents or other application source are distributed with CompanyNerve.
