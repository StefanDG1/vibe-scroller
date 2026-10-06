---
name: VibeScroll
description: Scroll's charcoal studio for saved knowledge, project decisions and permitted next actions.
colors:
  ink: "#f4f4f4"
  canvas: "#141918"
  panel: "#1d2421"
  line: "#39453f"
  muted: "#b3bdb7"
  accent: "#87dfc1"
  accent-ink: "#10251e"
  amber: "#f3c785"
  soft: "#262626"
  rail: "#171717"
  control: "#202020"
  control-line: "#3d3d3d"
  composer: "#232323"
  menu: "#252525"
  selected: "#2a2a2a"
  primary-hover: "#d8d8d8"
  primary-text: "#141414"
  chip-text: "#bdbdbd"
  error: "#fca5a5"
  focus: "#d4d4d4"
typography:
  studio-headline:
    fontSize: "clamp(26px, 3vw, 38px)"
    lineHeight: 1.18
    letterSpacing: "-0.025em"
  studio-body:
    fontSize: "16px"
    lineHeight: 1.6
  headline:
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(24px, 2.2vw, 32px)"
    fontWeight: 550
    lineHeight: 1.3
    letterSpacing: "-0.035em"
  title:
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "16px"
    fontWeight: 550
    lineHeight: 1.5
    letterSpacing: "-0.025em"
  source-headline:
    fontSize: "clamp(20px, 2vw, 27px)"
    lineHeight: 1.3
  body:
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "14px"
    lineHeight: 1.6
  source-body:
    fontSize: "13px"
    lineHeight: 1.6
  label:
    fontSize: "13px"
    lineHeight: 1.6
  metadata:
    fontSize: "12px"
    lineHeight: 1.6
rounded:
  chip: "5px"
  menu-item: "8px"
  field: "9px"
  control: "10px"
  thumbnail: "12px"
  panel: "14px"
  dialog: "16px"
  circle: "50%"
spacing:
  tight: "4px"
  small: "8px"
  control: "10px"
  row: "12px"
  standard: "16px"
  section: "20px"
  panel: "24px"
components:
  studio-action:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.control}"
    padding: "10px 17px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 17px"
    height: "44px"
  field:
    backgroundColor: "{colors.control}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
    height: "44px"
  navigation-item:
    textColor: "#b5b5b5"
    rounded: "{rounded.field}"
    padding: "10px 12px"
    height: "44px"
  navigation-item-selected:
    backgroundColor: "{colors.selected}"
    textColor: "#ffffff"
  chip:
    backgroundColor: "{colors.menu}"
    textColor: "{colors.chip-text}"
    rounded: "{rounded.chip}"
    padding: "4px 9px"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
    padding: "24px"
  menu:
    backgroundColor: "{colors.menu}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "6px"
  source-notes:
    textColor: "{colors.ink}"
    padding: "12px 0"
    height: "44px"
---

# Design System: VibeScroll

## Overview

**Creative North Star: "Scroll's studio"**

VibeScroll uses green charcoal surfaces, meaningful mint actions and warm amber original artwork. Scroll is the owner's always-present guide: a soft folded-paper creature with expressive dark eyes, a curled tuft and mint bookmark. Familiar controls, readable rows and restrained framing keep the artwork approachable without competing with evidence. The owner pinned this world in the October 7 evolution request; no direction roll, seeded round or QUALITY BAR card is claimed. The first surface's composition stays in [the studio direction contract](docs/design/vibescroll-studio.md).

Content, actual state and permitted actions establish hierarchy. Source icons identify media without inventing thumbnails. Panels remain subdued so titles, evidence and the next action carry attention. [PRODUCT.md](PRODUCT.md) records the product constraints; the four foundational documents remain the copy brief. This document does not change copy, establish benefit, or approve legal publication.

**Key Characteristics:**

- Dark charcoal and green-gray surfaces with mint actions and amber artwork.
- Original Scroll artwork remains present in the normal shell and onboarding.
- Compact text hierarchy and quiet borders.
- Readable source rows rather than nested decorative cards.
- Accessible menus, visible focus and generous touch targets.
- Short motion tied to state changes and evidence arrival.

## Colors

The palette separates quiet surfaces by brightness and green-gray hue. Mint signals useful actions and connections; amber gives Scroll warmth and marks its short state caption. Existing white controls remain part of the system.

### Primary

- **Mint and accent ink:** the studio principal action, knowledge-map selection and meaningful connection indicators; dark text keeps mint-filled controls readable.
- **Ink:** bright reading text and retained white save/legacy primary controls; dark primary text keeps those controls legible.
- **Primary hover:** gently dims filled controls in response to pointer interaction.

### Secondary

