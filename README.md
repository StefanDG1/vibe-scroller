# VibeScroller

A web application for capturing permitted video sources, reviewing cited insights, matching ideas to repositories and approving bounded coding plans. Built from CompanyNerve 0.1.0-alpha.1 with its exported foundation and lockfile.

The owner personal alpha is at https://scroll.companynerve.com/app. Start with [the testing guide](docs/operations/owner-testing-guide.md) or [automatic video analysis](docs/PERSONAL-VIDEO-GUIDE.md). Production personal uploads passed automatic local Whisper transcription and sampled-frame ChatGPT-plan analysis. Instagram Saved import saves links and metadata locally from the archive; supported public links use bounded automatic retrieval. Private, rate-limited and unsupported posts can require permitted-media fallback. The paired laptop must remain online for the personal route.

[V1 readiness](docs/V1-READINESS.md), [implementation evidence](docs/implementation-status.md), [deployment instructions](docs/operations/vibescroller-deployment.md), [versioning](docs/VERSIONING.md) and [release gates](docs/LAUNCH-CHECKLIST.md) distinguish tested alpha behavior from paid V1 readiness. No private archive, company record or production credential is included.

Use Node 24 and the pinned pnpm version. Run `pnpm install --frozen-lockfile`, follow [local setup](docs/local-development.md), then run `pnpm dev` for the app or `pnpm dev:marketing` for the website.

Both applications share company configuration, design recipes, and UI. Authentication, tenancy, billing and shared design packages extend the exported CompanyNerve foundation. No credentials or production data are included.

Authentication uses email one-time codes and Google OAuth only. Follow [authentication setup](docs/operations/authentication.md): enable Magic Auth and Google in your own WorkOS environment, disable passwords and other methods, and provision this product's own Google OAuth client/consent branding, callbacks, and session secret. Never inherit CompanyNerve or suite credentials. Exporting source does not configure or verify providers.

Edit `packages/company-config/index.ts`, replace the example domains and support email, and choose your recipe. Review marketing copy and privacy disclosures for your product before publishing. Follow [launch operations](docs/operations/launch.md) for hosting, authentication, billing, and search setup.

Run `pnpm check` before deployment.
