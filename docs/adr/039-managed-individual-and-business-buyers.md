# ADR 039: Managed individual and business buyers

Status: accepted. Date: 3 October 2026.

The owner explicitly approved individual and business purchases after native unpaid sandbox Checkout retained its business-purchase option despite business-name collection being disabled. Do not claim that name collection enforces consumer-only scope or alter provider-controlled tax fields to hide it.

Starter and Pro are available to both buyer types under the verified tax-covered Managed Payments country policy. The provider determines actual eligibility and applicable tax treatment from Checkout details. Link supplies the transaction invoice. Exponential Education keeps its separate settlement and provider accounting records; no duplicate transaction invoice is created. Business purchase does not add enterprise administration, a service-level agreement or custom pricing. Consumer protections remain applicable to people legally acting as consumers.

Keep direct billing separately gated, restricted-country enforcement intact, and no automatic fallback. Preserve the October 2 consumer-only decision as history. Updated legal drafts and the foundational brief reflect the new scope without claiming legal review, customer demand or public release completion.

Evidence: outputs/managed-consumer-control-observation.json records the native card form and business control, with purchaseAttempted false. The explicit owner decision is in the task conversation. Existing country enforcement, sandbox subscription lifecycle and accountant handover evidence remain separate. No real-money purchase was tested.
