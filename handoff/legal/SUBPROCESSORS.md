# Provider and subprocessor register

Status: deployment register draft. Publish only active providers with their verified legal entity, applicable agreement, processing locations, transfer mechanism where needed, and current policy link.

| Candidate | Purpose | Data that may be processed | Activation evidence required |
| --- | --- | --- | --- |
| WorkOS | Authentication | Identity and session information | Product environment, agreement, retention, location and transfer details |
| Vercel or Cloudflare Workers | Web hosting | Requests, account routing, necessary logs | Select actual host; verify processing and logs |
| Convex | Database and workflows | Tenant records, summaries, plans, usage | Actual deployment, agreement, region, backup limits |
| Cloudflare R2 | Private objects | Temporary media, selected evidence, artifacts | Explicit bucket jurisdiction and retention configuration |
| OpenAI | Selected API and coding inference | Audio, selected frames, relevant context | Actual account route, data terms, retention, supported settings |
| E2B | Optional cloud sandbox | Temporary media or selected code snapshot | Sandbox isolation, agreement, termination and location details |
| Stripe | Operator payments | Billing identity, transaction and tax information | Merchant account and selected payment/billing/tax services |
| Resend | Optional transactional email | Email address and minimal message content | Verified sender and relevant processing terms |
| Telegram | User-selected capture and notifications | Linked account ID, submitted links, minimal messages | Bot configuration and clear direct-platform terms |
| GitHub | User-connected repository service | Repo reads, patches, PR metadata | App permissions and user's selected installation |

This table is not a claim that every candidate is legally a subprocessor in every route. Stripe, Telegram, GitHub, and customer-selected AI services may act under their own controller terms for some processing. Record roles by data flow instead of assigning one label to an entire vendor.

The production register must show which providers are mandatory, optional, or customer-controlled. Disabled candidates are omitted from the public active list. The operator records notification dates for provider changes and supports customer objections under the applicable agreement.

No global model-training permission or EU-only processing guarantee is inferred from this list.
