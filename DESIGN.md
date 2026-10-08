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
  diagram-blue: "#92c5ed"
  diagram-violet: "#d5ade9"
  diagram-node-hover: "#283b33"
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
  private-recovery-text: "#ffdae2"
  private-recovery-surface: "#3e242e"
  private-recovery-border: "#764153"
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
  network-idea:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.circle}"
    padding: "15px"
  network-group:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.accent}"
    rounded: "{rounded.circle}"
    padding: "15px"
  private-recovery:
    backgroundColor: "{colors.private-recovery-surface}"
    textColor: "{colors.private-recovery-text}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
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
- Cited circle networks, saved topic branches and defined loaded-record charts.

## Colors

The palette separates quiet surfaces by brightness and green-gray hue. Mint signals useful actions and connections; amber gives Scroll warmth and marks its short state caption. Existing white controls remain part of the system.

### Primary

- **Mint and accent ink:** the studio principal action, knowledge-map selection and meaningful connection indicators; dark text keeps mint-filled controls readable.
- **Ink:** bright reading text and retained white save/legacy primary controls; dark primary text keeps those controls legible.
- **Primary hover:** gently dims filled controls in response to pointer interaction.

### Secondary

- **Amber:** Scroll artwork and state captions. The illustration contains its own painterly shading rather than a flat recolor. In diagrams amber also identifies complementary groups and project ideas; in state charts it marks needs attention and awaiting review.
- **Diagram blue:** similar cited groups, recorded-work nodes, and queued/processing or deferred chart states.
- **Diagram violet:** disagreement groups with dashed borders and links, plus rejected and stale chart states. Labels retain the distinction between these roles. Neither chart color nor diagram color establishes quality or benefit.

### Neutral

- **Canvas, rail and panel:** establish the dark page, slightly lighter navigation and contained settings/evidence surfaces.
- **Control, composer and menu:** distinguish editable fields, capture and floating choices.
- **Line and control line:** separate rows and define fields without heavy framing.
- **Muted and chip text:** support secondary explanation, metadata and state labels.
- **Selected and soft:** indicate selected navigation and hover responses.
- **Diagram node hover:** a scoped green charcoal fill for topic and source-to-project node hover.
- **Focus:** clearly identifies keyboard interaction.

The historical `--teal` property still resolves to Ink: it does not make every retained control mint. Error uses a pale red alongside explanatory text. Success and pending states use explicit labels, never color alone. The frontmatter records the effective studio cascade; rail, fields, menus and selected navigation retain their older neutral fills.

Owner-private setup recovery notices and assistant-access recovery alerts use the scoped Private recovery text, surface and border colors. Their text/surface contrast is 10.94:1. Assistant-access alerts override the inherited pale error background with this dark rose surface. This readable rose treatment remains scoped to these recovery surfaces, not a replacement of the studio palette or all error styling.

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

Explore keeps its five view controls and representation controls wrapping rather than squeezing their targets. Topic rows use a full-width reading area with a minimum height (64px); nested native disclosures use quiet left rules and reduce deep indentation on phones (480px and below). The optional circular connection canvas scrolls inside a bounded viewport (600px maximum height). Its local layout measures available width, with a minimum world width of 220px. Below a 500px world width, it uses smaller complete circles and a taller world with at least 520px height. Topic diagrams keep a bounded scrolling viewport (560px maximum height); saved roots are centered on entry and resize. Branches use a 240px leaf pitch and 140px depth pitch. The source-to-project diagram keeps its 900px world inside a scrolling viewport (560px maximum height), with a wrapping readable-links disclosure below it. Canvas previews may truncate claims, while the evidence dialog retains the full text. At 480px and below that native dialog becomes a full-width bottom sheet with rounded top corners; on larger screens it is centered, width bounded to 680px and height bounded to 85dvh.