- **Amber:** Scroll artwork and state captions. The illustration contains its own painterly shading rather than a flat recolor.

### Neutral

- **Canvas, rail and panel:** establish the dark page, slightly lighter navigation and contained settings/evidence surfaces.
- **Control, composer and menu:** distinguish editable fields, capture and floating choices.
- **Line and control line:** separate rows and define fields without heavy framing.
- **Muted and chip text:** support secondary explanation, metadata and state labels.
- **Selected and soft:** indicate selected navigation and hover responses.
- **Focus:** clearly identifies keyboard interaction.

The historical `--teal` property still resolves to Ink: it does not make every retained control mint. Error uses a pale red alongside explanatory text. Success and pending states use explicit labels, never color alone. The frontmatter records the effective studio cascade; rail, fields, menus and selected navigation retain their older neutral fills.

**The Meaningful Accent Rule.** Use mint for permitted studio actions and connections, amber for Scroll's warmth, and preserve retained neutral reading controls. Neither color proves success or benefit.

## Typography

**UI Font:** Inter with system UI, Apple system, BlinkMacSystemFont, Segoe UI and sans-serif fallbacks. The app declares this stack; it does not load Inter through `next/font` in the root layout. **Code Font:** UI monospace with monospace fallback.

The console uses an intentionally close reading scale, medium headings and normal case. Source titles use the Title role, descriptions use Source body, and metadata uses Metadata. Panel headings are slightly larger (18px); navigation uses compact UI text (14px). Status chips are small labels (11px), never a substitute for the readable state explanation.

Page headings use Headline; mobile page and capture headings settle at 25px. Source titles reduce to 14px on mobile. The capture field stays at 16px. Source descriptions limit line length to 70ch; general paragraphs limit it to 72ch.

The studio next-action heading uses Studio headline with balanced wrapping; at 768px and below it uses `clamp(23px, 5vw, 30px)`. Studio body is 16px, reducing to 14px for the next-action explanation on phones. Shelf headings are 20px, row titles 16px and row metadata 13px. The next-action block is bounded to 55ch and its explanation to 48ch.

**The Reading Hierarchy Rule.** Keep title, explanation and metadata distinct through scale, weight and neutral contrast; use concise sentence case labels instead of ornamental eyebrows.

## Layout

The desktop shell is a flex layout with a sticky full-height rail (244px), compact top toolbar (64px), and content column capped at 1120px. Main content padding is 32px 40px 64px. At 1050px, the rail narrows to 220px and main padding becomes 28px.

At 720px and below, the rail gives way to Home, Library, Projects, Save and More, with the account trigger in the sticky top toolbar. Main content uses 24px 16px 104px padding to clear the fixed bottom navigation. Bottom navigation includes safe-area padding. Core surfaces must remain usable at the confirmed 320 CSS pixel width.

The capture composer has a bounded width (680px) and source rows have thumbnail, flexible text and an optional open control. Filters wrap on mobile; source-row open controls yield to the linked source title. Settings and evidence use panels with desktop padding (24px) and mobile padding (18px). Private evidence frames use a responsive grid with columns that fit the available width and contained imagery.

The studio welcome pairs a 192px-wide character with the next action, separated by `clamp(20px, 4vw, 56px)`. Knowledge and project shelves use a 1.2fr/1fr grid with a 42px gap. At 768px and below shelves stack with a 26px gap; the character narrows to `clamp(84px, 25vw, 130px)` and the welcome gap is 16px. The header keeps a linked workspace name beside compact Scroll on phones (14ch maximum, ellipsis when needed); a collapsed rail must not remove visible scope. Composer and review spacing remain generous enough to distinguish capture from history.

**The Touch Target Rule.** Interactive controls keep at least a 44px target; small type and icons do not justify a smaller hit area. Informational chips are not controls.

## Elevation & Depth

The shell uses tonal layering and thin separators. Source rows sit directly on the canvas, panels have quiet borders and the toolbar separates from content with a dark line. The account menu alone carries a soft floating shadow (`0 12px 32px #0006`). Dialogs dim the surrounding surface (`#0009`) rather than decorating the dialog with a dramatic shadow.

**The Flat Surface Rule.** Keep routine content flat; use floating depth for a menu or modal that temporarily interrupts the underlying task.

## Shapes

Fields and navigation have restrained rounded corners. Controls use the Control radius, panels and menus use Panel, dialogs use Dialog, and badges use Chip. Circular avatars and composer send controls are purposeful exceptions. The capture composer has a softer containing outline (18px radius), while library rows have straight separators and no enclosing card radius.

