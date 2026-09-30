# Preserve the foundation layout

The exported `apps/starter` becomes the single VibeScroller public and authenticated deployment. Existing authenticated workspace paths `/app/:org` remain to preserve server authorization. Product screens use `/app/:org/library`, `/proposals`, `/runs`, and settings. `apps/marketing` remains an upstream reference and is not the VibeScroller deployment.

The unchanged pinned lockfile remains the dependency source. Provider HTTP adapters avoid introducing unverified SDK versions. No production identifiers or credentials are imported. Contract validators derive from the supplied JSON schemas. Staging and provider release gates stay independent of source implementation.
