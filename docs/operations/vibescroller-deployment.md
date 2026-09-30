# Deploy VibeScroller

The private source is `StefanDG1/vibe-scroller`. The staging web application is `https://vibescroller-staging.danistefangheorghiu.workers.dev`. Its backend is the dedicated Convex staging deployment `resolute-ladybug-999`. Earlier CompanyNerve deployment instructions describe upstream history and must not be used to deploy this product with upstream credentials.

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

## Roll back

Redeploy the previous reviewed Worker package and retain the dedicated backend's compatible schema. Web rollback does not undo schema migrations, reservations, provider charges, PRs or webhook events. Reconcile uncertain usage before releasing cost holds. Never automatically retry a coding task that may still be running.