Home statistics use four columns, with two columns at 680px and below. Their two state charts stack at the same breakpoint. Chart rows retain visible labels and counts above 10px tracks; bars describe each state's share of the loaded records. The toolbar, legend and section actions wrap. Diagram overflow stays inside its viewport; visible swipe/scroll guidance and readable alternatives remain outside it. These additions retain the incumbent shell width and navigation.

## Elevation & Depth

The shell uses tonal layering and thin separators. Source rows sit directly on the canvas, panels have quiet borders and the toolbar separates from content with a dark line. The account menu alone carries a soft floating shadow (`0 12px 32px #0006`). Dialogs dim the surrounding surface (`#0009`) rather than decorating the dialog with a dramatic shadow.

**The Flat Surface Rule.** Keep routine content flat; use floating depth for a menu or modal that temporarily interrupts the underlying task.

## Shapes

Fields and navigation have restrained rounded corners. Controls use the Control radius, panels and menus use Panel, dialogs use Dialog, and badges use Chip. Circular avatars and composer send controls are purposeful exceptions. The capture composer has a softer containing outline (18px radius), while library rows have straight separators and no enclosing card radius.

Scroll uses the original transparent warm paper-creature artwork; the 192px/240px home image and compact 36px/44px shell mark share the same still asset. Phone header Scroll is 26px/34px. Status wording changes with authoritative next-action state; separate expression artwork is not implemented. [Artwork provenance](apps/starter/public/scroll/PROVENANCE.md) records generation and the alpha-preserving WebP derivative without claiming trademark clearance.

Cited ideas and relationship groups use complete circular native buttons. Idea circles have mint fill and dark text; groups have panel fill with a semantic colored outline. Disagreement uses a dashed outline and dashed links. Topic and recorded-work nodes use quiet rounded rectangles (12px corners), keeping saved hierarchy distinct from the circle network.

Lucide line icons communicate navigation, media type and actions. Supplied personal reference screenshots remain local reference material, not bundled imagery.

## Components

### Buttons

The studio main Button uses mint fill, dark text, 500 weight, 8px 16px padding, 10px corners and a 44px minimum target. Hover reduces opacity to 0.9; keyboard focus uses a 2px mint outline with a 4px offset; disabled opacity is 0.5. Retained save and legacy primary controls use white. Those controls are bright, compact and medium weight (550). Secondary controls are transparent, bordered and equally usable. Hover dims primary fill or brightens the neutral secondary surface. Keyboard focus uses a visible outline (2px) with a gap (3px). Disabled controls reduce opacity (0.45); pending controls show a spinner and disable duplicate submission. Icon controls are square (44px) with an accessible name.

### Scroll and studio shelves

Scroll stays visible in the normal shell and Home. The home character is a named greeting button with a state caption; compact shell artwork is still. Shelf rows use an 80px minimum height, 14px 8px padding, 8px corners and quiet top separators between rows. Mint line icons identify sources and projects; muted arrows identify the row action. Recent-source coverage stays explicit: current-page records are not full-library totals. Later dismisses a suggested next action locally; it does not complete or approve it.

### Owner-private setup and filing

In owner-private Home, the setup panel precedes the studio welcome. Three saved, resumable steps lead from Personal/Business focus to the user's goal and interests, then a preview and explicit confirmation. A Business project role is optional. Treat these fields as user-provided direction, never inferred profile facts. The panel retains the incumbent dark material and controls; fieldsets are unframed with clear legends, full-width inputs and visible labels.

Personal and Business are filing views of the same owner-private library. Source detail offers independent checkbox membership in either or both views; filing does not copy evidence, share content or queue inference. Combined browsing is offered only for explicitly confirmed, enabled setup and reads bounded metadata. Saving a change fences earlier browse responses and clears the list immediately, so turning combined browsing off cannot leave an old combined result visible. Failed browsing shows recovery text rather than successful empty guidance. Export remains bounded and does not download a partial result when its page limit is exceeded.

Setup rows wrap on narrow screens while action labels stay on one line. Space result rows use quiet bottom separators and readable linked titles; at 480px and below, state text moves below the title. Keep setup's scoped recovery notice legible using the Private recovery tokens and a thin border. Sharing, assistant access, account connection, processing routes and spending authority remain separate choices.

