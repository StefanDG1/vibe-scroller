# Configure the production domain and search visibility

Mode: how-to. Selected domain: `scroll.companynerve.com`. Domain configuration is authorized by the owner; parent-domain migration and new purchases are not authorized.

## Current evidence

On 30 September 2026, the parent domain resolved to `dns1.registrar-servers.com` and `dns2.registrar-servers.com`, indicating external Namecheap DNS. No CNAME for the selected subdomain was found. The staging Worker remains under `workers.dev`.

[Cloudflare Workers custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) require a domain in an owned Cloudflare zone. A bare Namecheap CNAME to `workers.dev` does not complete that custom-domain or TLS configuration. Do not create a dangling or unsupported record. Moving the parent domain's nameservers would affect CompanyNerve and unrelated services, so it is outside the authorized subdomain change.

The free Worker returned Cloudflare 1102 during the brand research visit. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) list 10 ms HTTP CPU on Free. Public prerendering is being added to reduce work, but a passing homepage does not prove authenticated SSR fits that budget. Keep production activation gated until the full authenticated workload is measured reliably.

## Select an eligible deployment

Prefer an existing eligible hosting plan if the operator has one. An eligible Vercel deployment can use the selected subdomain through its prescribed external DNS record without moving the parent zone. The previously inspected team had Hobby; do not assume this provides the required commercial permission. Alternatively, a reviewed Cloudflare zone migration plus an adequate Worker plan needs separate operator approval and a full DNS/service inventory first. Do not upgrade a plan automatically.

Once the chosen host supplies exact DNS values, record the existing subdomain records, add only its required record, verify HTTPS/certificate and remove any conflicting subdomain record only after review. Configure the production WorkOS callbacks/session origins, selected-repository GitHub App callback, Convex app URL and CORS, private R2 CORS, webhook endpoints, cancellation/checkout return URLs and email links. Test each on the final domain. Keep staging credentials and synthetic data separate from production.

## Build and verify SEO

Public metadata, canonical URLs and sitemap use the selected domain. The site includes English language metadata, descriptive titles, crawl rules, Open Graph/Twitter metadata and a committed 1200×630 social card. Public product/legal routes are prerendered; private routes remain authenticated and uncached. Legal drafts are not included in the sitemap and remain noindex.

Search indexing stays off by default. Set `SEO_PUBLIC_INDEXING=true` at build time only after the domain works, legal/publication requirements are complete and the operator approves public release. Build a fresh package: adding this variable only at runtime does not rewrite prerendered metadata. Keep staging indexing off. Private app, account, API, share, join and demo pages remain excluded from crawls; crawl rules never substitute for authorization.

Verify canonical URLs, robots, sitemap, preview image, rendered headings/content, private noindex/cache controls, 404s and mobile layout on the final host. Do not add fake ratings, testimonials, accuracy scores or active-checkout offer markup. Search Console verification and sitemap submission require the owner's property access; neither is recorded as complete. Use the four [foundational documents](../foundational/README.md) for evidence-led copy and future keyword/content decisions without promising unverified outcomes.