Scroll uses the original transparent warm paper-creature artwork; the 192px/240px home image and compact 36px/44px shell mark share the same still asset. Phone header Scroll is 26px/34px. Status wording changes with authoritative next-action state; separate expression artwork is not implemented. [Artwork provenance](apps/starter/public/scroll/PROVENANCE.md) records generation and the alpha-preserving WebP derivative without claiming trademark clearance.

Lucide line icons communicate navigation, media type and actions. Supplied personal reference screenshots remain local reference material, not bundled imagery.

## Components

### Buttons

The studio main Button uses mint fill, dark text, 500 weight, 8px 16px padding, 10px corners and a 44px minimum target. Hover reduces opacity to 0.9; keyboard focus uses a 2px mint outline with a 4px offset; disabled opacity is 0.5. Retained save and legacy primary controls use white. Those controls are bright, compact and medium weight (550). Secondary controls are transparent, bordered and equally usable. Hover dims primary fill or brightens the neutral secondary surface. Keyboard focus uses a visible outline (2px) with a gap (3px). Disabled controls reduce opacity (0.45); pending controls show a spinner and disable duplicate submission. Icon controls are square (44px) with an accessible name.

### Scroll and studio shelves

Scroll stays visible in the normal shell and Home. The home character is a named greeting button with a state caption; compact shell artwork is still. Shelf rows use an 80px minimum height, 14px 8px padding, 8px corners and quiet top separators between rows. Mint line icons identify sources and projects; muted arrows identify the row action. Recent-source coverage stays explicit: current-page records are not full-library totals. Later dismisses a suggested next action locally; it does not complete or approve it.

### Inputs / Fields

Fields have a dark fill, restrained outline and readable placeholder. The link composer groups input and circular submit into one containing field; focus brightens its containing border instead of drawing an inner outline. Checkbox labels provide a full control target and keep permissions explicit.

### Navigation

Desktop navigation uses line icons, text and occasional informational counts. Hover brightens the row; selection has a lighter neutral fill and stronger text. Radix account menus use compact rows with keyboard highlight and collision-aware placement. The mobile account trigger keeps its target while showing only the avatar. More exposes secondary destinations without overloading bottom navigation.

### Chips

Coverage, state and tags share a small neutral badge. They supplement source text and never imply completed analysis solely from their styling. Synthetic demo badges remain explicit.

### Cards / Containers

Library items are rows with thin bottom separators, a quiet media icon and a readable linked title. Settings, plans and evidence use bordered panels. Empty views keep a plain background, a short explanation and a relevant action. Notices use a neutral raised fill and live output for action feedback; errors also use the error color and precise explanation.

### Processing and private evidence

The implemented personal-video UI shows prepare, transcribe and analyze stages, an explicit automatic-analysis permission choice, private frame access and original transcript inspection. Current and completed steps brighten their labels; pending work uses a spinner. Recorded verification now includes a real production upload whose generation-one personal-alpha analysis completed automatic Whisper transcription and sampled-frame ChatGPT analysis using gpt-5.6-sol at medium reasoning. This observed completion does not establish global production readiness, legal approval or audiovisual completeness.

### Source overview and analysis notes

Source detail leads with an exact-text overview drawn from the retained summary, followed by the coverage caution and a native disclosure, then Main points. Long summaries shorten at a sentence boundary within 280 characters where possible, otherwise at a word boundary with an ellipsis. The original complete summary remains available in the disclosure when shortened; all analysis warnings, the original source link and capture metadata remain there. The disclosure summary has a 44px minimum target, vertical padding (12px), visible keyboard focus and a small open-state gap (8px).

**The Visible Limits Rule.** Keep the sampling and automatic-transcription caution visible for sampled audiovisual coverage while placing the retained full summary and detailed analysis notes in the disclosure.

### Consent

Consent uses the same dark material, rounded modal and full-size controls. Allow and reject have equal prominence, preferences remain accessible through the account menu, and withdrawal is a visible action. Consent presentation is an implemented interaction, not a legal approval.

### Motion

A requested greeting rocks Scroll once for 650ms with `cubic-bezier(0.16, 1, 0.3, 1)`. The eligible save CTA sweeps once for 750ms after an 1800ms delay. Pointer interaction, focus, completion, disabled state, page hiding, reduced motion and the interface-motion preference stop the effect. The still character remains visible when motion is off. These are local acknowledgments; no looping attention effect is implemented.

Color and border responses run briefly (140ms ease-out). Account menus reveal with clip and opacity (120ms ease-out); source rows and capture dialogs enter with a small vertical change and opacity (180ms ease-out). A pending spinner rotates steadily (800ms). Reduced-motion preferences disable animations and transitions and remove thumbnail movement. Motion acknowledges a change; it must not delay reading or action.

### Library categories and sorting