**The Private Filing Rule.** Organization choices describe the owner's private views; they never imply sharing permission or analysis authority.

Local evidence comprises six handler tests and the labeled synthetic native packet in `.impeccable/review/private-library/proof.json`, including 320/390/768/1440px checks, saved-step resumption, combined-view confirmation, source filing, empty/error feedback and bounded export. The finish reviewer cleared the scored corrections within that candidate scope. Fixture routes were removed from the application before final builds; real-account, production, second-account and genuine analysis acceptance remain pending.

### Selected knowledge sharing and recipient reading

Owner-private source detail keeps sharing in a native disclosure after the separate Personal/Business filing controls. The disclosure uses the existing quiet panel, readable explanation and full-size controls. Its workspace choice uses the shared Radix choice control. Show the selected recipient, source generation/revision and seven-day duration before the explicit version acknowledgment; changing the target, source version, saved grant version or replacement choice invalidates that acknowledgment. Closing the disclosure clears loaded choices, grants and acknowledgment.

Keep the new sharing action visually separate from saved grants. The saved-grants heading has a clear section break (28px above, 12px below); this scoped spacing correction does not change other panel headings. Rows name the recipient and show expiry/revoked state and the count of selected versions, with a separate Revoke grant control. Rows retain the existing quiet separators and stack at 480px and below; action labels stay on one line and controls keep the existing 44px targets.

Recipient reading uses a separate panel and bounded source list. Detail retains the title, source generation, grant version, coverage and exact insight/revision citations in the existing reading hierarchy. Loading, unavailable, empty and no-analysis states remain explicit. Read access does not visually imply permission to operate on the owner's library or inspect transcripts, frames, profile answers or credentials.

October 7 finish disposition is ship for the scoped saved-grants spacing correction only. `.impeccable/review/knowledge-grants/fix-mobile-active-controls.png` (390px), `fix-desktop-active.png` (1440px) and `mobile-recipient-reading.png` (390px) capture labeled synthetic local controls and reading. They do not establish real grants, second-account consent, provider/auth acceptance or production deployment. This merge preserves Scroll's studio and the existing token primitives.

### Assistant access review

Assistant access preserves the incumbent Scroll studio in Operate mode: quiet neutral panels, restrained borders, readable compact hierarchy and a white primary Save action. Current grants lead with identity, expiry and either a live library scope or a legacy exact-post count, followed by Turn off access. Existing exact-post grants stay exact until explicitly replaced.

Choose assistant access opens one review disclosure. A sole registered assistant is selected automatically; multiple assistants use the existing choice control. Library access offers Off, Personal, Business or Both in an actual owner-private library. Both includes eligible unfiled posts. Shared workspaces instead offer all eligible posts in that workspace. Current and future inclusion appears in the introduction, scope explanation, review and acknowledgment. Off leaves saving unavailable and points to the existing grant's revocation action.

Select all actions provides a convenient explicit selection; Customize actions retains individually labeled permissions. Events permission does not activate completion notifications. Context choices load only when context read is selected, with twenty projects per page, up to five retained selections, separately confirmed library context and review links. Selecting confirmed context on the page selects those visible eligible choices without saving authority. Private suggestions require granted evidence, project context, context permission and owner/admin access.

The seven-day acknowledgment binds workspace, assistant, live scope, actions, intake destination, confirmed context/project references and saved-grant version. Relevant changes require renewed acknowledgment. Review states no spending, coding, publication, repository code or chat history, plus the assistant's possible retention of already disclosed content. Recent sign-in opens separately so the original selection remains available. Save/revoke pending labels describe the actual operation; duplicate mutations are disabled.

Connections uses a dedicated workspace slice and has no recurring polling. Assistant setup loads on mount, explicit refresh and after mutations; context selection and project pagination refresh the bounded choices. Generation fencing rejects stale responses, workspace changes remount the editor, and failed access checks clear the reviewed selections. Phone controls wrap within the panel without horizontal page overflow.

