# Configure provider accounts

Mode: how-to. These steps are external setup work, not evidence that configuration already exists.

## Record setup states

For each provider, record `not_started`, `user_attested`, `connected`, `verified`, `test_passed`, and `live_ready`. A checkbox can move a manual task to `user_attested`. It cannot grant `verified` or `test_passed` without evidence.

Store evidence references and dates, not screenshots containing secrets. Keep production and sandbox state separate.

## Configure WorkOS

Create VibeScroller's own environment. Enable email one-time codes and Google sign-in. Disable password login for the intended product policy. Configure the actual callback and logout origins and a product-specific Google consent client where required.

Set credentials in the deployment secret store. Complete a real browser sign-in, refresh, sign-out, email delivery, and account-deletion test. Source-presence checks do not prove provider settings are enabled.

## Configure GitHub

Register an app for selected repositories. Grant metadata and content read for analysis. Add content, pull-request, and optional issue write only for approved publication features. Do not request administration or workflow write by default.

Configure signed webhooks and store the private key only in the trusted backend. Install on a disposable test repository and verify access removal. Show selected repositories in onboarding and let the user pause each one.

## Configure AI

Set the managed API credential and allowed model registry. Record pricing, data terms, and spending limits. Test transcription, image input, structured output, rate-limit handling, and cancellation accounting with bounded paid calls.

For local coding, let the runner start official Codex authentication. Verify a supported session without exporting its token. Keep broader hosted subscription inference disabled until the official commercial contract and tests are recorded.

For BYO keys, test encryption, rotation, redaction, revocation, and provider-cost disclosure. Do not ask users to send a key in Telegram or support email.

## Configure storage and execution

Create the private EU-jurisdiction bucket and restricted upload/download identities. Enable lifecycle rules and verify deletion. Configure the cloud sandbox account with conservative resource and spend limits. Build the pinned images and test isolation before enabling the cloud button.

## Verify the public-link worker

For the optional personal alpha, build the separate acquisition image with `node --env-file=.env.local scripts/e2b-acquisition-build.mjs`, then run `node --env-file=.env.local scripts/e2b-acquisition-test.mjs`. A failed check leaves the image unverified. Set backend-only `E2B_ACQUISITION_TEMPLATE` to the exact verified `pinnedTarget` and `ACQUISITION_VERIFIED=true` only after the matching evidence exists. Preserve `MEDIA_VERIFIED`, the original pinned media image and its reviewed compute rate. Do not put E2B credentials or local ChatGPT credentials into browser configuration.

This worker retrieves permitted supported public posts, without login cookies. Platform rate limits, removed/private posts and unsupported carousels remain saved links with explicit failures. Isolation evidence does not establish reliable access to every Instagram post. See [ADR 018](adr/018-bounded-public-link-acquisition.md).

## Configure Stripe

Use the dedicated VibeScroller Stripe account under Exponential Education SRL, as authorized on October 2. Reuse verified legal-entity details through Stripe's supported flow. Verify charge/payout readiness, payout details, currency, support contact and statement descriptor in the actual account. Do not alter the education platform's prices, keys, subscriptions or webhook routing. See [ADR 017](adr/017-dedicated-stripe-and-managed-payments.md).

The preferred launch route is Managed Payments, subject to its account/product eligibility and operator acceptance of the provider terms. Prepare it in a dedicated sandbox first. Stripe handles covered customer-sales VAT and transaction invoices through Link. Keep direct-sale tax modes as alternatives; never silently fall back from a refused Managed Payments checkout to direct processing.

Provision the catalogue using the matching deployment-independent secret environment: STRIPE_SECRET_KEY, STRIPE_ACCOUNT_ID and STRIPE_MODE. Run node scripts/stripe-catalogue.mjs for test mode; live mode requires the separately authorized --live flag. The command checks the credential's own Romanian account before mutations. It prints only configuration IDs and readiness flags, never keys. Its output deliberately leaves LIVE_CHECKOUT_ENABLED=false. Configure the dedicated portal, signed webhook, country policy and provider approvals before activation.

Create the six subscription prices and optional top-up products in sandbox first. Add stable metadata identifying VibeScroller and the catalogue version. Use separate environment IDs. Configure customer portal actions and the signature-protected webhook endpoint.

Test payments, retries, proration, renewal, cancellation, refunds, failed cards, and wrong-mode events. Record the actual tax status and required invoice workflow before enabling live checkout. The owner reports live readiness, but a VibeScroller-specific live journey remains a separate test.

## Approve production billing

The app exposes the complete catalogue only when all six V1 price IDs, the matching account/key mode, signed V1 webhook and portal configuration exist. Sandbox availability is independent of live activation. Live checkout, top-ups and plan changes additionally require LIVE_CHECKOUT_ENABLED=true and BILLING_RELEASE_APPROVED=true; Managed Payments also requires STRIPE_MANAGED_PAYMENTS_VERIFIED=true. Leave all three false until the corresponding provider, consumer-scope, publication and workflow acceptance is recorded. These switches are backend configuration, never customer-controlled form values.

Every V1 provider mutation verifies the credential’s own account. Checkout reservations are shared by the subscription and top-up routes. Only a signed paid event with the current reservation key clears that reservation early; a late event cannot clear a newer checkout. Provider identity or release failures do not authorize a direct-payment fallback.

Signed-in Stripe documentation can hydrate example snippets with actual API credentials. Use unauthenticated official documentation or redact credential patterns before returning any browser text, accessibility names or screenshots. Do not print complete signed-in documentation pages. Never create a replacement broad sandbox key merely to view documentation.

## Configure notifications

Create the Telegram bot, secret webhook, and pairing flow. Test numeric-user binding, duplicate updates, unlinking, safe previews, and a malicious URL. Configure transactional email with a verified sender. Keep optional marketing separate.

## V2 account ownership

Generated customer businesses must use their own Stripe merchant accounts, GitHub repositories, hosting projects, WorkOS environments, database projects, email providers, analytics, and advertising accounts.

The setup assistant guides users to official account creation and authorization pages. It can record a completed manual step and then verify the connection. It cannot fabricate business identity, bypass KYC, defeat CAPTCHA, or accept provider terms on someone's behalf without appropriate authorization.

Never substitute the operator's Stripe account when a customer has not connected theirs. Keep the generated business in setup mode until required customer-owned accounts are verified.
