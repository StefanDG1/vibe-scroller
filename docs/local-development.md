# Run your copy locally

Use Node.js 24 and pnpm 12.3.4. Install with `pnpm install --frozen-lockfile` from the repository root.

## Marketing and design previews

Run `pnpm dev:marketing` and open http://localhost:3000. The five landing pages are under `/designs`. Generated products include the marketing application with their own branding.

## Authenticated starter

1. Run `pnpm convex:dev`. Choose a new project in your own Convex account. The CLI creates an ignored root `.env.local`.
2. Create this product's own WorkOS project/environment. Configure AuthKit with the exact redirect `http://localhost:3001/callback`, homepage/sign-out URI `http://localhost:3001`, and Initiate login URL `http://localhost:3001/sign-in`. Enable Magic Auth email one-time codes and Google OAuth only. Disable email/password, passkeys, SSO, and other social providers. Follow [authentication setup](operations/authentication.md) for the product's independent Google OAuth client.
3. Add `WORKOS_CLIENT_ID` and `WORKOS_API_KEY` to the ignored root `.env.local` from that WorkOS environment.
4. Set the same variables in the matching Convex deployment. Use `pnpm exec convex env set NAME` and pipe the value on stdin, or a temporary ignored environment file. Never paste a secret into shell history or a committed file.
5. Run `pnpm setup:local`. It writes `apps/starter/.env.local` and generates a session-encryption secret. It preserves that secret on repeat runs.
6. Run `pnpm dev` and open http://localhost:3001. Create an account using an email code, then create a workspace and project. Sign out and verify a separate Google sign-in. Neither flow should ask you to create a password.

Keep `pnpm convex:dev` running while changing the backend. The CLI updates generated types. Commit `convex/_generated` without environment values. WorkOS authenticates users; Convex owns organizations and roles. WorkOS SSO organization synchronization is not implemented.

## Stripe test billing

Set `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_MODE=test`, and `APP_URL=http://localhost:3001` in the Convex development deployment. Create a recurring test-mode price and a dedicated customer portal configuration. Set `STRIPE_PORTAL_CONFIG_ID` to that configuration ID to avoid changing shared account defaults. Register the Convex HTTP endpoint `/stripe/webhook` for checkout completion, subscription lifecycle, invoice paid, and invoice payment failure events.

Open a workspace's Billing page as its owner. The provider shows the actual price and currency. Return from checkout, refresh billing, and try the Pro report. Cancel using the portal and refresh again. Only the backend's verified state grants access.

Billing is optional for ordinary Free-plan product use. Without Stripe settings, the billing action returns an integration error rather than a fake successful checkout. The default maximum is three Free projects or 100 Pro projects. There are at most 50 members and ten organizations per user.

## Verification

Run `pnpm check`. The backend tests use synthetic users and do not need provider accounts. They verify cross-organization access, roles/invitations, revocation, quotas, deletion, and payment boundaries. A build is not verification of a hosted provider configuration. Use the [authentication checks](operations/authentication.md#verify-the-provider-setup) for email delivery, Google callbacks, and rejection of invalid codes.

## Create a new product

Run `pnpm template:export -- --name my-product --out ../my-product`. The output path must not exist and must be outside the source repository. The export preserves source, docs, skills, tests, and a lockfile, including the marketing app, but omits secrets and local provider configuration. Set website/app domains and support email in company configuration before publishing. Follow [launch operations](operations/launch.md) for the hosted setup.

Run a fresh install and build from the exported directory. Change `packages/company-config/index.ts`, then provision your own provider projects. Each product owns its WorkOS environment, Google OAuth client/consent branding, callback URLs, and session secret. Do not inherit CompanyNerve or suite credentials. Exporting source does not configure any provider.

Before live billing, review tax registration and Stripe Tax requirements for your markets. Tax calculation is not enabled by this sandbox example. Prefer a restricted key with only the customer, subscription, Checkout, and portal permissions the backend needs; verify those permissions in your own sandbox.
