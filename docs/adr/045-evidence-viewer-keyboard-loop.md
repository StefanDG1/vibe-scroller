# Keep keyboard navigation inside the frame viewer

Date: October 3, 2026. Status: accepted.

The actual production phone-width source view opened a private decoded frame in the native image dialog, kept the source URL, provided 48-pixel controls and restored the triggering thumbnail after Escape. ArrowRight selected the next timestamp. Tabbing through the three enabled controls could leave document focus, so the prior observation did not establish a complete dialog keyboard loop.

The frame viewer now wraps Tab from the last enabled control to the first and Shift+Tab from the first to the last. Disabled previous/next buttons are omitted from this loop. Native modal semantics, arrow navigation, private image requests, backdrop dismissal and Escape restoration remain in place. No animation was added to keyboard navigation.

Acceptance requires a native browser check on the deployed version: decoded image, source URL unchanged, forward and reverse wrapping, next/previous navigation, Escape dismissal and thumbnail focus restoration. Browser emulation is not an Android hardware test or accessibility certification. The original observation remains recorded as incomplete rather than retrospectively passed.
