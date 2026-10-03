# Include Managed Payments and advanced screening in launch costs

Mode: reference. Decision date: October 3, 2026.

The selected launch route uses Stripe Managed Payments, while the original calculator modeled direct payment fees. Retain the legacy scenarios and add three full-allowance Managed Payments scenarios for mixed intervals, annual intervals and Starter annual subscriptions. The additional 3.5 percent fee uses the full gross transaction amount including indirect tax. Separate payment and subscription Billing fees remain; the separate Tax-calculation fee is zero because Managed Payments supplies that handling.

Include the owner-authorized RON 0.31 advanced Radar screening quote with an explicit 1.1 screened-attempts-per-success assumption. This is a planning multiplier, not observed traffic, and does not charge ordinary included fraud handling twice. Preserve the existing tax, FX, overhead and credit-cost scenarios rather than inventing actual company costs or billed conversion rates. Source: https://support.stripe.com/questions/managed-payments-pricing?locale=en-GB, inspected through the native signed-in browser October 3.

Ten Python invariant tests passed, including gross fee basis and separate screening exposure. The editable workbook preserves its seven worksheets and legacy formulas; 39 result cells reconcile with the Python scenarios. Changing the Managed Payments rate and screening multiplier recalculated their affected results without changing the legacy base. The workbook formula scan found no errors and the changed ranges were visually inspected. Native Microsoft Excel was not tested.

These scenarios reach the 60 percent operating-margin target at 16 mixed-interval customers, 27 all-annual customers or 30 Starter annual customers under the retained assumptions. These are estimates, not observed profits; fees, refunds, infrastructure and actual usage require later invoice reconciliation. No customer price or allowance changes.
