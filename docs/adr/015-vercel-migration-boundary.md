# Prepare Vercel without changing the active domain

Status: prepared; hosted cutover pending. Date: 2026-10-01.

Netlify exhausted production build credits after publishing `23375b9` and skipped `96e2fb8`. The owner selected Vercel and deferred purchasing a plan. The authenticated Vercel team still has Hobby. Its current fair-use rules require Pro or Enterprise for commercial deployments, including product advertising. Do not treat protected previews as an exemption or silently begin a trial.

Create one dedicated project, preserve the current Next.js workspace and lockfile, pin Node 24 and pnpm 12.3.4, select Frankfurt functions, configure dedicated encrypted server values only for Production and keep all deployments protected during setup. Leave Git auto-deployment disconnected until the team is eligible. Do not copy upstream CompanyNerve credentials, local subscription tokens or operator documents.

Commit Vercel configuration and explicit local-data exclusions. Verify Linux adapter packaging separately from production deployment; Windows symlink failure is not a successful package. Once the owner upgrades, connect the selected repository, build the reviewed commit and verify the protected host before changing only the existing scroll CNAME to the actual provider-prescribed target. Preserve Netlify as rollback until final-domain authentication and private workflows pass. Billing, tax, legal and execution release gates remain independent.
