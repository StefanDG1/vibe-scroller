# Restrict reporting evidence to company invoice operators

Status: implemented, default access denied. Date: 2026-09-30.

Customer workspace ownership does not authorize changes to the seller's invoice-reporting record. The existing receipt mutation granted that permission to tenant owners; it now requires an active verified WorkOS subject explicitly configured in server-side `INVOICE_OPERATOR_SUBJECTS_JSON`, plus recent authentication. Matching an email or owning a customer workspace grants no operator role. Malformed or absent configuration fails closed.

The operator-only paginated queue contains invoice compliance metadata across customer workspaces. This is an explicit limited accounting permission; it grants no source, repository, provider-token or customer account access. The private UI lives under authenticated `/account/invoices`, has noindex metadata and inherits private/no-store/CSP protection. Ordinary account pages show its link only to authorized operators. Customer owners can still read their own existing invoice-task view, but cannot write reporting evidence.

Receipt recording is audited, rate limited and idempotent. A recorded reference cannot be silently replaced. Corrections are reconciled with the accountant while the original record remains. A recorded reference is not independently validated ANAF acceptance, automatic document creation or SPV submission. The existing manual accountant workflow remains the initial invoicing adapter; no production invoices are issued for tests.

Tests cover default denial, malformed configuration, same-email/different-subject customers, unauthorized owner writes, explicit operator queue access, recent authentication, inactive accounts, audit, replay and retained evidence. Private operator records and identifiers remain outside GitHub. Hosted UI capacity and actual accountant/SPV operation remain separate release gates.
