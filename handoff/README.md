# VibeScroller implementation handoff

Make scrolling productive.

This package specifies a mobile-friendly web application that turns saved videos into evidence-backed improvements for selected GitHub projects. It includes the public website, the application, billing, privacy controls, a video library, a proposal dashboard, approved coding runs, and draft pull requests.

This is an implementation specification, not an implemented application. No production account, payment, deployment, or social-media import was created or tested when preparing this package.

Start with [the reading order](docs/START-HERE.md). Give the implementation agent [the handoff prompt](IMPLEMENTATION-PROMPT.md) and keep [AGENTS.md](AGENTS.md) at the repository root. The agent must not need the original conversation.

## Files to use first

| File | Purpose |
| --- | --- |
| [PRD](docs/PRD.md) | Required product behavior and release boundaries |
| [Dashboard and mobile UX](docs/DASHBOARD-AND-MOBILE-UX.md) | Screens, states, navigation, and video-to-PR tracking |
| [Architecture](docs/ARCHITECTURE.md) | Component boundaries and the selected stack |
| [Implementation plan](docs/IMPLEMENTATION-PLAN.md) | Ordered work packages and evidence required to complete them |
| [Acceptance tests](docs/ACCEPTANCE-TESTS.md) | Release criteria and failure cases |
| [Unit economics](docs/UNIT-ECONOMICS.md) | Prices, assumptions, cost ceilings, and break-even model |
| [Financial workbook](finance/VibeScroller-unit-economics.xlsx) | Editable inputs, formula-driven scenarios, and customer-count estimates |
| [Handoff validation](docs/PACKAGE-VALIDATION.md) | Checks completed on this package and application tests not yet run |
| [Launch checklist](docs/LAUNCH-CHECKLIST.md) | External configuration and release gates |
| [V2 roadmap](docs/V2-ROADMAP.md) | Proprietary business creation and marketing automation, excluded from V1 |

## Artifact status

Specification version: 1.0.0. Research date: September 30, 2026. Product name and subdomain are working choices, not trademark clearance or proof of domain configuration.

The Markdown files are canonical. The combined handoff is a convenience copy. The financial workbook is an editable view of the model assumptions. The JSON assumptions and Python calculator make its calculations reproducible.

The original writing skills were supplied by the owner. This package applies their plain-language and technical-documentation rules without republishing the original skill files. Source-derived facts, owner decisions, design choices, and unresolved external prerequisites are distinguished in [Sources](docs/SOURCES.md) and [Decisions](docs/DECISIONS.md).

## Repository handling

Create a separate `vibe-scroller` repository. Reuse CompanyNerve through its documented export flow. Do not put this application inside CompanyNerve, Vydero, or another existing product. Do not copy production secrets or provider identifiers from the template.

Keep the public V1 source MIT licensed. Preserve upstream and dependency notices. A supported independent self-hosting distribution is deferred. Users may develop the public source using their own managed-service accounts.
