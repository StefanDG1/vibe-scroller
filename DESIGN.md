---
name: VibeScroller
description: A quiet dark console for saved sources, evidence and permitted next actions.
colors:
  ink: "#f4f4f4"
  canvas: "#101010"
  panel: "#191919"
  line: "#333333"
  muted: "#a8a8a8"
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

# Design System: VibeScroller

## Overview

**Creative North Star: "The Quiet Console"**

VibeScroller uses a neutral charcoal world, compact navigation and restrained white controls. Its visual character follows the owner's settled modern ChatGPT/Codex and ElevenLabs references: calm density, readable source content, small line icons and direct interactions. The system describes the implemented app shell; the surface composition remains in [the console brief](docs/design/console-brief.md).

Content, actual state and permitted actions establish hierarchy. Source icons identify media without inventing thumbnails. Panels remain subdued so titles, evidence and the next action carry attention. [PRODUCT.md](PRODUCT.md) records the product constraints; the four foundational documents remain the copy brief. This document does not change copy, establish benefit, or approve legal publication.

**Key Characteristics:**

- Dark-only neutral surfaces.
- Compact text hierarchy and quiet borders.
- Readable source rows rather than nested decorative cards.
- Accessible menus, visible focus and generous touch targets.
- Short motion tied to state changes and evidence arrival.

## Colors

The palette separates surfaces by brightness. It has a neutral primary action and a limited error color, with no decorative brand accent.

### Primary

- **Ink:** bright reading text and filled primary controls; dark primary text keeps those controls legible.
- **Primary hover:** gently dims filled controls in response to pointer interaction.

### Neutral

- **Canvas, rail and panel:** establish the dark page, slightly lighter navigation and contained settings/evidence surfaces.
- **Control, composer and menu:** distinguish editable fields, capture and floating choices.
- **Line and control line:** separate rows and define fields without heavy framing.
- **Muted and chip text:** support secondary explanation, metadata and state labels.
- **Selected and soft:** indicate selected navigation and hover responses.
- **Focus:** clearly identifies keyboard interaction.

The source custom property named `--teal` currently resolves to Ink. Preserve the effective neutral color; the historical variable name does not authorize a teal accent. Error uses a pale red alongside explanatory text. Success and pending states use neutral surfaces and explicit labels.

**The Neutral Action Rule.** Use white for the main action and selected reading hierarchy; reserve color for an actual error.

## Typography

**UI Font:** Inter with system UI, Apple system, BlinkMacSystemFont, Segoe UI and sans-serif fallbacks. The app declares this stack; it does not load Inter through `next/font` in the root layout. **Code Font:** UI monospace with monospace fallback.

The console uses an intentionally close reading scale, medium headings and normal case. Source titles use the Title role, descriptions use Source body, and metadata uses Metadata. Panel headings are slightly larger (18px); navigation uses compact UI text (14px). Status chips are small labels (11px), never a substitute for the readable state explanation.

Page headings use Headline; mobile page and capture headings settle at 25px. Source titles reduce to 14px on mobile. The capture field stays at 16px. Source descriptions limit line length to 70ch; general paragraphs limit it to 72ch.

**The Reading Hierarchy Rule.** Keep title, explanation and metadata distinct through scale, weight and neutral contrast; use concise sentence case labels instead of ornamental eyebrows.

## Layout

The desktop shell is a flex layout with a sticky full-height rail (244px), compact top toolbar (64px), and content column capped at 1120px. Main content padding is 32px 40px 64px. At 1050px, the rail narrows to 220px and main padding becomes 28px.

At 720px and below, the rail gives way to four core bottom navigation items and More, with the account trigger in the sticky top toolbar. Main content uses 24px 16px 104px padding to clear the fixed bottom navigation. Bottom navigation includes safe-area padding. Core surfaces must remain usable at the confirmed 320 CSS pixel width.

The capture composer has a bounded width (680px) and source rows have thumbnail, flexible text and an optional open control. Filters wrap on mobile; source-row open controls yield to the linked source title. Settings and evidence use panels with desktop padding (24px) and mobile padding (18px). Private evidence frames use a responsive grid with columns that fit the available width and contained imagery.

**The Touch Target Rule.** Interactive controls keep at least a 44px target; small type and icons do not justify a smaller hit area. Informational chips are not controls.

## Elevation & Depth

The shell uses tonal layering and thin separators. Source rows sit directly on the canvas, panels have quiet borders and the toolbar separates from content with a dark line. The account menu alone carries a soft floating shadow (`0 12px 32px #0006`). Dialogs dim the surrounding surface (`#0009`) rather than decorating the dialog with a dramatic shadow.

**The Flat Surface Rule.** Keep routine content flat; use floating depth for a menu or modal that temporarily interrupts the underlying task.

## Shapes

Fields and navigation have restrained rounded corners. Controls use the Control radius, panels and menus use Panel, dialogs use Dialog, and badges use Chip. Circular avatars and composer send controls are purposeful exceptions. The capture composer has a softer containing outline (18px radius), while library rows have straight separators and no enclosing card radius.

Lucide line icons communicate navigation, media type and actions. Supplied personal reference screenshots remain local reference material, not bundled imagery.

## Components

### Buttons

Primary controls are bright, compact and medium weight (550). Secondary controls are transparent, bordered and equally usable. Hover dims primary fill or brightens the neutral secondary surface. Keyboard focus uses a visible outline (2px) with a gap (3px). Disabled controls reduce opacity (0.45); pending controls show a spinner and disable duplicate submission. Icon controls are square (44px) with an accessible name.

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

Color and border responses run briefly (140ms ease-out). Account menus reveal with clip and opacity (120ms ease-out); source rows and capture dialogs enter with a small vertical change and opacity (180ms ease-out). A pending spinner rotates steadily (800ms). Reduced-motion preferences disable animations and transitions and remove thumbnail movement. Motion acknowledges a change; it must not delay reading or action.

## Do's and Don'ts

### Do:

- **Do** use the dark neutral palette and concise sentence case interface copy.
- **Do** keep loading, empty, ready, success and error feedback tied to actual state.
- **Do** preserve visible keyboard focus, 44px controls and reduced-motion behavior.
- **Do** keep permissions and private evidence access explicit.

### Don't:

- **Don't** add a light-mode switch, decorative gradients or fabricated thumbnails.
- **Don't** add ornamental eyebrows, zero-count hero metrics or a recurring explanatory motto.
- **Don't** convert a supplied-text result into a claim of complete audiovisual analysis.
- **Don't** publish private reference screenshots or promote an unverified outcome into success.

Documentation evidence: the effective cascade in `apps/starter/app/product.css`, the console, account-menu and consent components, and the root layout. Review captures include `outputs/design-review/ready-390.png`, `error-390.png`, `loading-390.png`, `empty-390.png`, `more-320.png` and the earlier desktop capture. These capture paths are review evidence, not runtime assets. The one attempted detector returned no reliable verdict; this record makes no detector-pass claim.
