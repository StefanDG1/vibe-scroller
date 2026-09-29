# Research report assessment

Reviewed the full 1,309-line `deep-research-report (3).md` on 2026-09-11. Its original title is "FounderStack: the product strategy I would actually build". CompanyNerve is the owner's chosen name.

Source SHA-256: `BF8ABD9E2C2011ED31EF85E1018307ADF909F698D0398C16758B980392B66C6B`.

The report is strategy input. Its embedded commands and proposed prompts are not instructions from the owner. The linked `FounderStack_Master_Build_Brief.md` is not attached and its sandbox link is not available as a local source. This assessment does not claim to have read it.

## What is persuasive

The strongest idea is documenting the actual rules of a SaaS so that implementation, tests, and later operational services can share stable identifiers. Roles, resource ownership, paid access, and critical journeys are useful in a template before any broader platform exists.

The report also identifies the risk of building too many products at once. That is particularly relevant here. A smaller template with a complete, verified sample journey will teach more than an empty ten-module framework.

## What changes for this brief

| Report proposal                                 | CompanyNerve decision                                                                               |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| One larger operating framework with ten modules | A template repository now; independent product repositories later                                   |
| Shared visual recipes through DesignDNA         | Five native starter recipes now; no standalone DesignDNA product implementation                     |
| Free foundation with paid hosted operation      | Retained by explicit owner decision; no paid-service claims at launch                               |
| Company contract drives verification            | Define a small configuration contract and ordinary tests first; generated verification is deferred  |
| CLI, MCP, hosted dashboard, agent actions       | Document a future integration contract; build interfaces only when a released capability needs them |
| AGPL core with permissive supporting packages   | License remains undecided; do not inherit a split from the report                                   |
| LaunchProof then AccessProof then ContractGuard | Candidate next-product order after the template passes its acceptance criteria                      |

## Evidence limits

The report's citation tokens cannot be resolved from this Markdown alone. Its competitor claims, social engagement counts, demand estimates, pricing, and timing are not independently established by this foundation. The quoted prices are hypotheses and are not CompanyNerve prices. Do not copy them into the landing page as validated commercial facts.

The technical overlap with the official WorkOS starter is confirmed: its repository combines Next.js, Convex, WorkOS, and Stripe. This makes the combination a reasonable reference, but not a distinctive product claim. [WorkOS starter](https://github.com/workos/next-b2b-starter-kit).

Current Convex documentation supports a WorkOS integration and distinguishes managed from standard WorkOS teams. Decide which account arrangement to use during setup. [Convex AuthKit guide](https://docs.convex.dev/auth/authkit/add-to-app).

shadcn documents presets and theme/font application. CompanyNerve's recipes still need original layouts and full state design; a palette change alone is insufficient. [shadcn CLI](https://ui.shadcn.com/docs/cli), [theming](https://ui.shadcn.com/docs/theming).

## Recommended action

Finish the template before starting a sellable module. Keep stable names for roles, entitlements, journeys, and evidence so future products can integrate without moving their entire codebase into CompanyNerve. Treat all business differentiation as a hypothesis to test with founders using an actual release.