**The Reviewed Access Rule.** Keep the library scope, future inclusion, exact context and allowed actions reviewable before acknowledgment, with immediate revocation and operation-specific feedback.

Historical October 7 exact-post review captures in `.impeccable/review/assistant-access/` and project-context captures retain their original evidence scope. Their paginated post picker and recurring polling describe the earlier implementation, superseded here. The eight October 7 `.impeccable/review/assistant-scope/` captures are explicitly synthetic at 320, 390, 768 and 1440 CSS pixels, with a top and consent-review capture at each width and focus/metrics emulation. The finish reviewer marked the persistence correction ship at that fix scope only; the supplied visual matrix matched. They establish scoped visual review and native fixture checks, not production grant/tool acceptance, independent comprehension or physical-device testing. The durable studio identity and recovery tokens remain unchanged.

### Inputs / Fields

Fields have a dark fill, restrained outline and readable placeholder. The link composer groups input and circular submit into one containing field; focus brightens its containing border instead of drawing an inner outline. Checkbox labels provide a full control target and keep permissions explicit.

Shared choice menus opened inside a native modal dialog keep their portal within that dialog, so choices remain interactive and exposed to accessibility tools. Outside dialogs they use the default portal. Preserve the existing appearance, radio selection semantics, keyboard navigation and collision-aware positioning (6px side offset, 16px collision padding).

Escape closes the active choice menu first and returns focus to its trigger. The enclosing capture dialog respects consumed keyboard events; a subsequent Escape closes capture and returns focus to Save.

**The Dialog Choice Rule.** A modal's choice menu belongs inside its active native dialog; a visually visible menu must also accept pointer and keyboard selection.

The October 7 repair follows a real-production reproduction of an inert menu outside the dialog. Local synthetic checks at 390px and 1440px verified open menus inside the viewport without page overflow, pointer transcript selection and keyboard Home/Enter URL selection. Private evidence is retained in `private/vibescroll-dialog-choice-menu-390.png`, `private/vibescroll-dialog-choice-menu-1440.png`, `private/vibescroll-dialog-choice-desktop.png` and `private/vibescroll-dialog-choice-proof.json`. The finish disposition covers this synthetic control only; it does not establish production saving, deployment or whole-plan acceptance.

### Navigation

Desktop navigation uses line icons, text and occasional informational counts. Hover brightens the row; selection has a lighter neutral fill and stronger text. Radix account menus use compact rows with keyboard highlight and collision-aware placement. The mobile account trigger keeps its target while showing only the avatar. More exposes secondary destinations without overloading bottom navigation.

### Chips

Coverage, state and tags share a small neutral badge. They supplement source text and never imply completed analysis solely from their styling. Synthetic demo badges remain explicit.

### Cards / Containers

Library items are rows with thin bottom separators, a quiet media icon and a readable linked title. Settings, plans and evidence use bordered panels. Empty views keep a plain background, a short explanation and a relevant action. Notices use a neutral raised fill and live output for action feedback; errors also use the error color and precise explanation.

### Usage allowance and recent credit use

Usage keeps the existing quiet settings panels and Inter reading hierarchy. Available and reserved credits lead together as labeled, tabular numerals; the balance group wraps within the panel on narrow screens. A supplementary native meter uses the existing mint and neutral tokens, with a readable label, visible zero-to-allowance range and accessible value text. The meter describes availability from unexpired allowances, not completed work, benefit or invoice settlement. Its corners follow the incumbent radius rather than introducing another shape token.

Keep dated UTC expiry and unresolved-reservation explanations next to the balances. Recent credit use uses flat separated rows: activity and UTC date on the left, actual credit amount on the right, including zero-credit entries. The visible coverage note bounds the list to ten recent entries and distinguishes credits from provider invoices. Missing or invalid allowance data remains unavailable; empty recent use has its own explanation. The existing secondary Billing link opens review and grants no purchase or spending authority.

