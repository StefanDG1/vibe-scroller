# Repository assessment

Inspected on 2026-09-11. Kinetexa and Vydero had clean working trees, and their local HEADs matched `git ls-remote origin HEAD`. This was a source review, not a fresh execution of either application's tests or a production security audit.

| Repository                                                           | Reviewed commit                            | Scope                                                                                                                  |
| -------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| [Kinetexa](https://github.com/StefanDG1/Kinetexa)                    | `6f2a0b85585bbbe1a0c86b8a57ab92fcce11c280` | README, instructions, dependency manifests, authorization, billing, sharing, and lifecycle tests                       |
| [Vydero](https://github.com/StefanDG1/Vydero)                        | `04c6fef9615feba1584e4a6a1798c887bf4a5301` | README, instructions, workspace dependencies, backend authorization/components, webhook and redirect tests             |
| [WorkOS B2B starter](https://github.com/workos/next-b2b-starter-kit) | `8ffbd0dd9cf359363e73be3ab82e2fac6ec3014f` | Fresh shallow clone, package manifest, license, organization and Stripe backend files, documented integration behavior |

Exponential Education was mentioned in the report but no corresponding checkout was found directly under `C:\Code`. It was not inspected. The Donkey checkouts are media-editor references and are outside the template scope.

## Kinetexa

The root uses npm workspaces; `apps/web` uses Next.js 16.3.4, React 19.2.8, Convex 1.45.0, and AuthKit 4.3.1 at this snapshot. These are observed versions, not an instruction to install them unchanged.

`convex/authorization.test.ts` exercises two identities, private-by-default data, forbidden reads/writes, anonymous denial, and backend quotas. Adapt the test approach to two organizations and several roles.

`convex/billing.ts` records webhook IDs, controls updates using observation/revision values, and schedules entitlement refresh. `convex/billing.test.ts` includes forged signatures, wrong environments, replay, and old-event cases. Use these scenarios in the template's billing acceptance suite.

`convex/sharing.test.ts` and `convex/lifecycle.test.ts` cover revoked/expired sharing and owner-scoped deletion. Keep the behavior requirements. Fitness schemas, private routes, imports, telemetry payloads, and athletic identity stay in Kinetexa.

Kinetexa identifies itself as an unlaunched prerelease and declares AGPL-3.0-only. Its useful patterns do not establish that its code can be copied into an arbitrarily licensed template.

## Vydero

The repository uses pnpm 11.15.1 and Node 24 with shared schemas, core functions, provider contracts, and design tokens. Its web manifest uses Next.js 16.2.11, React 19.2.4, Tailwind 4, and shadcn tooling. Prefer its clear package ownership over importing its whole package graph.

`convex/lib/auth.ts` checks workspace/project ownership and includes scoped automation credentials. However, `requireWorkspace` selects the first active membership and has an `ALLOW_DEMO_ACCESS` branch. A general B2B template needs explicit active-organization selection and production denial of demo bypass. Do not copy these choices unchanged.

`convex/convex.config.ts` registers rate limiting, AuthKit, migrations, workflows, and an agent component. These are relevant future references. Workflow and agent packages are not necessary for the first template journey.

`apps/web/lib/server/stripe-webhook.test.ts` tests a signed raw body and a tampered signature. `auth-return.test.ts` checks safe local destinations. Retain these scenarios. Media workers, social publishing, credits, vendored Donkey code, and product-specific admin allowlists stay in Vydero.

## Official starter

The WorkOS reference confirms the preferred stack and an MIT license. Its documented entitlement synchronization uses WorkOS's Stripe integration; CompanyNerve must choose a single entitlement authority deliberately. Treat it as an integration reference, not an independently audited security baseline. [Source at reviewed commit](https://github.com/workos/next-b2b-starter-kit/tree/8ffbd0dd9cf359363e73be3ab82e2fac6ec3014f).

## Reuse decision

Write a small new template using provider-supported integration patterns. Reuse test ideas and documented boundaries. Copy source only after an explicit file-level dependency/license review. No application source has been copied into CompanyNerve during this phase.