Keep search and filters in the existing dark control style. Use accessible names for unlabeled selectors, 44 px controls and wrapping layouts on narrow screens. Search uses relevance and disables date/title sorting until cleared. A source row displays its insight count, a short point preview and up to four category names; the full row opens actual details. Category editing lives in a native disclosure within those details, with saving, error, empty and success behavior using the existing operation state. Shared suggestions are a separate owner/admin choice with a concise privacy explanation.

Source thumbnails use the first retained private frame when available, load lazily and fade in over 160 ms. Failed or unavailable evidence retains the media-type icon. Reduced motion disables the fade. The image goes through the tenant-checked no-store endpoint and bypasses public image optimization. Completed sources show their insight count without a redundant ready label. Phone filters each keep a usable full-width touch target.

### Plan review

Review scope, affected files, implementation steps, checks, rollout and rollback in editable fields. File rows distinguish existing and new files and retain 44 px removal controls. On phones the path fills a row, with the change selector and removal control below it. JSON stays in a native disclosure for import and advanced edits. Invalid JSON remains intact until corrected; it never becomes a silently accepted plan.

| Before                                        | After                                           | Why                                                       |
| --------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| JSON was the only editor                      | Labeled plan fields and optional JSON           | Review does not require editing serialized syntax         |
| A new draft stayed behind a disclosure        | Current unconfirmed draft fills the editor      | The next review step is visible; saving remains explicit  |
| Blank steps or checks met array length limits | Save rejects empty steps, checks and file paths | A plan must specify work and verification before approval |

October 2 native Chrome checks covered 320, 360, 390, 412, 768 and 1440 CSS pixels without page overflow. Private captures include plan-editor-local-mobile.png and plan-editor-staging-saved-mobile.png. Saving the labeled staging plan created version 2 and a 64-character hash; it did not start coding. These checks do not certify the generated recommendation's usefulness or a full PR journey.

### Permanent source reading

| Before                                                                                                                                       | After                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| A source detail existed only in client state; reload returned to the library. Refreshing a first page could remove an older selected source. | A tenant-scoped source URL restores the selected record, and background refresh reads that record independently of the paginated/filter result. |

Retain the existing dark overview, main-point cards and 44 px controls. The actual local detail stayed readable at 320/360/390/412/768/1440 without page overflow. A filtered library with zero rows still returned its separately authorized selected source. Native clicking, reload and background refresh passed; an initial automation reloaded before asynchronous navigation finished and was corrected. Invalid/deleted source links reveal no private record. This verifies source navigation and its states, not a complete mobile execution/PR journey.

### Public policy reading

| Before                                                        | After                                                                     | Why                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------- |
| Separate website copies could omit newer merchant disclosures | Build/dev synchronize canonical drafts; validation rejects stale copies   | The displayed policy must match the reviewed source     |
| Markdown references and lists appeared as literal text        | Safe semantic Markdown with working policy links and list/table structure | Readers can follow their rights and payment disclosures |
| Wide provider tables were plain wrapped text                  | A keyboard-focusable horizontal table region inside the dark article      | Preserve readable columns without phone page overflow   |

No animation is needed for reading policies. Raw HTML and image loading are disabled. Link transformation accepts secure provider/contact links and known policy references; executable, credential-bearing and protocol-relative URLs are rejected. Review-draft status stays visible until actual publication approval. Browser verification follows the production build.

## Do's and Don'ts

### Do:

- **Do** use charcoal, meaningful mint and warm Scroll artwork with concise sentence case interface copy.
- **Do** keep Scroll present while allowing animation to stop; preserve visible workspace scope on phones.
- **Do** keep loading, empty, ready, success and error feedback tied to actual state.
- **Do** preserve visible keyboard focus, 44px controls and reduced-motion behavior.
- **Do** keep permissions and private evidence access explicit.

### Don't:

- **Don't** treat the bounded CTA sweep as permission for decorative gradients, looping effects or fabricated thumbnails. A light theme remains a separate owner decision.
- **Don't** add ornamental eyebrows, zero-count hero metrics or a recurring explanatory motto.
- **Don't** convert a supplied-text result into a claim of complete audiovisual analysis.
- **Don't** publish private reference screenshots or promote an unverified outcome into success.

Documentation evidence: effective `product.css` followed by `studio.css`, `studio-home.tsx`, `scroll-character.tsx`, original asset provenance and the October 7 local desktop/phone captures in `.impeccable/review/studio/`. The synthetic captures establish visual evidence only. Finish disposition is scoped to the owner-pinned contract provenance and visible phone workspace fixes. This undeployed first slice is not full V1 acceptance, a deployment, a customer-data demonstration or completed roadmap work. Earlier component verification above retains its original scope; no new detector-pass claim is made.
