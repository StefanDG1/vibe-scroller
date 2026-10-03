# ADR 050: Require checkout return origin before readiness

Status: accepted. Date: 3 October 2026.

After the country-form fix reached c4a32c89c63ae7ad4865444f8af6133d451b4590 in production, the unpaid native handoff reached the backend but failed with Invalid URL. Independent production configuration showed APP_URL absent. Live checkout was immediately disabled again. The frontend's configured domain did not establish the backend's return URL. No card or payment was submitted.

The production backend now explicitly uses https://scroll.companynerve.com. Catalogue readiness requires a valid canonical return origin. Both subscription and top-up handlers validate it before contacting Stripe or writing an acceptance/checkout intent. Live returns require HTTPS and reject loopback, credentials, paths, query strings and fragments. Sandbox can additionally use HTTP on loopback only. A missing origin cannot advertise available checkout.

The six focused readiness/top-up tests passed, including refusal before provider calls and billing-intent writes. Full checks and exact production/native acceptance are recorded in the implementation status. The already-created unpaid customer record and unchanged idempotent intent are retained for reconciliation; an error does not grant credits or prove a purchase.
