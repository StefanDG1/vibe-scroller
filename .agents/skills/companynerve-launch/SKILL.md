---
name: companynerve-launch
description: Configure or verify a CompanyNerve-derived website and application launch, including provider environments, authentication, optional billing, DNS, and Google Search Console.
---

# CompanyNerve launch

Read the owner's current request and `docs/status.md` before making changes. Follow `docs/operations/launch.md` for a launch, `docs/operations/environment.md` for configuration scope, and `docs/operations/search.md` for Search Console. Read only the sections relevant to the task.

The marketing site, starter application, and Convex backend deploy separately from one repository. Exported products retain these same implementations and own their provider accounts, data, domains, and design. Change shared server logic rather than adding a second private implementation for the hosted business.

Google Search Console verifies the website and reports indexing. Google Cloud supplies the separate OAuth client used by WorkOS for Google sign-in. Do not confuse a configured OAuth client with verified Search Console ownership.

Resolve the intended provider project and environment before setting values. Keep production secrets out of preview deployments and public prefixes. Use exact callback and DNS values supplied by the selected provider project. Preserve unrelated services and email records.

Free use does not require Stripe. Enable paid checkout only for an actual configured offering; signed backend events and membership checks own entitlements. Use `docs/acceptance.md` when changing auth, billing, revocation, or deletion boundaries.

Use available browser/provider tools within the owner's authorized scope. If login, consent, or a missing account action blocks one step, identify that action and continue independent repository work. A copied skill does not install tools or grant credentials.

Record implemented, tested, deployed, and externally verified separately. Check one representative complete journey after deployment and focused negative cases for changed security boundaries. Do not repeat broad tests without a new change or unresolved failure. Record the exact remaining step when DNS propagation or owner access prevents verification.
