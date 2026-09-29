# Verification and release status

Updated 2026-09-11. CompanyNerve is a public alpha template with a live marketing site. The owner selected Cobalt workshop. This record separates implementation from checks actually performed.

## Available now

- [Website](https://companynerve.com), [five designs](https://companynerve.com/designs), and [public repository](https://github.com/StefanDG1/companynerve).
- GitHub template flag, MIT for authored source, private vulnerability reporting, issue/PR templates and CI.
- Separate marketing/starter applications; identity, organizations, roles, invitations, sample projects, quotas, audit records, exports/deletion, Stripe billing example and five design recipes.
- Founder setup, exact environment inventory, architecture/contracts, research/repository assessment, future-product plan, operations and upgrade instructions; ten unchanged skill snapshots.

## Verified

| Boundary             | Evidence                                                                                                                                                                                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source checks        | `pnpm check` passed validation, TypeScript, nine focused backend tests and both production builds. The subsequent account-route/sign-out fixes also passed the starter production build and browser regression checks.                                                                                                               |
| Backend tests        | Anonymous/cross-organization access, invitation ownership/reuse/expiry, roles/revocation/final-owner rule, concurrent quota enforcement, isolated organization deletion, stale/expired/replayed billing, signed/forged/wrong-mode webhooks, key/mode mismatch, and expiry cleanup behind active records.                             |
| Fresh copy           | A fresh exported starter installed with the frozen lockfile, typechecked and built without credentials. A second export verified corrected product name/slug, all documentation links, skill hashes, and placeholder-only environment files.                                                                                         |
| Identity and product | Synthetic verified WorkOS staging identity signed in through the browser, bootstrapped in Convex, created a workspace and project, and signed out back to the local app.                                                                                                                                                             |
| Billing              | Real Stripe sandbox Checkout with the standard test card; signed webhook changed Free to Pro; paid report returned 200. Dedicated portal scheduled cancellation at the period boundary, retaining Pro. Ending the synthetic test subscription delivered revocation; the report returned 403 and UI returned to Free. No live charge. |
| Data                 | Organization export returned 200; deleting the synthetic workspace removed it from the chooser. Account export returned 200 after fixing proxy coverage. Account deletion removed the staging WorkOS identity.                                                                                                                       |
| Marketing            | Homepage, gallery, docs, privacy, robots and sitemap returned 200. All five landing recipes had no horizontal overflow at 1440, 390 and 320 CSS pixels. Representative desktop/mobile screenshots reviewed; button contrast corrected.                                                                                               |
| Domain               | Public DNS resolves to the provider's current targets; valid HTTPS serves companynerve.com. www returns 308 to the apex. Mail records preserved.                                                                                                                                                                                     |
| Secrets and guidance | Current tracked/untracked deliverable files checked against the actual setup secrets: no matches. Ten copied skill snapshots pass SHA-256 integrity validation.                                                                                                                                                                      |

Earlier defects found during browser verification were fixed: shared CSS overrode button text colors, account export missed AuthKit proxy coverage, and account deletion attempted provider logout after deleting the identity. Stripe mode display now comes from the backend, and mismatched key/environment configuration is rejected before provider calls.

## Dependency refresh and Cobalt selection

On 2026-09-11 the owner selected Cobalt workshop. Marketing copy, the gallery and planning documents record that choice. The other four recipes remain available.

After upgrading to TypeScript 7.0.2, pnpm 12.3.4 and the versions in [the upgrade notes](upgrading.md), `pnpm check` passed document/skill validation, workspace type checks, all nine backend tests and both production builds. The Convex-specific TypeScript configuration also passed. A new export installed with `--frozen-lockfile`, typechecked and built without credentials. `pnpm -r outdated --format json` returned no outdated direct packages, and `pnpm audit --json` reported zero known vulnerabilities at the time of the check.

Browser checks against local production builds confirmed the selected Cobalt notice, all five gallery links and no horizontal overflow on the gallery/Cobalt preview at desktop and 390-pixel widths. The Cobalt desktop screenshot was reviewed. The starter homepage rendered and its sign-in link reached WorkOS staging. Full authenticated CRUD and Stripe sandbox flows listed above were verified before this dependency refresh and were not repeated for this update.

CI and marketing deployment results are recorded per commit in GitHub checks and the Vercel deployment history. The local results above do not substitute for those hosted checks.

## Deliberate alpha limits

- A separate production backend and hosted starter deployment now exist. Custom-domain DNS and full authenticated production browser verification remain pending. There is no live payment offering.
- Membership invitations are shareable links, not delivered emails. WorkOS owns identity; no WorkOS SSO organization synchronization is included.
- Cobalt workshop is selected; further visual polish remains possible. Comprehensive accessibility certification, field performance metrics and every browser/recipe/state permutation are not claimed.
- Backup/restore rehearsal, provider-outage drills, production monitoring, live tax setup and a product-specific retention/legal/support policy remain before real customers. Failed identity deletion jobs require an operator after five retries.
- Copied skills retain their original contents/notices. The owner deferred resolution of unclear redistribution rights; the MIT license does not relicense third-party material.
- Future services and standalone products remain separate work. No existing hosting plan or unrelated product was changed.

See [the deployment runbook](operations/deployment.md), [acceptance checklist](acceptance.md), and [next steps](plan.md). A template release does not certify a founder's subsequent deployment.

## Production setup in progress

On 2026-09-11, the production Convex backend deployed, and Vercel created the separate `companynerve-app` deployment from the existing source. Production WorkOS has email/password and a dedicated Google OAuth client enabled. The Google OAuth audience is published. Six app environment values are scoped to Production, with the public URLs stored as configuration and credentials stored as secrets.

Pending: Namecheap login to add the app CNAME and Search Console verification TXT, followed by domain/HTTPS checks, Search Console verification and sitemap submission, and complete authenticated production browser verification. Google OAuth configuration is not evidence that a user completed Google sign-in. PR #2 was closed as an unnecessary Node type major upgrade; runtime-aligned dependency policy is being committed. No hosting plan changed.

Source work adds shared product website export, configuration-driven branding, optional-billing availability, SEO metadata, and launch/SEO skills. Validation and deployment of these source changes are recorded separately after checks run.

### Checks for the shared website export

`pnpm check` passed document/skill validation, workspace type checks, all 10 focused backend tests, and both production builds. A fresh export installed with the frozen lockfile and built both applications without credentials. Browser inspection confirmed exported product branding, placeholder-only links, canonical URL, WebSite JSON-LD, and no horizontal overflow at desktop and 390 pixels. A subsequent footer wording change distinguishes the template source license from a future product license.

The updated Convex production functions deployed successfully. Its health route returned 200, an unsigned Stripe webhook returned 400, and an unauthenticated identity action returned an error. No authenticated production journey is claimed. The working source passed a scan against the actual configured secret values. GitHub reported no open pull requests.

The website/application source changes are prepared on `production-launch` while DNS access is pending. They are not yet promoted to the public marketing site, so the live homepage does not advertise signup on an unresolved app domain.

## Domain and Search Console verification

After the owner signed in to Namecheap, `app` was added as a CNAME to the exact Vercel target, and the Search Console TXT was added at the apex. Existing website and email records were preserved. Authoritative DNS returns both records. Vercel reports Valid Configuration and HTTPS returned 200 using the public resolved target without bypassing certificate verification. This computer's default recursive resolver initially retained NXDOMAIN; browser checks wait for that cache to update.

Search Console confirms verified ownership of the Domain property. Sitemap submission reported Success with four discovered pages. Index/performance reports are processing; no search ranking or indexed-page count is claimed. The prepared source is being promoted to main now that the domain is configured. Authenticated production verification remains separate.

## Production deployment and integration results

Commit `da943890d17f090f37ba8bde1f9fe300e458ccd0` passed GitHub Verify template run `34593054776`. Both Vercel deployments reported success: app `2PR6RXLwZqiUrUz8EjpJ73XA9wft` and marketing `Cika398EFGbKAF4iYryFSMSeaM6a`. The live homepage has the canonical apex URL and links signup to the custom app domain. No open pull requests remained.

Hosted inspection found production email/password disabled in WorkOS. It was enabled, saved, and confirmed after reload with the Strong password policy. The hosted signup form presents email signup and Google.

A synthetic identity created as email-verified through the provider API authenticated with a password against the production client. Its WorkOS token bootstrapped in production Convex, created a workspace/project, read that project, and exported organization/account data. Unconfigured Checkout rejected the request. Cleanup removed the workspace and identity; WorkOS returned not found for the synthetic user. This API check does not verify email delivery, browser cookies, or Google callback completion.

The owner attempted Google OAuth and reached the app callback, but the local network DNS resolver still returned NXDOMAIN for the new app hostname. Public resolvers and authoritative DNS returned the correct target; HTTPS returned 200 with certificate verification. The owner chose to keep current DNS settings and wait. No browser or network DNS setting was changed. After the cache expires, start a fresh sign-in from the custom app domain and verify the session, dashboard, and sign-out. An earlier callback may have expired or belong to another application origin. The full Google browser journey is not yet verified.

## Passwordless template and CompanyNerve legal pages

The pre-existing, uncommitted status block begins at `## Production deployment and integration results` and ends immediately before this `## Passwordless template and CompanyNerve legal pages` heading. Its original text is unchanged. This task's status additions begin at this heading; preserve the earlier block's original hunks when committing.

On 2026-09-11 the owner replaced password login with email one-time codes and Google OAuth only for CompanyNerve and its generated applications. This supersedes the earlier password setup/checks above, which are preserved as historical evidence. Each product owns its WorkOS environment, Google OAuth client/consent branding, callbacks, and session secret. No suite credentials are inherited.

Implemented: starter sign-in guidance, setup-page wording that distinguishes environment presence from provider verification, placeholder environment comments, authentication/local/launch guides, exported README/agent instructions, and acceptance criteria. Hosted AuthKit continues to own login, PKCE, callbacks, and sessions. Passwords must be disabled in WorkOS; there is no application environment switch that can apply or verify that provider setting. Backend membership and billing logic are unchanged.

The owner authorized English CompanyNerve legal pages using company-published facts from exponentialeducation.ro privacy/terms plus the reused Stripe profile postcode. No independent registry validation was performed. Privacy now describes the website and hosted app's actual data flows, retention/deletion limits, rights, and contact. Terms describe the free alpha and preserve MIT source-license rights. The legal notice uses EXPONENTIAL EDUCATION S.R.L., CUI 54790758, Trade Register J2026035424002, EUID ROONRC.J2026035424002, the published Iasi address and reused postcode, and contact@exponentialeducation.ro. Footer navigation and sitemap include the new pages. Exports remove the operator identity, reset the support email, and do not promote CompanyNerve-specific terms for another product. No education-product services or payment promises were copied.

Tested: `pnpm check` passed document/skill validation, workspace type checks, all 11 tests (10 backend tests plus the export regression), and both production builds. After the final footer wrapping and export-test updates, the marketing production build, workspace type checks, all 11 tests, and `node scripts/validate.mjs` passed again. Export checks exercise exclusion of synthetic local secrets/provider metadata, empty credential placeholders, removal of the original operator/contact, valid generated configuration, and rejection of overwriting an existing product. Generated legal HTML was checked for headings, canonical URLs, consistency with the supplied company-published facts and postcode, navigation, sitemap entries, and absent reset-password links. The original uncommitted status text remained byte-identical. A local scan found no known configured secrets in changed deliverables.

Deployed: none of these changes in this repository task. No commit or push was made.

Externally verified provider settings: the main task has now separately confirmed the CompanyNerve template/demo project's dashboard settings, as recorded below. The earlier Services/LaunchProof confirmation was not evidence for this project. Real email delivery, Google consent/callback completion, and the current public sign-in presentation remain unverified here. No browser/provider manipulation or completed email/Google browser journey is claimed by this repository task. Exact provider retention periods, regions, and transfer agreements remain unverified. No other product repository was changed; the owner's LaunchProof legal-source record was read only for the supplied company facts. Vydero and Kinetexa were untouched.

Follow-up correction and output check: the initial passwordless confirmation belonged only to Services/LaunchProof; template/demo settings remained pending until the later confirmation below. A fresh isolated export installed offline with the frozen lockfile and built the marketing application without credentials. Its generated privacy page uses the product name, example canonical URL, and owner@example.com contact, without CompanyNerve's legal identity. Generated `/legal` and `/terms` output has 404 response metadata and is absent from legal navigation and sitemap until product-specific policies are supplied. These are local output consistency checks, not a legal, security, provider, or compliance audit.

### Main-confirmed CompanyNerve dashboard settings

The main task subsequently confirmed CompanyNerve's own WorkOS project on 2026-09-11:

- Production: environment `environment_01M276PHWKGCWRMCWZA55H2BH9`, client `client_01M276PJ1H7BVM29E088TRT2W6`. Magic Auth enabled, Email + Password disabled, Google already enabled with this project's own production credentials, and all other methods disabled.
- Staging: environment `environment_01M276PH4316WK42SFEXJ4Y66B`, client `client_01M276PHMNBT6XE308W1CMBSTT`. Magic Auth enabled, Email + Password disabled, Microsoft/GitHub/Apple disabled, and Google enabled using WorkOS demo credentials for staging only. This does not verify an independent Google client or product consent branding for staging.

No source credential values changed. These dashboard results are reported by the main task. Real email delivery, Google consent/callback completion, and a fresh public sign-in check showing Google plus email without password prompts remain pending. Source deployment and end-to-end authentication evidence remain separate from these saved provider settings.

Final local handoff: after recording the main-confirmed CompanyNerve dashboard settings, `pnpm check` passed again: 34 documents and 12 skill snapshots validated, workspace type checks passed, all 11 tests passed, and both production builds passed. The working tree is ready for the main task's review/commit, including the new authentication guide, legal pages/shared component, and export regression test. No credentials changed, no commit/push/deployment was performed here, and browser authentication evidence remains pending as listed above.
