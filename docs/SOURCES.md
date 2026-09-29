# Sources and verification limits

Mode: reference. Reviewed September 30, 2026.

## Evidence classes

`Owner decision` means a requirement supplied in the conversation. `Verified documentation` means a current source was read, not that the integration was tested. `Design` means a proposed implementation rule. `Assumption` means an editable planning input. `External gate` means evidence is still required before activation.

The numerical forecasts are original calculations from explicit assumptions. They are not claims made by the cited providers.

## Source register

### S01. CompanyNerve README

Source: https://github.com/StefanDG1/companynerve/blob/main/README.md

Connected repository read. Export command, selected services, authored-code licence. README blob bb7113c3e4c44e283ee1634e280180d05126f2f2.

### S02. CompanyNerve verification status

Source: https://github.com/StefanDG1/companynerve/blob/main/docs/status.md

Connected repository read. Historical local and sandbox tests do not certify VibeScroller. Status blob c9a4a6082c2b7cc801328683b0b8bb103311d3b1.

### S03. CompanyNerve company configuration

Source: https://github.com/StefanDG1/companynerve/blob/74642451d605dcad43546ddf651097960615810e/packages/company-config/index.ts

Connected code-search excerpt supplies operator name, address, tax identifier, and registration identifiers. Not an independent registry check.

### S04. Codex app-server

Source: https://developers.openai.com/codex/app-server/

Official embedded Codex interface, authentication, approvals, and streamed events. Current page redirects to learn.chatgpt.com/docs/app-server.

### S05. Codex authentication

Source: https://developers.openai.com/codex/auth/

Official ChatGPT and API authentication routes. Subscription eligibility remains account-specific.

### S06. Sign in with ChatGPT

Source: https://help.openai.com/en/articles/20001410-sign-in-with-chatgpt

Identity sign-in and separately granted permissions. Not proof of unrestricted third-party subscription inference.

### S07. OpenAI API pricing

Source: https://developers.openai.com/api/docs/pricing

Audio, tool, and model prices. Prices are inputs to estimates, not measured product costs.

### S08. GPT-5.4 mini model

Source: https://developers.openai.com/api/docs/models/gpt-5.4-mini

Published text/image support and standard USD 0.75 per million input tokens, USD 4.50 per million output tokens at review.

### S09. Mini transcription model

Source: https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe

Candidate API transcription model. Pricing page gives an estimated USD 0.003 per audio minute.

### S10. WorkOS Next.js integration

Source: https://workos.com/docs/authkit/nextjs

Hosted authentication integration. Runtime configuration and callbacks must be verified in staging.

### S11. WorkOS device authorization

Source: https://workos.com/docs/authkit/cli-auth

Browser-mediated CLI sign-in. Use a documented flow or the app-specific one-time pairing flow, never a distributed client secret.

### S12. WorkOS pricing

Source: https://workos.com/pricing

AuthKit allowance and separately priced products. Do not assume paid SSO, Vault, or Pipes is free.

### S13. Vercel pricing

Source: https://vercel.com/pricing

Pro begins at USD 20 monthly. Included usage is an allowance, not a cash refund.

### S14. Vercel fair-use guidelines

Source: https://vercel.com/docs/limits/fair-use-guidelines

Hobby is for non-commercial personal use.

### S15. Convex pricing

Source: https://www.convex.dev/pricing

Free and usage-based options plus Professional at USD 25 per developer monthly. Use current plan limits, not invented unlimited capacity.

### S16. Convex workflow component

Source: https://github.com/get-convex/workflow

Durable workflow, retry, and external-event building block. Pin the version after integration tests.

### S17. Cloudflare Workers pricing

Source: https://developers.cloudflare.com/workers/platform/pricing/

Paid base starts at USD 5 monthly. Budget deployment alternative, not a promise about all costs.

### S18. Next.js on Workers

Source: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/

OpenNext deployment guidance. Test selected Next.js and authentication features on this runtime.

### S19. R2 data location

Source: https://developers.cloudflare.com/r2/reference/data-location/

EU jurisdiction selection differs from a location hint. Storage jurisdiction does not establish inference residency.

### S20. E2B pricing

Source: https://e2b.dev/pricing

Usage-based Hobby has no base subscription. Published CPU and memory rates support the sandbox estimate. Introductory credits are excluded from recurring economics.

### S21. E2B sandbox documentation

Source: https://e2b.dev/docs/sandbox

Candidate isolated cloud worker and coding environment. Required security controls still need verification.

### S22. Instaloader options

Source: https://instaloader.github.io/cli-options.html

Documents authenticated saved-post access. Does not establish reliability, user-specific success, or platform permission.

### S23. yt-dlp

Source: https://github.com/yt-dlp/yt-dlp

Download adapter for supported URLs. Source and distributed binaries can have different dependency licence obligations.

### S24. faster-whisper

Source: https://github.com/SYSTRAN/faster-whisper

Local ASR candidate. Benchmark the actual laptop and source material.

### S25. Repomix

Source: https://github.com/yamadashy/repomix

Repository context preparation and ignore/security checks. Not an isolation boundary or complete secret detector.

### S26. GitHub webhook events

Source: https://docs.github.com/en/webhooks/webhook-events-and-payloads

Pull-request events support merge tracking. Reconcile authoritative PR objects after missed or reordered events.

