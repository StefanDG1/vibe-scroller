# Acceptance criteria

These are release requirements, not current pass results. Track evidence by commit in [status](status.md).

## Planning foundation

- Local repository exists under `C:\Code\CompanyNerve`, with `main` tracking the public GitHub repo.
- The documentation identifies the current scope, proposed work, missing source brief, commercial decision, and remaining verification.
- Five reviewable visual concepts have distinct composition, type, and color choices.
- Ten copied skills retain supporting files and source hashes. No machine-specific absolute path is required to read them.
- Foundation validation passes; committed files contain no credentials or customer data.

## Starter behavior

- A fresh export can install reproducibly using the committed package-manager version and lockfile.
- Setup errors identify the missing variable or integration without displaying a secret.
- Hosted signup/sign-in offer email one-time codes and Google only, with passwords and other methods disabled. Wrong, expired, and replayed codes fail; both successful methods complete the app callback and sign-out. See [authentication verification](operations/authentication.md#verify-the-provider-setup).
- A founder can rename/rebrand the sample, sign in, create/switch organizations, invite a member, and create a sample resource.
- Cross-tenant access fails for list, direct ID read, mutation, export, and file operations when present.
- Role escalation fails. Removing the final owner fails until ownership transfers. Revoked members lose access within the documented bound.
- Stripe sandbox checkout and portal work. Only verified server state grants entitlements. Duplicate, old, forged, and wrong-environment events have tested outcomes.
- Account export and deletion behave as documented, preserve another tenant's data, and recover from interruption.
- Runtime limits and sensitive-route authorization are tested through real server entry points.

## Design and marketing

- All five recipes support marketing, auth, dashboard, settings, forms, tables, and loading/empty/error states.
- Check 390px mobile and 1440px desktop layouts for each recipe, plus a 320px overflow check. Verify keyboard focus, labels, error association, color contrast, and reduced motion. Aim for WCAG 2.2 AA and record actual findings rather than claiming certification.
- CompanyNerve's selected landing page explains the template within its first screen, shows real release screenshots, and distinguishes included features from later services.
- Primary links and forms work. No simulated checkout, dead waitlist form, invented testimonial, fabricated metric, or implied vendor endorsement ships.
- Metadata, canonical URLs, Open Graph assets, robots policy, sitemap, favicon, 404s, and mobile navigation match the deployment.
- Measure production performance. Initial targets: LCP at most 2.5 seconds, CLS at most 0.1, and INP at most 200ms when field data exists. Lab measurements are labeled as lab results. Performance targets do not substitute for functional checks.

## Operations and distribution

- Development, preview, and production use separate data and credentials. Preview indexability and access are deliberate.
- Domain records match the deployment provider's current instructions. Both apex and www behave as intended over valid HTTPS.
- Record a successful deployment, an isolated restore exercise, and a rollback procedure with the release commit.
- A second fresh product generated from the template completes the documented setup without hidden global files or original-account IDs.
- Exports omit local credentials and provider metadata. Each generated app configures independent WorkOS and Google OAuth credentials; suite credentials are never inherited. Saved provider settings and completed authentication are recorded separately from source/build checks.
- The distribution license, third-party notices, privacy/terms requirements for collected data, security contact, and supported-version policy are resolved before public release.
- A free template release does not require purchase of a future CompanyNerve service.

## Appropriate verification

Use Vitest/convex-test for rules and server behavior. Use browser interaction for the signup/org/billing journey and browser interaction. Use visual review for layout; automated checks alone cannot choose a good design. Do not write redundant tests for decorative details. Re-run broader checks when a change crosses these boundaries, not as a ritual after every prose edit.
