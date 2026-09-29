# Release checklist

Mode: reference. Each item requires an evidence link, owner, verification date, and status. No item is pre-marked complete by this package.

| Gate | Required evidence | Blocks |
| --- | --- | --- |
| G01 Repository separation | New repo, upstream commit, no inherited production identifiers or secrets | All releases |
| G02 Identity | Actual email-code and Google staging journeys, revocation and deletion | User accounts |
| G03 Tenant security | Cross-workspace test matrix and private asset tests | Paid launch |
| G04 Capture truth | Permitted source sample and unavailable-source fallback | Public capture claims |
| G05 Model evaluation | Rights-cleared quality and cost benchmark with uncertainty | Accuracy and allowance claims |
| G06 Local runner | Windows isolation, pairing, offline, revoke, and Codex tests | Local execution |
| G07 Cloud runner | Real bounded sandbox, broker, termination, cost and data agreements | Complete hosted coding offer |
| G08 GitHub publication | One real draft PR, webhook/reconciliation lifecycle, no duplicate side effects | PR feature |
| G09 Billing | All intervals, credits, cancellation, refunds, wrong-mode and replay tests | Live payment |
| G10 Tax record | Verified ordinary/exempt/special status and effective dates, enabled-country treatment | Live checkout |
| G11 Invoicing | Applicable Romanian reporting workflow and accountant-confirmed scope | Relevant live invoices |
| G12 Operator identity | Confirmed company details and functioning contact channel | Legal publication |
| G13 Policies | Reviewed terms/privacy/refunds/AUP/cookies/DPA as applicable | Paid launch |
| G14 Provider agreements | Actual active provider roles, retention, regions and transfer safeguards | Relevant data processing |
| G15 Domain and host | Authorized commercial host, DNS/HTTPS/callback/cookie tests | Production access |
| G16 Budget | Actual provider cost sample, pre-customer spending cap, margin model, alerts | Funded processing |
| G17 Recovery | Restored staging backup with deletion tombstones applied | Paid launch |
| G18 Accessibility | Mobile and keyboard journey checks, known issues record | Public release |
| G19 Security review | No open critical/high issue in protected boundaries, secret scan, dependency report | Paid launch |
| G20 Website honesty | No fake testimonials, income guarantees, unsupported sync or V2 promises | Marketing publication |
| G21 Support and incident | Functional contact, kill switches, rights workflow, complaint tracking | Paid launch |
| G22 Final smoke test | Authorized production onboarding, tiny live purchase/refund if authorized, real source and repo test | Release completion |

## Evidence that this package does not supply

This package supplies the specification, policy drafts, contracts, financial model, and implementation tests. It does not supply legal approval, a verified company VAT record, production credentials, signed vendor agreements, successful account synchronization, or an implemented application.

## Release labels

`Development` uses local tests and fixtures. `Private preview` can restrict capabilities and customer count, but still protects real data. `Paid V1` requires all applicable gates and the complete hosted path. `V2` is a separate proprietary release with its own account-creation, marketing, and spending review.

Do not release live checkout while its legal or tax configuration is uncertain merely because the user wants a fast launch. Complete the code and sandbox checks while collecting the specific evidence required by G10 through G14.
