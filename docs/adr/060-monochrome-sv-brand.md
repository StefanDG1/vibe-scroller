# ADR 060: monochrome 14C identity

Date: October 6, 2026. Status: accepted owner design decision.

The owner selected logo concept 14C / Geometric and its black-and-white presentation. Its S-shaped negative space sits within a stemless V silhouette, with a subtle snake-and-bowl association. Use black on light surfaces and white on dark surfaces. Existing interface accents are separate from the brand mark.

Keep the native SVG geometry in one shared source, with the same shape in the product, reference marketing frontend, downloadable logos, browser and installed-app icons, notification icon/badge and social previews. The reference marketing app is not the production deployment. Do not change that hosting boundary.

Preserve the accessible product name beside decorative marks. Preserve fixed dimensions, adequate padding, monochrome contrast and Android maskable safe-area spacing. Raster icon exports serve platform compatibility; the UI mark remains SVG.

Regenerate assets with `pnpm brand:generate`. Check formatting, lint, application types, both production builds, generated dimensions and monochrome colors, and desktop/mobile browser rendering. Record actual evidence in [implementation status](../implementation-status.md). Provider-controlled branding and deployment are separate external surfaces; available upload assets do not verify those account updates. See [brand assets](../BRAND.md).
