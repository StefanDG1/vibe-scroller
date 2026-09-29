# Future products and integration policy

These are candidates from the report, not current scope or promised CompanyNerve features. No product folders or GitHub repositories are created for them in this phase.

| Product       | Future standalone purpose                      | Candidate local/repo name                 | Sequence                                       |
| ------------- | ---------------------------------------------- | ----------------------------------------- | ---------------------------------------------- |
| LaunchProof   | Check concrete launch failures                 | `C:\Code\LaunchProof` / `launchproof`     | First candidate                                |
| AccessProof   | Verify tenant, role, and plan boundaries       | `C:\Code\AccessProof` / `accessproof`     | Second candidate                               |
| ContractGuard | Check declared business invariants             | `C:\Code\ContractGuard` / `contractguard` | After real invariants emerge                   |
| ReleaseProof  | Verify critical journeys after changes         | `C:\Code\ReleaseProof` / `releaseproof`   | After deterministic checks exist               |
| OpsInbox      | Correlate actionable operating failures        | `C:\Code\OpsInbox` / `opsinbox`           | After signals exist                            |
| MarginWatch   | Attribute variable cost to customers/features  | `C:\Code\MarginWatch` / `marginwatch`     | After trustworthy usage/cost data              |
| PrivacyProof  | Verify supported data lifecycle actions        | `C:\Code\PrivacyProof` / `privacyproof`   | After explicit data inventory                  |
| AgentOps      | Track agent work against required checks       | `C:\Code\AgentOps` / `agentops`           | After underlying checks exist                  |
| AgentGate     | Enforce permissions over agent actions         | `C:\Code\AgentGate` / `agentgate`         | Last, after security maturity                  |
| DesignDNA     | Possible later product around design workflows | `C:\Code\DesignDNA` / `designdna`         | Optional; basic recipes belong in the template |

Names are proposals, not availability checks or reserved brands. Each product owns its repository, brand, design direction, data, release process, and deployment. Shared CompanyNerve primitives can help without making every product look the same.

## Before adding an integration to the template

1. Build and release the standalone product with its own documentation and license decision.
2. Record passing functional, security, environment-isolation, and deployment verification at a specific release commit.
3. Publish a narrow versioned API/SDK or integration package with supported template/config versions.
4. Test the adapter in a fresh CompanyNerve-generated project using synthetic data and least-privilege credentials.
5. Verify install, disconnect, provider outage, permission denial, upgrade, and rollback behavior. The base template must work without the adapter.
6. Add its documentation and adapter through a reviewed CompanyNerve PR. Preserve its standalone repository and individual design.

Do not move a whole product into the template or require it for starter signup. Mark unsupported checks as unsupported. Add paid-service billing only after the product and commercial terms exist.

Kinetexa, Vydero, and potentially Exponential Education are later adoption candidates, not projects to modify while preparing this template.

## Keep account and billing ownership explicit

A new product starts from an export with its own provider projects, database, domains, and customer relationships. Reuse the template implementation, not CompanyNerve production credentials or memberships. If cross-product accounts or subscriptions become a real requirement, define issuer/audience, organization mapping, consent, revocation, data deletion, and entitlement ownership before adding an integration. No implicit single sign-on or shared paid access exists today. Product-specific landing pages and dashboards can evolve independently while preserving backend membership checks.
