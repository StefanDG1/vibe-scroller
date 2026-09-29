# Launch the website and application

Use this guide for CompanyNerve or a newly exported product. The export includes the marketing website, authenticated application, and Convex backend. CompanyNerve deploys those same sources; there is no separate private implementation of authentication or billing.

## Configure the product

1. Set the name, description, website URL, application URL, support email, and design recipe in `packages/company-config/index.ts`.
2. Keep `website.kind` as `product` in an export. It selects the product landing page instead of CompanyNerve's template promotion. Exports remove CompanyNerve's `website.operator` identity and reset the support email. Add verified operator details for your product, review its privacy disclosures, and write its own terms before publishing. The CompanyNerve terms route is intentionally unavailable in product mode; add product terms to the footer and sitemap when ready.
3. Follow [local development](../local-development.md). Use separate provider environments for development and production. Never reuse CompanyNerve's deployment IDs or credentials in an exported product.

## Deploy authentication and data

1. Create this product's production WorkOS environment and application. Enable Magic Auth email one-time codes and Google OAuth only; disable Email + Password and all other methods. Set the exact HTTPS callback, homepage/sign-out origin, and `/sign-in` Initiate login URL. Follow [authentication setup](authentication.md).
2. For Google sign-in, follow [WorkOS's Google OAuth guide](https://workos.com/docs/integrations/google-oauth). Create this product's own Google Cloud project and OAuth web client, copy the exact redirect shown by its WorkOS environment, configure its public branding/privacy URLs, and publish its audience when ready. Store the client credentials in WorkOS. Never inherit the suite's or CompanyNerve's client credentials.
3. Create a production Convex deployment. Set the server variables from [the inventory](environment.md), then deploy the backend. Confirm `/health` responds and anonymous requests cannot bootstrap an identity.
4. Create a Vercel project rooted at `apps/starter`. Use Node 24 and the committed lockfile. Set its production environment variables. The two `NEXT_PUBLIC_` URL variables are public configuration; the WorkOS API key and cookie password are secrets.
5. Scope production credentials to Production only. Either provision isolated preview services or leave preview authentication unconfigured. Do not connect pull requests to customer data.
6. Add the application's custom domain using the exact DNS target shown by the hosting provider. Check HTTPS and callback matching before advertising signup.
7. Verify email-code signup/sign-in, Google sign-in, sign-out, workspace/project creation, and account export in a browser. Check invalid/expired/reused code rejection and the absence of password/reset prompts using [the authentication checks](authentication.md#verify-the-provider-setup). Record which flows passed and clean up synthetic records. Provider configuration alone is not end-to-end evidence.

Google Cloud holds the OAuth credentials needed for Google sign-in. Google Search Console handles website ownership, indexing reports, and sitemap submission. Configuring one does not configure the other.

## Publish the website

1. Create a second Vercel project rooted at `apps/marketing`. It needs no authentication or billing secrets.
2. Connect the website domain and preserve existing email DNS records. Check the canonical URL, social image, sitemap, and robots output on the deployed site.
3. Complete [Search Console setup](search.md). The application and preview deployments must not appear in the public website sitemap.
4. Open signup from the marketing page and complete a session on the application domain. Check mobile navigation and links once after deployment.

## Enable paid services when there is an offer

CompanyNerve's template is free. An unconfigured Stripe deployment presents Free access and does not offer Checkout. The shared billing code remains available to exported products.

When a product has a real paid offer, configure a dedicated Stripe test price, portal, key, mode, and signed webhook as described in [deployment](deployment.md). Verify Checkout, webhook delivery, renewal/cancellation, and entitlement revocation in sandbox. Configure live mode only after deciding the price, customer support, and applicable commercial policies. Never treat a successful checkout redirect as payment authorization; the backend owns entitlements.

## Keep operational evidence

Use Vercel for builds and request failures, Convex for functions/data/jobs, WorkOS for authentication events, Stripe for payments/webhook delivery, and Search Console for crawl/index reports. Restrict provider dashboard access to operators. Customer dashboards use backend membership checks and must not expose provider credentials.

Record the deployed commit, environment, checks, and remaining owner actions in [status](../status.md). Follow the recovery steps in [deployment](deployment.md), and rehearse a restore in an isolated environment before claiming recovery readiness.
