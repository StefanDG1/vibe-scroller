# Keep operator quality reviews separate from free customer trials

Mode: reference. Decision date: October 3, 2026.

## Problem

The approved forty-clip production acceptance stopped at 26 attempts. Its owner workspace remained on the trial tier, so reservations charged both the overall operator budget and the exhausted free-customer trial budget despite being fully backed by separately audited operator quality-review grants. No provider ceiling had been increased and old uncertain usage remained reserved.

## Decision

Choose the budget classification from the actual unexpired credit-pool allocations. A reservation funded entirely by operator_quality_review grants for the currently approved, active operator owner uses the unchanged overall monthly budget. Mixed funding, expired grants, ordinary trial credits and owners removed from the operator audience retain the trial budget. Ordinary customer trials and their ceiling do not change.

The existing grant endpoint remains internal, explicitly gated, owner-bound, idempotent, expiring and limited to 100 credits per grant. It creates no Stripe payment evidence. This change issues no grant, resets no budget, and releases no historical reservation. The separate immutable EUR 10 Google inference ceiling remains enforced before provider use. Settlements use the reservation's saved operator keys, so older holds retain their original accounting.

## Verification

Real Convex test transactions cover exhausted trial exposure, bounded QA reservation/settlement, mixed and expired grants, removed operator eligibility and exhausted overall exposure. The next production acceptance uses the existing grants and overall headroom only; actual outcome is recorded separately. This is accounting for authorized tests, not public release approval or a customer allowance increase.