**The Allowance Reading Rule.** Keep available and reserved numbers primary, the labeled native meter supplementary, unresolved holds explicit and recent-use coverage bounded.

The October 7 reviewer cleared this narrow Usage refinement with no material fixes. Populated genuine-staging captures in `.impeccable/review/usage-20261007/` cover 390, 1440 and 1567 CSS pixels with no horizontal page overflow. These are viewport emulations; they do not establish every dynamic state, physical-device, production candidate, provider-invoice or full V1 acceptance. No new palette, artwork, type or motion convention follows from this addition.

### Reauthentication recovery

**The Review Return Rule.** When an operation requires fresh sign-in, retain the current application pathname and query in the existing error toast's recovery link. Keep the app-only server return-path guard. Recovery returns to the review location; it does not retry the failed operation or grant approval, access or spending authority.

The incumbent toast, Sign in again label and native anchor remain unchanged. October 7 evidence in `.impeccable/review/reauth-route-20261007/browser-proof.json` records the source-specific link at 390, 1440 and 1567 CSS pixels and a later pathname/query check. The client received a simulated HTTP 400 before backend dispatch in a genuine staging session with a genuine source; no source edit occurred. The fresh reviewer cleared this routing correction. Its report retains the narrower evidence available at review time, before the later query check. These captures and checks do not establish live OAuth completion, production recovery, independent human or physical-phone acceptance, or full V1 acceptance.

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

### Library Explore

Explore reuses the studio material and existing native buttons, shared choice controls and disclosures. Its five views are Topic tree, Connections, Idea journey, Topic overview and What helped. The selected view uses mint with accent ink; unselected controls stay quiet. Topic tree is the default, built only from the bounded loaded page. Branching diagram is the initial representation. In Readable tree, expand a parent with a native disclosure, then use its separate Inspect action to read evidence. A parent missing from the loaded page remains a root; hierarchy never implies new evidence or authorization. When available, Edit topic structure stays in a native disclosure. Representation switches, recovery actions and this summary retain minimum 44px targets and visible keyboard focus, including a two-pixel ring with three-pixel offset on the summary.

Topic tree offers Branching diagram and Readable tree representations. The diagram uses only saved parent links. Separate roots include parents missing from the loaded page; a branch never invents hierarchy. Native topic buttons open the same cited evidence, and the entry viewport centers the first saved root before horizontal exploration.

Connections defaults to Network map, a circle network. Readable list is an equivalent representation of the same current cited groups and ideas. Labels distinguish Similar ideas, Work together, Disagreement and Useful combination. Lines connect a cited group to its supporting ideas; they neither assert pairwise agreement nor establish causation. Topic membership alone is not agreement. Keep the textual equivalent reachable and retain source evidence for each idea.

**The Cited Group Rule.** Display a connection only when all of its exact source, generation, revision and insight references exist in current permitted evidence. A connection is an explained cited group; neither its line nor topic membership proves causation or agreement.

The circle network uses native buttons for every idea and cited group. Circle size reflects the number of cited links on this page, never quality. Desktop radii start at 48px and gain up to 18px from link count; narrow-world radii start at 36px and gain up to 10px. Labels retain up to three lines at 13px with zoom compensation when zoomed out. The group circle reads Combine ideas, while its accessible name, legend and evidence heading retain Useful combination and its full explanation. Hover brightens a circle; focus uses a visible 3px outline with a 5px offset.

Zoom controls span 65% to 160%. Reset view restores 100% and scroll origin. Touch scrolling, mouse background dragging, keyboard scrolling, Tab and Enter remain available, with visible exploration guidance. Layout and zoom add no motion, inference, queries or authorization. Selecting a node opens a labeled native modal dialog containing the full explanation, claims and source links. Escape and Close evidence close it and return focus to the invoking node. Phone presentation uses the bottom sheet described in Layout. The readable list reveals the same claims and source links inline.

