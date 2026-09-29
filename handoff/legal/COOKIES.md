# Cookies and similar storage

Status: review draft, not yet effective. Version: 1.0.0.

## Necessary storage

VibeScroller uses necessary session and security storage to sign you in, protect requests, remember essential privacy choices, and operate the selected workspace. These functions are required for the requested service and are not used as an excuse to enable unrelated advertising tracking.

The implementation must generate an exact inventory from the deployed application, including cookie or storage name, provider, purpose, duration, and first-party or third-party scope. Do not publish invented cookie names or claim that this general draft is an inventory.

## Optional storage

Optional analytics, marketing identifiers, and session replay are off by default. Session replay is not part of the initial product. Where consent is required, do not load optional scripts before consent.

The consent interface provides equally accessible Accept optional, Reject optional, and Manage choices controls. Necessary storage is described separately. Withdrawing consent must stop future optional processing and remove local identifiers where appropriate.

No consent banner is required solely as decoration when only necessary storage exists. The cookie information and settings remain available. Add the consent interface before enabling nonessential tracking.

## Browser and PWA data

The PWA caches public application assets. It does not cache private transcripts or repository data in a shared service-worker cache. An optional offline capture draft is labeled as unsent and cleared when its account context changes.

You can remove site data in your browser. Doing so can sign you out or remove unsent drafts, but it does not itself delete records stored in your online account. Account deletion is available through the privacy settings.
