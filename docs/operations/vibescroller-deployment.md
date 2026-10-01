# Deploy VibeScroller

The public source is `StefanDG1/vibe-scroller`. The staging web application is `https://vibescroller-staging.danistefangheorghiu.workers.dev`. Its backend is the dedicated Convex staging deployment `resolute-ladybug-999`. Earlier CompanyNerve deployment instructions describe upstream history and must not be used to deploy this product with upstream credentials.

## Build and stage

1. Install Node 24 and pnpm 12.3.4. Run `pnpm install --frozen-lockfile`, then `pnpm check` and `pnpm audit --prod`. Run secret scanning on the proposed commit and generated deployment package. Preserve failed and skipped checks in the implementation record.
2. Configure the dedicated deployment's environment using `.env.example` and `docs/PROVIDER-SETUP.md`. Keep credentials in provider secret stores or ignored local environment files. Never commit or place server credentials in public Next variables.
3. Deploy Convex functions and schema to the intended staging environment with `pnpm exec convex dev --once`. Production must use a separate deployment and production-specific settings. Do not promote staging synthetic data.
4. Run the GitHub workflow `Package Cloudflare staging` at the exact reviewed commit. It builds on Linux with the exported lockfile, packages the OpenNext Worker and runs Wrangler dry-run. Download the private two-day artifact and verify its commit before deployment.
5. Deploy its prebundled `deployment/worker.js` using Wrangler with `no_bundle`, the generated WASM modules, asset directory and existing staging Worker bindings. Configure server secrets separately. Windows rebundling of this Linux package is not supported by the verified staging procedure. Keep a previous known-good package and Worker version for rollback.
6. Verify hosted authentication, private cache headers and CSP, mobile workflows, storage CORS, provider webhooks and failure states against the exact deployed package. A successful dry-run or public homepage is insufficient.

## Complete external release gates

The hosted staging callback is registered on the dedicated selected-repository GitHub App and the existing staging owner reconnected successfully. Register production separately and test a new user linking GitHub. Confirm WorkOS branding and enabled Google/email-code providers.

Keep live checkout disabled until official company identity, VAT status and required registrations match the chosen production tax mode. The exemption-target mode is a configuration, not evidence that the company qualifies. Publish legal drafts only after their checklist is completed; no legal review has occurred. Validate invoice refund reconciliation, provider costs, margin and production billing before activation.

Keep local execution disabled until reviewed Windows isolation evidence passes. Keep vision disabled until authorized model-license acceptance and a verified free-provider quote exist. Email delivery needs user opt-in and a hosted delivery test. Telegram is deferred and is not required for normal browser use.

Before production, follow [backup recovery](backup-recovery.md) and rehearse a fresh hosted import, retention and deletion against isolated restored data. The offline encrypted staging archive rehearsal does not satisfy hosted recovery acceptance. Verify load/resource limits, provider interruption and execution cancellation. Review generated-artifact secret-scanner candidates, tenant boundaries and private evidence access. Use `docs/implementation-status.md` and `docs/LAUNCH-CHECKLIST.md` for unresolved checks.

The free Worker returned HTTP resource-limit error 1102 on September 30. Public prerendering reduces CPU work, but production still requires verified authenticated capacity on an eligible host. The chosen domain has external Namecheap DNS, so do not point a CNAME at workers.dev or change parent nameservers without the separate reviewed setup. Follow [domain and SEO instructions](domain-and-seo.md). Keep `SEO_PUBLIC_INDEXING` off for staging; opt in at build time only after public release approval. Hosted ChatGPT-plan activation remains disabled even when a user saves its preference; see [ADR 009](../adr/009-chatgpt-plan-protocol.md).

Configure `INVOICE_OPERATOR_SUBJECTS_JSON` only in the intended backend, using explicitly approved active WorkOS subjects. Customer workspace ownership grants no operator permission. Verify private `/account/invoices` access, recent authentication and accountant receipt handling separately per environment. Do not copy staging identities or private PDFs into production source/artifacts.

## Roll back

Redeploy the previous reviewed Worker package and retain the dedicated backend's compatible schema. Web rollback does not undo schema migrations, reservations, provider charges, PRs or webhook events. Reconcile uncertain usage before releasing cost holds. Never automatically retry a coding task that may still be running.

## Netlify production alpha

The owner created the Stefan Free team and approved Netlify/GitHub account access. The dedicated site is `vibescroller-alpha`, with `apps/starter` as package directory, repository root as base, `pnpm --filter @companynerve/starter... run build` as command and `apps/starter/.next` as publish directory. The committed package-level `netlify.toml` selects Node 24, pnpm 12.3.4, no indexing and Next.js skew protection. Netlify manages its Next.js adapter. No plan purchase or automatic paid top-up was made.

The separate Convex production deployment is `bold-lemur-667`. It has production WorkOS configuration and code, without copied staging users or fixtures. WorkOS production is `environment_01M3T5CFGPWW9DZRW9E1V8AGEJ`. Its application callback is https://scroll.companynerve.com/callback. Production web configuration uses a fresh cookie secret and `__Host-vibescroller-production` name. The API key and cookie secret are masked Netlify secret values; all configuration is restricted to Production, without preview access. Keep production previews private and do not expose production credentials to untrusted branch builds.

Namecheap retains the parent domain's existing DNS. A new ownership TXT record and `scroll CNAME vibescroller-alpha.netlify.app` were added; no parent nameserver migration occurred. HTTPS homepage returned 200 with noindex and CSP. Unauthenticated app/private-query requests reach WorkOS sign-in with private/no-store responses. This is authentication entry verification, not a completed signed-in product test. Production Google OAuth is configured; official WorkOS APIs verified the approved owner Google identity and active OAuth session. The Google project remains in Testing with the owner test user. Operator permissions use that production subject. Workspace creation currently returns HTTP 500 and remains an unresolved product test. Email-code login is enabled but its delivery journey still needs verification.

The temporary and custom production addresses share the production frontend. Netlify production visibility is public; previews stay private. Do not treat this as paid launch. Checkout, isolated processing, evidence storage, GitHub callbacks, webhooks, administrator binding, provider contracts and recovery/security acceptance still need their production-specific configuration and tests. The app must show unavailable routes honestly. Keep a tested commit available for rollback and check the current Free credit allowance before issuing additional rebuilds. See [Netlify's current limits/pricing](https://www.netlify.com/pricing/) and [the owner testing guide](owner-testing-guide.md).
