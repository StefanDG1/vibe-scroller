# Environment inventory

No credentials are required to install, typecheck, run the synthetic tests, or build either application. Runtime sign-in requires the starter and Convex settings below. Marketing requires none.

| Variable                        | Scope                                 | Purpose                                                      |
| ------------------------------- | ------------------------------------- | ------------------------------------------------------------ |
| CONVEX_DEPLOYMENT               | Root local CLI                        | Selected development deployment; created by Convex CLI       |
| NEXT_PUBLIC_CONVEX_URL          | Starter; root local setup             | Public Convex cloud URL                                      |
| WORKOS_CLIENT_ID                | Starter server and Convex             | AuthKit client and token verifier                            |
| WORKOS_API_KEY                  | Starter server and Convex             | Identity operations; secret                                  |
| WORKOS_COOKIE_PASSWORD          | Starter server only                   | At least 32 random characters for session encryption, not user login |
| NEXT_PUBLIC_WORKOS_REDIRECT_URI | Starter                               | Exact callback URL registered with WorkOS                    |
| APP_URL                         | Starter and Convex                    | Canonical application origin for invitations/billing returns |
| STRIPE_MODE                     | Convex                                | Expected webhook environment: test or live                   |
| STRIPE_SECRET_KEY               | Convex                                | Stripe server key; optional for Free use                     |
| STRIPE_PRO_PRICE_ID             | Convex                                | Recurring price for the sample Pro plan                      |
| STRIPE_PORTAL_CONFIG_ID         | Convex                                | Optional dedicated customer-portal configuration             |
| STRIPE_WEBHOOK_SECRET           | Convex                                | Signature verifier for this deployment's endpoint            |
| CONVEX_DEPLOY_KEY               | Restricted deployment secret, if used | Deploy a founder's own backend; never needed by marketing    |

Root `.env.example` and `apps/starter/.env.example` contain placeholders. `pnpm setup:local` copies required local values and creates a session secret, preserving it on reruns. Store provider credentials in ignored local files and provider environment stores, never source, logs or chat.

Use separate development, preview and production data. The public CompanyNerve marketing site has no access to starter credentials. Each exported product must provision its own services. Review [deployment](deployment.md) before production.

## Authentication defaults

In each product's WorkOS environment, enable Magic Auth email one-time codes and Google OAuth only. Disable Email + Password and other sign-in methods. These are provider settings, not `.env` switches; this template has no `DISABLE_PASSWORD` or provider-configured flag. Having environment values is not proof of saved provider settings or completed sign-in.

Each generated app owns its WorkOS client/environment, Google Cloud OAuth client and consent branding, callback URLs, and session secret. Do not inherit CompanyNerve or suite credentials. Store the Google client ID and secret in the selected WorkOS environment; no Google OAuth environment variables are consumed by Next.js or Convex. See [authentication setup](authentication.md).

The billing UI reads its mode from Convex. The backend rejects a Stripe key whose test/live prefix does not match STRIPE_MODE, before issuing a provider request.

## Optional LaunchProof summary

Only the starter server reads `LP_INTEGRATION_*` variables. The integration defaults off and needs no account or credentials for exports or builds. The complete placeholder inventory and connect/disconnect procedure are in [LaunchProof setup](launchproof.md). Never expose `LP_INTEGRATION_SUMMARY_TOKEN` through a public environment variable or company configuration. The two `CURRENT_*` identity fields identify the target backend exercised by checks, not automatically the frontend build.

## Website configuration

The optional `website.operator` object in company configuration supplies the legal name, registered address, CUI, Trade Register number, and EUID for the legal notice. CompanyNerve uses company-published facts from exponentialeducation.ro privacy/terms plus the reused Stripe profile postcode, without independent registry validation. Exports remove the object and replace the support email with `owner@example.com`. These are public facts, not provider credentials. A generated product must supply its own legal identity and policies before publishing.

Marketing optionally accepts `NEXT_PUBLIC_SITE_URL` to override the configured canonical origin and `GOOGLE_SITE_VERIFICATION` for a Search Console URL-prefix HTML token. Domain properties use a DNS verification record instead. Neither value is an authentication credential. Vercel supplies `VERCEL_ENV`; Preview emits noindex and disallows crawlers. Configure production app values only in Production; provision separate services before enabling authenticated previews.
