# ADR 049: Preserve omitted provider-collected checkout country

Status: accepted. Date: 3 October 2026.

The first authorized live browser handoff failed before creating a checkout session. The Managed Payments form intentionally omits its redundant country selector, but the shared form reader converted the missing field to an empty string. The strict backend correctly refused that explicit invalid country. Live checkout was immediately disabled again; no payment was attempted.

Subscription and top-up Server Actions now pass an absent or empty form country as undefined. The backend still rejects explicit excluded countries, requires verified tax-covered Managed Payments enforcement, and refuses direct billing without its separately required country and tax evidence. Stripe collects the actual billing address; the verified country rule remains authoritative. This does not add a default country or weaken provider checks.

The regression exercises both actual Server Actions with FormData and the real payment-route validator. It first reproduced the observed refusal, then passed with omitted/empty country, explicit excluded country and absent-consent preservation, and direct-route refusal. Required authentication/action suite now has fourteen passing tests. Native production acceptance follows deployment; a passing local test cannot establish that handoff.