### S27. Telegram Bot API

Source: https://core.telegram.org/bots/api

Official bot capture, webhook secret, and update handling. Link receipt is not proof that media can be fetched.

### S28. PWA share targets

Source: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target

Share-target support varies across browsers. Keep paste and upload fallbacks.

### S29. TikTok portability data types

Source: https://developers.tiktok.com/doc/data-portability-data-types

Favourite Videos can appear as dates and links in the relevant archive. Do not assume raw media or a narrower scope contains them.

### S30. TikTok Data Portability API

Source: https://developers.tiktok.com/products/data-portability-api

Approved integration for eligible EEA and UK accounts. Access is not assumed for this app.

### S31. Stripe Romanian pricing

Source: https://stripe.com/ro/pricing

Published payment fees vary with card origin, card class, conversion, and purchased products. Finance assumptions separate estimated blends from list prices.

### S32. Stripe subscription webhooks

Source: https://docs.stripe.com/billing/subscriptions/webhooks

Async billing lifecycle. Checkout success alone does not authorize paid access.

### S33. Romanian Ordinance 22 of 2025

Source: https://legislatie.just.ro/Public/FormaPrintabila/00000G1K9U70MSLJAAZ26912OPR54DON

Official legislation includes RON 395,000 small-business threshold effective September 2025. Qualification and existing registrations still matter.

### S34. EU One Stop Shop

Source: https://vat-one-stop-shop.ec.europa.eu/one-stop-shop_en

Conditional EUR 10,000 threshold, destination treatment, and OSS framework. Not a worldwide VAT exemption.

### S35. EU small-business VAT scheme

Source: https://sme-vat-rules.ec.europa.eu/index_en

Cross-border exemption scheme has its own authorization conditions. Disabled unless applicable authorization is recorded.

### S36. GDPR principles

Source: https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr_en

Purpose limitation, minimization, retention, and accountability. Supports the private-by-default design, not a compliance certificate.

### S37. EU consumer returns and withdrawal

Source: https://europa.eu/youreurope/citizens/consumers/shopping/returns/indexamp_en.htm

Consumer distance-contract rights and service exceptions. Product policy must not replace statutory rights with an invalid waiver.

### S38. AI Act transparency obligations

Source: https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act

Assess relevant transparency duties for the actual role and outputs. UI labels alone are not claimed to satisfy every obligation.

### S39. Stripe API key protection

Source: https://docs.stripe.com/keys

Separate keys, restrictions, and protection. V2 businesses use their own merchant credentials.

### S40. Convex self-hosting

Source: https://docs.convex.dev/self-hosting

Self-hosting availability and backend licence must be checked separately from MIT application code.

### S41. MIT licence

Source: https://opensource.org/license/mit

Permissive application licence. Does not relicense dependencies, media, or third-party documents.

## Supplied materials

The owner supplied `SKILL.md` and `SKILL(1).md`, covering plain-language editing and layered technical writing. They were read in full. This package follows their rules without copying their complete text.

The Library copy of `Foundational Docs SOP.docx` contains the Mark Builds Brands sequence of sales-page review, research, avatar, offer, and necessary-beliefs work. The retrieved section is ecommerce-oriented. This package adapts the sequence for SaaS and does not claim to reproduce unprovided linked documents or every SOP in a collection. The owner states that the creator allowed use. That statement is retained as permission provenance, not converted into a named licence.

## Announcement that remains unverified

Earlier discussion referenced `https://learn.chatgpt.com/siwc/token-sharing-open-source` and `https://openai.com/index/devday-2026-recap/`. Those pages did not provide usable documentation during this verification. They are not authority for the hosted integration. No fallback uses private ChatGPT endpoints.

The verified basis for local subscription use is the official Codex authentication and app-server documentation. A future commercial subscription-inference adapter requires documented eligibility, endpoint, scopes, token handling, permitted workloads, and limits before activation.

## Provider and legal rechecks

Recheck prices, scopes, SDK compatibility, platform conditions, retention, data regions, and applicable law before a public release. Preserve a dated source snapshot or change record. Never label this source register as an independent security audit, legal opinion, registry verification, or transcription benchmark.

## Additional sources checked during drafting

### S42. Romanian accounting retention

Source: https://legislatie.just.ro/Public/DetaliiDocument/263884

Law 36/2023 amends the accounting-document retention period to five years calculated from July 1 of the year following the relevant financial year. The implementation must also account for applicable exceptions and specific tax records.

### S43. RO e-Factura deadline

Source: https://legislatie.just.ro/Public/DetaliiDocument/305817

OUG 89/2025 amends the relevant transmission rules to five working days, subject to the statutory invoice-issue limit. Apply only to transactions in scope. The source's broader unrelated provisions are not product requirements.

### S44. Stripe Billing price

Source: https://stripe.com/en-ro/billing/pricing

The reviewed pay-as-you-go Billing price is 0.7% of Billing volume. Standard European card pricing shown on the page is 1.5% plus RON 1. The model uses a higher blended card assumption rather than claiming every payment has the standard rate.

### S45. Stripe Tax pricing

Source: https://stripe.com/tax/pricing

The model reserves a 0.5% tax-calculation fee where enabled. Confirm the account's region and selected Stripe Tax integration before using the assumption as an invoice-level price. The requested Romanian-specific page did not load, while the general page redirected to another locale.
