# Deployment and operations

## CompanyNerve deployment

The public marketing app is the Vercel project `companynerve-marketing`, rooted at `apps/marketing`, in the existing `stefandg1s-projects` team. The first successful deployment used commit `c28177a`. Git pushes to main trigger deployment. Marketing has no Convex, WorkOS or Stripe credentials. The existing Hobby plan was preserved; no unrelated project was removed.

The local starter still uses dedicated development/staging services and Stripe sandbox resources. A separate production backend `gregarious-panda-197` and Vercel project `companynerve-app`, rooted at `apps/starter`, now exist. The latest owner decision requires email one-time codes and Google only, with passwords disabled. Earlier email/password provider setup is historical. The main task has now confirmed CompanyNerve's own WorkOS dashboard settings below, separately from Services/LaunchProof. Production application variables are scoped to Production only. The application domain is `app.companynerve.com`; its DNS is configured. Real email delivery, Google consent/callback completion, and the current public sign-in presentation still need browser verification. There is no live paid offering. See [launch operations](launch.md) and [status](../status.md) for the remaining checks.

### CompanyNerve template/demo authentication settings

The main task confirmed these dashboard settings on 2026-09-11. The environment IDs were supplied by the main task; full client IDs and app URLs match the existing local environment files. These are public identifiers, not credentials.

| Environment | WorkOS environment ID | WorkOS client ID | Main-confirmed settings |
| --- | --- | --- | --- |
| Production | `environment_01M276PHWKGCWRMCWZA55H2BH9` | `client_01M276PJ1H7BVM29E088TRT2W6` | Magic Auth and Google enabled; Email + Password and all other methods disabled. Google uses this project's own production credentials. |
| Staging | `environment_01M276PH4316WK42SFEXJ4Y66B` | `client_01M276PHMNBT6XE308W1CMBSTT` | Magic Auth enabled; Email + Password, Microsoft, GitHub, and Apple disabled. Google enabled with WorkOS demo credentials, for staging only. |

Production callback: `https://app.companynerve.com/callback`; app origin: `https://app.companynerve.com`; Convex: `https://gregarious-panda-197.convex.cloud`. Staging callback: `http://localhost:3001/callback`; app origin: `http://localhost:3001`; Convex: `https://adjoining-dodo-394.convex.cloud`.

Staging's WorkOS demo Google credentials do not establish an independent production OAuth client or verify this product's Google consent branding. Every generated product still needs its own production credentials. No source credential values changed in this repository task. A separate WorkOS application ID, hosted AuthKit URL, and Google-to-WorkOS redirect URL are not recorded here; use the selected environment's dashboard rather than inferring them from a client ID.

## Domain record and rollback

On 2026-09-11, Namecheap parking records were replaced with the exact targets shown by Vercel:

| Host | Before                                                | After                                      | TTL        |
| ---- | ----------------------------------------------------- | ------------------------------------------ | ---------- |
| @    | Unmasked URL redirect to http://www.companynerve.com/ | A 216.198.79.1                             | 30 minutes |
| www  | CNAME parkingpage.namecheap.com.                      | CNAME f92f7debe2587d09.vercel-dns-017.com. | 30 minutes |

Email Forwarding and the TXT value `v=spf1 include:spf.efwd.registrar-servers.com ~all` were preserved. Nameservers were not changed. Vercel connects the apex to Production and redirects www to the apex with HTTP 308.

For a website regression, promote the previous known-good deployment in Vercel. To reverse the domain migration itself, restore only the two prior website records above. Do not alter mail records. DNS rollback has propagation delay. A web rollback does not reverse database changes.

## Deploy your own starter

1. Export the starter and follow [local setup](../local-development.md). Provision services in your own accounts.
2. Create isolated development, preview and production Convex/WorkOS environments. Do not point preview at production data. Choose regions and plan limits deliberately.
3. Deploy the backend with the Convex CLI against the intended deployment. Set the environment variables from [the inventory](environment.md) in the correct server scope.
4. Create a separate Vercel project rooted at `apps/starter`. Use Node 24, the pinned pnpm version and the app's Next.js build command. Import the workspace lockfile, not an independent app lockfile.
5. Set the public Convex URL, this product's WorkOS server credentials, a new random session secret, exact callback URL and canonical APP_URL. Register that callback and the absolute APP_URL as an allowed sign-out URI with WorkOS, plus APP_URL + `/sign-in` as the Initiate login URL. Enable email codes and Google only with passwords disabled; provision independent Google OAuth credentials using [authentication setup](authentication.md). Configure the same APP_URL in Convex for checkout returns.
6. If billing is needed, create your own test product/recurring price and a dedicated portal configuration. Register the Convex HTTP URL plus `/stripe/webhook` for checkout.session.completed, customer.subscription.created/updated/deleted, invoice.paid, and invoice.payment_failed. Configure its signing secret and test mode. Use a restricted API key with the necessary permissions where possible.
7. Check sign-in/out, organization creation/switching, invitation acceptance and revocation, a paid sandbox journey, cancellation and export/deletion. A successful build alone does not verify provider setup.
8. Before real customers, set production secrets, support/legal identity, retention and backup policy, monitor provider failures, and rehearse a restore into an isolated deployment. Configure live billing and tax only when the product requires it. CompanyNerve's free template does not require a live price.

## Background jobs and recovery

Convex runs billing reconciliation hourly. Paid access expires if verification is more than 24 hours old, so a prolonged provider outage fails conservatively. Inspect Convex logs and the billing projection; an owner can trigger a refresh after provider recovery.

Expired invitations and old rate-limit/event records are removed in indexed batches by the daily cleanup job. Organization deletion locks the organization before paged purging. User identity deletion retries five times; failed `deletionJobs` remain visible in the Convex dashboard. After resolving the WorkOS error, an operator can invoke internal `identity:finishDeletion` with that job ID from the authorized deployment console. Keep job IDs and credentials out of public reports.

Account deletion retains organization-authored content and audit references. Organization deletion purges organization-owned example data, but Stripe records are retained under the provider account's own retention rules. Set a product-specific policy before launch.

## Repository operations

The source is public, MIT for authored material, and enabled as a GitHub template. Private vulnerability reporting is enabled. CI uses read-only repository permissions and pinned action revisions. See [upgrading](../upgrading.md) before applying template changes to an existing product.

The `app` CNAME points to `81207fe880e8d647.vercel-dns-017.com.`. A separate Google Search Console verification TXT is present at `@`. These additions preserve the apex/www and mail records above. The domain remains on Namecheap nameservers; Vercel supplies the app hosting target.
