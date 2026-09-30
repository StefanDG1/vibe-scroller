# Staging compute cost ceiling

Status: accepted for the dedicated development environment only.

The existing E2B Hobby account has promotional credit and no new purchase was authorized. A pinned two-vCPU, four-GB image passed the ten isolation checks recorded in `infra/e2b-build.json`. Untrusted processes have no IP networking, including loopback access to the sandbox agent. Cloud tasks may now be exercised in this staging environment.

The maximum sandbox lifetime is 1,200 seconds. Staging reserves up to 24 service credits for compute at an operator ceiling of 0.02 credits per second. A credit represents EUR 0.01 of the product allowance. This is a conservative operator quote of EUR 0.0002 per second. It is not a provider invoice, an exchange rate, or proof of actual EUR cost. The published E2B USD resource rate remains a separate reconciliation input. The ledger must continue labeling unverified provider amounts as cost ceilings.

A coding approval must cover its compute reservation plus its explicitly selected inference allowance. Smaller approvals reduce the maximum sandbox lifetime using the configured per-second ceiling, with a minimum reviewed runtime of 30 seconds. The quoted runtime never exceeds 1,200 seconds. The current verified Cloudflare Free route reports zero paid inference credits and has a separate atomic neuron budget. No fallback is permitted. The development trial may approve a 25-credit ceiling; unused reservation is released after successful measured settlement. Failed tasks retain a reservation for reconciliation.

Production activation still requires provider billing reconciliation, account limits, privacy terms and the remaining release checklist. This development setting does not activate production checkout.
