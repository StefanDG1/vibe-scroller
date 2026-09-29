# ADR 0001: Keep the starter and future products independent

Status: accepted and implemented. ADR 0002 clarifies the identity/membership boundary.

## Context

The report proposes a shared operating framework. The owner instead wants the template first and separately built, verified products later. A general extension runtime would add complexity before there is a real integration to support it.

## Decision

Keep CompanyNerve's marketing site and sample SaaS in this repository with separate deployable applications. Keep the future products in their own repositories. Introduce a small validated company configuration and versioned identifiers. Do not build a dynamic plugin loader or an agent execution system in the template.

The backend must resolve an explicit active organization and verify current membership. Each private record has one organization owner. Identity comes from WorkOS. Billing status comes from Stripe. A single chosen projection supplies application entitlements. The UI can display these decisions but cannot override them.

Build five distinct design recipes from shared accessible primitives. A recipe owns layout and behavior choices as well as colors. CompanyNerve's brand does not become a compulsory product brand.

## Consequences

A founder can use the template without subscribing to any later CompanyNerve service. Future integrations require a versioned adapter and compatibility evidence. The first few integrations may reveal better abstractions, so only implement interfaces that have actual consumers.

Marketing can be deployed independently. Starter extraction requires a fresh-copy verification milestone. Maintaining five recipes costs more than recoloring one UI, so the acceptance matrix includes every recipe's key states.

## Alternatives

A ten-module monorepo would contradict the owner's separation requirement. Copying Kinetexa or Vydero would bring unrelated domain logic and licensing decisions. A marketing page alone would not meet the eventual reusable-template goal. The chosen structure gives each concern a clear home while keeping the first runtime small.
