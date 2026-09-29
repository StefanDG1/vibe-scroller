# Reuse choices for the hosted template

The hosted CompanyNerve application and exported product use the same Next.js, WorkOS, Convex, and Stripe integration code. Exporting now includes the marketing application as well. A product changes its configuration and design instead of replacing the account and billing implementation.

## Keep the existing integrations

Next.js already supplies the metadata, social-image, robots, and sitemap APIs this site needs. Another SEO runtime package would duplicate that work. The implementation follows [Next.js metadata documentation](https://nextjs.org/docs/app/getting-started/metadata-and-og-images).

The existing shadcn/Radix components and design recipes remain the UI foundation. WorkOS and Stripe SDKs keep provider behavior in supported integrations. These hosted services are not made open source by their SDK licenses. Exported products still need their own provider accounts and configuration.

Replacing the identity or database provider would require migration and renewed tenant, token, deletion, and billing verification. The current request does not need that replacement. Future products can make a separate provider decision before adopting customer data; they do not silently share CompanyNerve's production database.

## Add a focused SEO skill

The repository includes `seo-audit` from [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills), pinned to commit `5b2c0007766c6a1cf1d53fd8fc73e979e0821022`. Its MIT license and supporting references are retained. The snapshot covers crawlability, canonical URLs, metadata, content quality, and evidence-based audit findings. It is guidance, not a ranking guarantee or an installed analytics service.

A [public discussion](https://www.reddit.com/r/SideProject/comments/1spqw1p/found_a_github_repo_20k_stars_that_turns_ai/) includes a favorable account of the framework and comments questioning promotional bias. That is anecdotal feedback, not independent proof of search results. The choice rests on relevant instructions, inspectable source, and a clear license. Star counts and promotional claims are not acceptance criteria.

Upstream references can age. Check current provider documentation before using a named tool, and keep any unavailable upstream helper optional. No paid SEO subscription or analytics SDK is required for the current launch.

## Add project-specific launch guidance

`companynerve-launch` is original MIT guidance that routes founders through the existing operations documents. It records the distinction between Google OAuth and Search Console, production/preview separation, optional billing, and evidence requirements. It adds no deployment daemon, recurring operation, provider credential, or new runtime dependency.

The ten earlier copied skill snapshots remain unchanged. Their existing notices still apply; adding a licensed skill does not resolve the older snapshots' notice gaps.