**The Explore Coverage Rule.** Keep counts tied to the loaded page and explain overlap: shared topic membership is not independent corroboration. Show at most 40 loaded topics and 40 connection-map nodes. Topic overview bars use the twenty-idea evidence-page limit as full scale, not whole-topic size or benefit.

Use Show more topics for the bounded accumulating topic window and Back to first topics page to recover its beginning. Use Next evidence page for the next part of a topic; both the button and explanatory copy use that label. Cited groups paginate separately with Next cited groups and First cited groups. Keep loading announcements, empty coverage and failed-access recovery distinct; an access failure clears the selected evidence rather than becoming a successful empty result.

Idea journey presents the recorded sequence: saved posts and cited ideas, evaluation with repository version, issue draft or published issue, implementation run and PR, deployment record, then outcome when present. Current and historical project fit remain visibly distinct. What helped separates Recorded judgment from Reported comparison; a comparison retains before/after values, units, sample counts, baseline and observation periods, and limitations. Deployment-version absence stays explicit.

**The Recorded Outcome Rule.** Present saving, evaluation, issue, PR, merge, deployment and benefit as separate recorded facts. A judgment is not a measured comparison, and a merged PR alone does not establish benefit.

October 7 documentation evidence is the implemented Explore, connection map and canvas plus their scoped design-recipe styles. The fixed desktop/phone captures, desktop-tree-final.png, mobile-tree-final.png, phone-320-tree.png and tablet-768-tree.png in .impeccable/review/knowledge-explore/ retain the local synthetic review. proof.json records native Escape closing, focus return and no horizontal overflow; fix-target-proof.json records the native structure summary's visible mint focus ring. Independent finish review cleared all five corrections: representation/recovery/disclosure targets, summary focus, canvas count fit, overview scale explanation and matching evidence-pagination copy. The ship disposition is LOCAL SYNTHETIC FRONTEND SLICE only. It establishes no real authentication, provider, source, permission, production, customer-result or full V1 acceptance.

### Home statistics and recorded links

Home retains Scroll, the next action and capture before the scoped library overview. Four native metric buttons lead to Posts with insights, Ideas accepted, Merged pull requests and Selected projects. Each has a native What this counts disclosure with a 44px summary target. Tabular values use 30px medium-weight text, reducing to 26px at 680px and below. Charts retain compact 14px labels, exact counts and explicit loaded-record coverage.

Counts deduplicate loaded records and exclude deleted posts. Ready posts require the ready state, accepted ideas require explicit acceptance, and selected projects require enabled repositories. Merged PRs count unique recorded GitHub pull-request links with recorded merge state or time. Compact Home shows Not loaded for merges rather than zero. Posts and proposals retain every current state through labeled categories, including saved/other and unreviewed/other. These are state distributions, not a conversion funnel or whole-library totals.

Where your ideas went joins loaded non-deleted sources to up to five proposals through saved source IDs, then to up to five loaded runs through proposal IDs. Native source and proposal buttons open their records; run buttons open Runs. Mint, amber and blue outlines distinguish the stages. A missing loaded run has explicit text. Read source-to-project links exposes the same source and proposal actions as wrapping readable rows. Lines record attribution; acceptance, implementation, merge, deployment and measured outcomes remain separate facts.

The October 8 fix-only finish disposition is ship for responsive network framing, centered topic-root entry and the complete Combine ideas label. The final seven labeled synthetic captures in `.impeccable/review/visual-dashboard-20261008/` are `home-1440.png`, `home-390.png`, `network-1440.png`, `network-390.png`, `network-evidence-390.png`, `tree-1440.png` and `tree-390.png`. The reviewer opened all seven; builder evidence records zoom/reset and Enter/Escape focus return. The verdict at `private/vibescroll-visual-dashboard-finish-review-final-20261008.md` resolves the three existing findings only. It does not establish whole-surface, authenticated customer, human keyboard, physical-device or production acceptance. User-supplied diagrams remain direction references; the implemented diagrams are native code and add no shipping raster artwork.

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
