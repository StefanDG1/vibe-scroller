# VibeScroller brand assets

The owner selected 14C / Geometric in black and white on October 6, 2026. The S is cut into a stemless V. The snake-and-bowl reference stays abstract.

## Shared source

[Brand geometry](../packages/ui/brand-geometry.json) contains the fitted SVG path from the selected black concept. [BrandMark](../packages/ui/brand.tsx) renders that geometry using the surrounding monochrome ink. The product uses white on its dark surfaces; the reference marketing frontend uses black on light surfaces and white in its dark recipe.

Public headers and footers, the workspace rail, account header, both browser icons, Apple icons, Android/PWA icons, browser notification assets and social previews use this mark. Decorative SVGs are hidden from assistive technology; links retain the product name.

## Exported files

Both frontends publish the same asset set under `/brand`:

- `mark-black.svg`, `mark-white.svg`: transparent scalable marks.
- `logo-black.svg`, `logo-white.svg`: scalable horizontal logos. Their live text uses Arial/Helvetica fallback; use PNG when an external provider cannot preserve fonts.
- `logo-black.png`, `logo-white.png`: transparent 1440 by 288 logo exports.
- `icon-192.png`, `icon-512.png`: white mark on an opaque black tile.
- `icon-maskable-512.png`: opaque black background with extra padding inside the maskable safe area.
- `notification-badge.png`: transparent monochrome badge for supported notification surfaces.

Root metadata files provide `icon.svg`, a multi-size `favicon.ico`, and a 180 by 180 `apple-icon.png`. The public product social card is monochrome and keeps the existing copy. Its metadata URL includes the `sv14c` version to distinguish it from the previous card.

## Regeneration and verification

Run `pnpm brand:generate` after editing the canonical geometry. The generator uses the locked Sharp dependency supplied by Next. It writes both frontends' assets without new provider access or API charges. `python scripts/create-social-card.py` remains a compatibility entry point for the same generator.

Check the mark at 16, 24, 32 and 48 pixels, in light/dark contexts, at desktop and mobile widths, and in the workspace rail and public footer. Confirm manifest URLs, dimensions, maskable padding and automatic Apple/favicon metadata. Record results in [implementation status](implementation-status.md).

Provider-managed AuthKit sign-in, GitHub App and billing account logos need their own external account readback. The exported files are ready for upload; local asset changes do not establish that those providers or the production deployment were updated. Hosting and permissions remain unchanged. See [ADR 060](adr/060-monochrome-sv-brand.md).
