# Move VibeScroller to Vercel

Mode: how-to. Prepared on 1 October 2026. Production cutover is pending.

The dedicated [VibeScroller project](https://vercel.com/stefandg1s-projects/vibe-scroller) is created in the owner's existing team. It uses Next.js, Node 24, `apps/starter` as root, repository workspace files outside that root, and Frankfurt (`fra1`) functions. The application package pins pnpm 12.3.4 and Node 24; production enables Corepack to preserve the exported lockfile. No plan purchase occurred.

## Before deployment

Upgrade `stefandg1s-projects` to Pro. Its inspected plan is Hobby. Vercel's [fair-use rules](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage) require Pro or Enterprise for commercial deployments, including sites advertising subscriptions. A protected preview does not establish an exception. The project has no Git connection or deployment yet, so future main pushes cannot accidentally deploy it before this gate is resolved.

Production environment values are already configured only for Production: dedicated WorkOS identity/callback/cookie, Convex `bold-lemur-667`, canonical `APP_URL`, consent-gated PostHog, dedicated private R2 and the selected-repository GitHub App client ID. Server values are encrypted. Preview and Development have no copied production credentials. The existing R2 bucket has a legacy staging name but belongs to VibeScroller; bucket public access must remain disabled. Local ChatGPT OAuth credentials are never uploaded to Vercel.

All deployments currently require Vercel authentication. Preserve that protection during verification. After the operator approves the verified public production cutover, use standard preview protection while allowing the final production domain. WorkOS app authentication, private CSP and tenant checks remain enforced separately.

## Build and connect

1. Run the normal repository checks and confirm the exact main commit passed `Verify template` and received its immutable alpha version. Run the manual `Verify Vercel adapter` workflow at that commit. This Linux check packages functions without deploying or using production secrets. It is not a hosted authentication test and its output is not a production release artifact.
2. Confirm the team now has Pro through its billing page or the authenticated CLI. Do not accept a trial, add a payment method, or upgrade on the operator's behalf.
3. In the existing project's Git settings, connect only `StefanDG1/vibe-scroller`; do not import a duplicate project. Select main as production branch. If GitHub requests new consent or installation permission, have the owner approve and choose only this repository.
4. Confirm root `apps/starter`, include workspace files outside root, frozen-lockfile install, pinned package manager, Frankfurt region and protected previews. Keep Production values out of preview targets and untrusted branch builds. Let Vercel build the reviewed source on Linux.
5. Verify the protected deployment with Vercel's authenticated access, public routes and private response headers. Register any temporary testing callback/origin explicitly before testing sign-in on a different domain; the configured callback currently returns to `scroll.companynerve.com`. Do not infer final-domain authentication from a preview homepage.

The Windows adapter check compiled Next.js and types but failed final packaging with `EPERM` when creating a function symlink. Do not deploy its partial `.vercel/output` or change Windows security settings to force packaging. Use the Linux workflow and Vercel's managed Linux build.

## Switch only the subdomain

1. Add `scroll.companynerve.com` to the existing Vercel project and obtain its actual prescribed DNS target and any ownership TXT record. Do not guess a target or change parent nameservers.
2. Record the current Namecheap `scroll` CNAME, which targets `vibescroller-alpha.netlify.app`. Preserve unrelated root/app/launch/www/mail records. Configure only Vercel's prescribed scroll records after its deployment is ready.
3. Verify DNS, certificate, HTTPS, canonical links, noindex, secure cookie, Google sign-in, default workspace, library import, upload grant/completion, private evidence, transcript navigation and the laptop runner on the final domain. Retain the canonical WorkOS/GitHub callbacks, Convex links and R2 CORS for that same domain.
4. Confirm the account menu's build version matches the verified commit. Test billing in the separate sandbox; hosting migration does not activate live prices or close tax/legal gates.
5. Keep the Netlify site available during verification. If migration fails, restore the recorded scroll CNAME. A frontend rollback does not reverse backend schema changes, jobs, PRs or provider charges.

## Current hosting limitation

Netlify published `23375b9`, then skipped `96e2fb8` because this cycle's 300 credits were exhausted by 20 production deployments. Operational credits keep the current site online but do not permit another production build. The latest GitHub version and the live build therefore differ. No Netlify upgrade, Vercel upgrade, DNS cutover or live charge has been made. See [implementation evidence](../implementation-status.md).
