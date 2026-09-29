# vibe-scroller

Created from CompanyNerve 0.1.0-alpha.1.

Use Node 24 and the pinned pnpm version. Run `pnpm install --frozen-lockfile`, follow [local setup](docs/local-development.md), then run `pnpm dev` for the app or `pnpm dev:marketing` for the website.

Both applications share company configuration, design recipes, and UI. Auth, billing, and dashboard code are the same code used by CompanyNerve. No credentials or production data are included.

Authentication uses email one-time codes and Google OAuth only. Follow [authentication setup](docs/operations/authentication.md): enable Magic Auth and Google in your own WorkOS environment, disable passwords and other methods, and provision this product's own Google OAuth client/consent branding, callbacks, and session secret. Never inherit CompanyNerve or suite credentials. Exporting source does not configure or verify providers.

Edit `packages/company-config/index.ts`, replace the example domains and support email, and choose your recipe. Review marketing copy and privacy disclosures for your product before publishing. Follow [launch operations](docs/operations/launch.md) for hosting, authentication, billing, and search setup.

Run `pnpm check` before deployment.
