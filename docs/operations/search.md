# Set up Google Search Console

Search Console is for search visibility and ownership verification. It is separate from the Google Cloud OAuth project used for Google sign-in.

## Verify ownership

1. Open [Google Search Console](https://search.google.com/search-console) with the account that will own the website.
2. Add a Domain property for your domain without a protocol or path.
3. Copy the TXT verification value shown by Google. Add it at the domain's DNS root. At Namecheap, use Advanced DNS, TXT Record, and host `@`. Append this record; preserve SPF, email, and other TXT records.
4. Check public DNS for the new record, then choose Verify in Search Console. DNS propagation can delay verification. Keep the record after verification.

Follow Google's [ownership verification instructions](https://support.google.com/webmasters/answer/9008080) if the account or DNS provider differs. The optional `GOOGLE_SITE_VERIFICATION` marketing environment variable supports an HTML-tag verification token for a URL-prefix property; it does not replace DNS verification for a Domain property.

## Submit the website

1. Confirm the production `/sitemap.xml` returns XML with the intended canonical website origin.
2. Submit that absolute sitemap URL in the property's Sitemaps report. For CompanyNerve it is `https://companynerve.com/sitemap.xml`.
3. Inspect the homepage using URL Inspection. Record crawl/index status separately from sitemap submission. Submission does not guarantee indexing or ranking.
4. Revisit reported crawl errors after Google processes the site. Do not add duplicate properties or tracking SDKs just to obtain an immediate report.

Google documents [sitemap reporting](https://support.google.com/webmasters/answer/10351509) and [URL Inspection](https://support.google.com/webmasters/answer/9012289).

## Maintain the implementation

The marketing app uses [Next.js metadata](https://nextjs.org/docs/app/getting-started/metadata-and-og-images) for canonical links, page titles, social images, robots, sitemap, and a factual WebSite JSON-LD record. Update product configuration and page metadata when adding public routes. Do not add fabricated reviews, ratings, customer counts, or offers to structured data.

The application is not an SEO destination. Keep authenticated routes out of the sitemap and retain their noindex metadata and backend access checks. Preview marketing deployments also emit noindex. Robots directives control crawlers, not access permissions.

## CompanyNerve setup status

On 2026-09-11 Google Search Console confirmed verified ownership of the `companynerve.com` Domain property. The submitted `https://companynerve.com/sitemap.xml` reported Success and four discovered pages. Search performance and indexing reports were still processing. This does not claim that those pages are indexed. See [status](../status.md) for subsequent verification evidence.
