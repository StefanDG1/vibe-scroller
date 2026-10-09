---
name: VibeScroll Atlas
description: Cool surfaces, readable saved knowledge and recorded project trails, with original Scroll artwork.
colors:
  canvas: "#f5f8fa"
  panel: "#ffffff"
  ink: "#182e42"
  subtle: "#526578"
  line: "#dce5eb"
  muted: "#eaf0f4"
  primary: "#166b58"
  primary-foreground: "#ffffff"
  accent: "#bce8da"
  accent-ink: "#134b40"
  dark-canvas: "#121b23"
  dark-panel: "#1b2833"
  dark-ink: "#e7f0f7"
  dark-subtle: "#a9bac8"
  dark-line: "#354652"
  dark-muted: "#263642"
  dark-primary: "#87dfc1"
  dark-primary-foreground: "#102d24"
  save: "#f4cb68"
  save-ink: "#33270c"
  legacy-primary: "#f4f4f4"
  legacy-primary-ink: "#141414"
  legacy-primary-hover: "#d8d8d8"
  amber: "#f3c785"
  diagram-blue: "#92c5ed"
  diagram-violet: "#d5ade9"
typography:
  headline:
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(24px, 2.2vw, 32px)"
    fontWeight: 550
    lineHeight: 1.3
  studio-headline:
    fontSize: "clamp(26px, 3vw, 38px)"
    lineHeight: 1.18
    letterSpacing: "-0.025em"
  topic-title:
    fontSize: "14px"
    lineHeight: 1.35
  library-headline:
    fontSize: "clamp(27px, 6vw, 64px)"
    fontWeight: 750
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  hybrid-title:
    fontSize: "clamp(12px, 1.8vw, 23px)"
    lineHeight: 1.25
  body:
    fontSize: "14px"
    lineHeight: 1.6
  insight:
    fontSize: "14px"
    lineHeight: 1.5
  metadata:
    fontSize: "12px"
    lineHeight: 1.4
rounded:
  chip: "5px"
  field: "9px"
  control: "10px"
  insight: "12px"
  panel: "14px"
  node: "16px"
  composer: "18px"
  circle: "50%"
spacing:
  small: "8px"
  compact: "10px"
  row: "12px"
  standard: "16px"
  branch: "18px"
  section: "20px"
  panel: "24px"
components:
  button-primary:
    backgroundColor: "{colors.legacy-primary}"
    textColor: "{colors.legacy-primary-ink}"
    rounded: "{rounded.control}"
    padding: "10px 17px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.legacy-primary-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 17px"
    height: "44px"
  mobile-save:
    backgroundColor: "{colors.save}"
    textColor: "{colors.save-ink}"
    rounded: "{rounded.circle}"
  field:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
    height: "44px"
  navigation-item:
    textColor: "{colors.subtle}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
    height: "44px"
  navigation-item-selected:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.ink}"
  chip:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
    padding: "24px"
  topic-node:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.node}"
    padding: "14px"
    height: "76px"
  hybrid-category:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "8px"
  hybrid-tray:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.control}"
    padding: "9px"
  insight-card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.insight}"
    padding: "12px"
---

# Design System: VibeScroll Atlas

## Overview

**Creative North Star: "Scroll's knowledge atlas"**

The app uses cool canvas, white reading surfaces, navy ink and teal selection. Its matching dark theme keeps the same hierarchy and original warm Scroll artwork. Quiet borders and compact icon-led cards let saved knowledge and the next permitted action lead. Device setting is the default appearance; Account offers Light and Dark overrides.

This is the owner-authorized October 9 application world, extracted from the built code. Its boundary is the Atlas shell, Home, Library, Projects, Account and capture. The public marketing world remains Scroll's charcoal studio. The original Scroll image is reused; this update introduces no shipping raster artwork. Product authority remains in [PRODUCT.md](PRODUCT.md), with the selected interaction scope in [the Atlas implementation contract](docs/design/ATLAS-IMPLEMENTATION-CONTRACT-20261009.md).

**Key Characteristics:**

- Cool light surfaces and matching dark surfaces with teal selection.
- Original Scroll artwork and visible workspace scope.
- Compact saved-topic branches and insight-owned evidence cards.
- Five phone actions: Home, Library, Save, Projects, Account.
- Short pointer-triggered motion with immediate keyboard actions and a still alternative.
- Loaded-record statistics and explicitly recorded project trails.

## Colors

The frontmatter records the effective Atlas light palette and its dark counterparts from `atlas.css`; it also records retained control and chart colors that still appear in the application.

### Primary

- **Deep teal / Dark mint:** active selection, focus, topic icons and recorded connectors. The primary foreground follows the selected theme.
- **Soft teal / Accent ink:** filled selected representation and appearance controls.
- **Legacy primary / Legacy primary ink:** retained bright primary controls, with the established dimmer hover response. These remain distinct from token-driven teal controls.

### Secondary

- **Warm Save / Save ink:** the phone's central Save action, opening capture.
- **Amber:** original Scroll warmth and retained chart attention states.
- **Diagram blue and violet:** retained labeled state and cited-group distinctions. Color does not establish benefit or quality.

### Neutral

- **Cool canvas and White panel:** page, rail, toolbar, cards, fields and menus.
- **Navy ink and Secondary ink:** reading text and supporting explanation; placeholders use secondary ink at full opacity.
- **Quiet line and Muted surface:** borders, branch stems, active rail rows and informational tags.
- **Dark canvas, panel, ink, subtle, line and muted:** matching roles when the device or Account selects dark appearance.

**The Recorded Meaning Rule.** Selection and connectors describe returned records; neither color nor a line establishes permission, independent corroboration or benefit.

## Typography

**Display Font:** Inter with system-ui, Apple system, BlinkMacSystemFont, Segoe UI and sans-serif fallbacks.
**Body Font:** the same declared stack; the root layout does not load Inter through `next/font`.
**Label/Mono Font:** UI monospace for code and serialized detail.

**Character:** a compact reading hierarchy with medium headings and sentence case labels. Evidence remains readable beside the branching structure.

### Hierarchy

- **Headline:** page title; the frontmatter captures its inherited scale.
- **Studio headline:** the next action on Home; phone Atlas overrides it to 23px.
- **Topic title:** saved topic names, with unrestricted word wrapping.
- **Body / Insight:** reading copy and icon-led insight claims.
- **Metadata:** topic counts and source/project detail; trail explanations use 13px.

**The Reading Hierarchy Rule.** Keep title, explanation and metadata distinct through scale, weight and neutral contrast; use concise sentence case labels instead of ornamental eyebrows.

## Layout

The inherited desktop shell keeps a 244px rail, 64px toolbar and main content capped at 1120px with 32px 40px 64px padding. The rail narrows at 1050px. The inherited phone shell activates at 720px; Atlas compaction applies at 700px. Phone navigation contains Home, Library, Save, Projects and Account in that order, with safe-area padding and workspace scope in the header. Save is an action rather than a destination. At 700px and below it is a raised 52px circle with its label below; the selected destination has a 34px underline.

The current Library hybrid uses a full-width composition capped at 1040px with 6.4% horizontal inset. Brand and search lead Library and its Tree/Folders switch. Tree places two compact horizontal category nodes per row, with successive selected-branch rows stepping inward. At 360px and below the steps use full width. Runtime SVG paths use measured node rectangles and rounded bends rather than the earlier CSS bus approximations. Folders uses indented category rows and inline evidence under the selected category. Its Personal/Business filing controls occupy a constrained strip beside the heading (53% width); they are separate from Library access view. The earlier 1180px explorer and sticky tree/evidence split remain in CSS for older representations, not this hybrid composition.

The owner subsequently replaced the four-card Tree grid with a vertical stacked list like Folders. Tree now uses one column of horizontal insight rows with 44px icons, a 76px minimum row height, 15px claims clamped to two lines and 12px source metadata. Proposal icons are also 44px. On phones the Tree/Folders switch occupies 40% width with a 152px minimum. Tree initially reveals four rows and Folders six; More insights adds four or six, while Next insights page requests the next authorized page. Connected category nodes retain the current stepped layout and effective desktop minimum height of 46px. From 361px through 700px category roots have a 62px minimum, deeper nodes 56px, labels 14px and icons 26px; the heading bottom margin is 7px. The superseded phone icon-above-claim layout and two-column evidence grid remain in older CSS declarations but are overridden by the final stacked-row rules.

Tree evidence now renders inside TopicDiagram beneath its selected branch. Active branches toggle collapsed state; hidden descendants and evidence immediately receive inert and aria-hidden while pointer-driven height/opacity open and close transitions run for 240ms with cubic-bezier(0.22, 1, 0.36, 1). Keyboard and live reduced-motion/app-off actions are immediate. Outgoing stale evidence is not retained; measured edges skip collapsed rows and hidden trays. LibraryExplore captures pointer/key origin on its stable ancestor and passes animateEntry through the keyed Atlas into TopicDiagram, preserving stale/private reset keys. Incoming pointer branches use the 240ms height/opacity reveal; incoming Folders uses a 200ms fade. Keyboard and live reduced-motion/app-off entry remain immediate. Representation changes retain only current authorized evidence.

**The Touch Target Rule.** Interactive controls keep at least a 44px target; small type and icons do not justify a smaller hit area. Informational chips are not controls.

## Elevation & Depth

Thin borders and tonal surfaces establish depth. Topic nodes have a small ambient shadow; selection adds a teal ring. Menus retain floating depth, and dialogs use the inherited dim backdrop. Insight cards own their enclosure; source headings do not gain a duplicate card wrapper.

### Shadow Vocabulary

- **Topic ambient** (`0 3px 12px rgb(18 46 66 / 4%)`): saved topic nodes at rest.
- **Topic selection** (`0 0 0 2px color-mix(in srgb, var(--primary) 14%, transparent)`): the selected topic.
- **Menu floating** (`0 12px 32px #0006`): the account menu.

## Shapes

Soft rounded rectangles define the atlas: the current hybrid categories, insight cells and proposal cards use Field corners (9px), and their shared tray uses Control corners (10px). Earlier topic nodes retain Node corners. General panels use Panel, fields use Field and informational badges use Chip. Proposal-stage markers are 33px circles linked by a thin vertical stem. Original Scroll retains its warm paper silhouette and transparent asset; line icons identify media, navigation and recorded stages.

## Components

### Buttons

Retained primary controls use the Legacy primary palette and medium weight (550); secondary controls are transparent with the quiet outline. Atlas button and link responses name background-color and border-color at 120ms ease-out. Focus uses a two-pixel theme-primary outline with a three-pixel offset. Disabled controls retain explicit unavailable state and inherited reduced opacity. Token-driven shared buttons may use theme Primary rather than the legacy fill.

### Chips

Status and tag badges use Muted with Ink and Chip corners. Small labels supplement readable state text. Synthetic records remain labeled; a badge never implies complete analysis.

### Cards / Containers

General panels retain 24px padding and Panel corners. Insight cards use 12px padding, a thin line border and Insight corners. Their source heading is outside the card. Trace cards use 16px padding and Node corners, with Canvas-filled action rows and centered downward arrows.

### Inputs / Fields

Fields use Panel, Ink and Line, with Field corners and 10px 12px padding. Search and capture placeholders use Subtle at full opacity; caret uses Ink. Native capture choice menus remain inside the active dialog, preserving keyboard selection and focus return. Escape closes the choice menu before capture. Capture records its opener synchronously before the full-editor refresh can disable Save or move focus. On close, it restores that opener only while access is valid and the element remains connected, enabled, visible and outside BODY; otherwise it uses an enabled visible header or phone Save control. Failed or obsolete opening and access loss clear the saved opener.

### Navigation

The desktop rail uses subtle text, line icons and a muted selected/hover fill. Phone navigation uses theme-primary active text; yellow Save opens the reviewed capture dialog. Account exposes appearance and motion preferences alongside existing workflow destinations. Appearance offers Device setting, Light and Dark, following live device changes in Device setting mode.

### Saved topic atlas and insight links

Tree is the default; Folders provides an expanded alternative over the same returned IDs and exact evidence. Remembered topic IDs restore only after the current authorized page returns them. Personal/Business roots are authored filing containers, independent of access scope. A missing counterpart can appear as an empty local filing template with no evidence, totals or grant. Library access view uses only server-returned permitted scopes; team libraries retain Workspace. Missing parents remain separate roots. The explicit deterministic category helper uses no model call and preserves saved manual layout versions.

Activating an insight reveals Source evidence with the unchanged full claim, full source title and source link; the source pane is absent before activation. The owner chose compact excerpts with full evidence on tap. Demo rows abbreviate Synthetic example to Example while the explicit synthetic banner and source pane retain that context and full title. Current-topic project connections are read once per bounded reference set, then filtered by exact source and insight IDs; failed reads are cleared for explicit retry. Measured SVG stems join the selected leaf to its insight tray, and theme-primary curves terminate at actual recorded proposal cards. Review opens that proposal. The primary foreground is defined separately in light and dark themes. Change category remains a version-bound disclosure, and Library options retains access view, explicit organization and coverage. Empty or partial pages explain coverage. Native disclosures retain 44px targets; advanced evidence representations remain reachable.

**The Cited Group Rule.** Display a connection only when all of its exact source, generation, revision and insight references exist in current permitted evidence. A connection is an explained cited group; neither its line nor topic membership proves causation or agreement.

### Home and proposal trails

Home's state-based next action leads, followed by loaded-record statistics with count definitions, readiness/decision distributions, a bounded knowledge preview and vertical source/proposal/run links. Unknown data remains distinct from zero. Source provenance and recorded run links remain separate from merge or benefit.

Projects lead with selected projects and existing proposals. Setup and evidence exploration stay in disclosures. The proposal trail labels Saved post and Saved plan only when source-ID and immutable-plan evidence support them; missing run and PR states remain explicit. A saved plan label does not claim an independently reviewed plan or grant execution authority.

**The Recorded Outcome Rule.** Present saving, evaluation, issue, PR, merge, deployment and benefit as separate recorded facts. A judgment is not a measured comparison, and a merged PR alone does not establish benefit.

### Motion

Tree evidence now renders inside TopicDiagram beneath its selected branch. Active branches toggle collapsed state; hidden descendants and evidence immediately receive inert and aria-hidden while pointer-driven height/opacity open and close transitions run for 240ms with cubic-bezier(0.22, 1, 0.36, 1). Keyboard and live reduced-motion/app-off actions are immediate. Outgoing stale evidence is not retained; measured edges skip collapsed rows and hidden trays. LibraryExplore captures pointer/key origin on its stable ancestor and passes animateEntry through the keyed Atlas into TopicDiagram, preserving stale/private reset keys. Incoming pointer branches use the 240ms height/opacity reveal; incoming Folders uses a 200ms fade. Keyboard and live reduced-motion/app-off entry remain immediate. Representation changes retain only current authorized evidence. Capture retains its 180ms opacity and 8px entry. CSS control responses remain 120ms ease-out; Scroll stays visible when motion is off.

### Candidate verification boundary

The later owner-authorized stacked Tree and transition revision supersedes the four-card grid requirement. Five final stacked screenshots are valid. Native checks observed three running pointer animations after Pricing, one after switching to Folders, zero for keyboard Marketing and zero for reduced-motion Product. These counts verify the recorded native interaction states, not physical-device smoothness or independent comprehension. Final review for this revision remains pending. The 78% drift FAIL and hard veto under `.impeccable/review/diff/hero` are historical evidence for the preceding grid; they have not been rerun or passed for the owner-changed stack. Prior seven captures, full-evidence activation and 512px proposal placement retain their earlier revision scope. Hybrid production deployment and all independent, physical-device, provider/cost and full V1 gates remain pending.

The October 9 reviewer scored all eight original fixes resolved in [the public Atlas evidence receipt](docs/operations/evidence/vibescroll-atlas-20261009.json). This covers the supplied candidate fix evidence, including hierarchy geometry, project-link geometry, source scopes, access-loss capture recovery, truthful trail labels, accessible surfaces, first-viewport density and visibility refresh. It is not a whole-surface audit, production release or full V1 acceptance. Real authenticated deployed-data acceptance, independent browser and physical-device testing, and provider/cost settlement remain separate.

The subsequent capture focus-recovery review cleared the bounded code correction and supplied local authenticated compact-path keyboard receipt at 390px and 1440px. Escape returned focus to Save and Enter reopened capture after the actual full-workspace refresh. Disconnected/disabled-opener fallback and access-loss suppression were reviewed in code only. Exact deployed-release compact keyboard acceptance remains pending; the original eight-fix verdict keeps its unchanged scope. This correction changes no palette, layout, tokens or visual world.

### Historical evidence

The receipts below retain their original dates and acceptance limits. Their earlier visual descriptions are historical; the Atlas tokens and rules above define the current application candidate. Public policy and marketing styling remain outside this replacement.

Local evidence comprises six handler tests and the labeled synthetic native packet in `.impeccable/review/private-library/proof.json`, including 320/390/768/1440px checks, saved-step resumption, combined-view confirmation, source filing, empty/error feedback and bounded export. The finish reviewer cleared the scored corrections within that candidate scope. Fixture routes were removed from the application before final builds; real-account, production, second-account and genuine analysis acceptance remain pending.

October 7 finish disposition is ship for the scoped saved-grants spacing correction only. `.impeccable/review/knowledge-grants/fix-mobile-active-controls.png` (390px), `fix-desktop-active.png` (1440px) and `mobile-recipient-reading.png` (390px) capture labeled synthetic local controls and reading. They do not establish real grants, second-account consent, provider/auth acceptance or production deployment. This merge preserves Scroll's studio and the existing token primitives.

Historical October 7 exact-post review captures in `.impeccable/review/assistant-access/` and project-context captures retain their original evidence scope. Their paginated post picker and recurring polling describe the earlier implementation, superseded here. The eight October 7 `.impeccable/review/assistant-scope/` captures are explicitly synthetic at 320, 390, 768 and 1440 CSS pixels, with a top and consent-review capture at each width and focus/metrics emulation. The finish reviewer marked the persistence correction ship at that fix scope only; the supplied visual matrix matched. They establish scoped visual review and native fixture checks, not production grant/tool acceptance, independent comprehension or physical-device testing. The durable studio identity and recovery tokens remain unchanged.

The October 7 repair follows a real-production reproduction of an inert menu outside the dialog. Local synthetic checks at 390px and 1440px verified open menus inside the viewport without page overflow, pointer transcript selection and keyboard Home/Enter URL selection. Private evidence is retained in `private/vibescroll-dialog-choice-menu-390.png`, `private/vibescroll-dialog-choice-menu-1440.png`, `private/vibescroll-dialog-choice-desktop.png` and `private/vibescroll-dialog-choice-proof.json`. The finish disposition covers this synthetic control only; it does not establish production saving, deployment or whole-plan acceptance.

The October 7 reviewer cleared this narrow Usage refinement with no material fixes. Populated genuine-staging captures in `.impeccable/review/usage-20261007/` cover 390, 1440 and 1567 CSS pixels with no horizontal page overflow. These are viewport emulations; they do not establish every dynamic state, physical-device, production candidate, provider-invoice or full V1 acceptance. No new palette, artwork, type or motion convention follows from this addition.

The incumbent toast, Sign in again label and native anchor remain unchanged. October 7 evidence in `.impeccable/review/reauth-route-20261007/browser-proof.json` records the source-specific link at 390, 1440 and 1567 CSS pixels and a later pathname/query check. The client received a simulated HTTP 400 before backend dispatch in a genuine staging session with a genuine source; no source edit occurred. The fresh reviewer cleared this routing correction. Its report retains the narrower evidence available at review time, before the later query check. These captures and checks do not establish live OAuth completion, production recovery, independent human or physical-phone acceptance, or full V1 acceptance.

October 7 documentation evidence is the implemented Explore, connection map and canvas plus their scoped design-recipe styles. The fixed desktop/phone captures, desktop-tree-final.png, mobile-tree-final.png, phone-320-tree.png and tablet-768-tree.png in .impeccable/review/knowledge-explore/ retain the local synthetic review. proof.json records native Escape closing, focus return and no horizontal overflow; fix-target-proof.json records the native structure summary's visible mint focus ring. Independent finish review cleared all five corrections: representation/recovery/disclosure targets, summary focus, canvas count fit, overview scale explanation and matching evidence-pagination copy. The ship disposition is LOCAL SYNTHETIC FRONTEND SLICE only. It establishes no real authentication, provider, source, permission, production, customer-result or full V1 acceptance.

The October 8 fix-only finish disposition is ship for responsive network framing, centered topic-root entry and the complete Combine ideas label. The final seven labeled synthetic captures in `.impeccable/review/visual-dashboard-20261008/` are `home-1440.png`, `home-390.png`, `network-1440.png`, `network-390.png`, `network-evidence-390.png`, `tree-1440.png` and `tree-390.png`. The reviewer opened all seven; builder evidence records zoom/reset and Enter/Escape focus return. The verdict at `private/vibescroll-visual-dashboard-finish-review-final-20261008.md` resolves the three existing findings only. It does not establish whole-surface, authenticated customer, human keyboard, physical-device or production acceptance. User-supplied diagrams remain direction references; the implemented diagrams are native code and add no shipping raster artwork.

The subsequent sparse-network framing review follows an actual production capture with a blank lead-in above 22 nodes. The settled local synthetic replacements at `.impeccable/review/visual-dashboard-20261008/framing-fix/network-1440.png` and `network-390.png` show evidence at the canvas entry. `private/vibescroll-network-framing-review-20261008.md` clears the occupied-origin correction locally and retains the prior three findings within this change scope. The 20-isolated-idea regression and reported 539 passing tests, three skips, 28 authentication tests and both builds are builder evidence. The larger production population after this fix remains pending recapture; this bounded verdict adds no whole-surface or production acceptance.

October 2 native Chrome checks covered 320, 360, 390, 412, 768 and 1440 CSS pixels without page overflow. Private captures include plan-editor-local-mobile.png and plan-editor-staging-saved-mobile.png. Saving the labeled staging plan created version 2 and a 64-character hash; it did not start coding. These checks do not certify the generated recommendation's usefulness or a full PR journey.

Documentation evidence: effective `product.css` followed by `studio.css`, `studio-home.tsx`, `scroll-character.tsx`, original asset provenance and the October 7 local desktop/phone captures in `.impeccable/review/studio/`. The synthetic captures establish visual evidence only. Finish disposition is scoped to the owner-pinned contract provenance and visible phone workspace fixes. This undeployed first slice is not full V1 acceptance, a deployment, a customer-data demonstration or completed roadmap work. Earlier component verification above retains its original scope; no new detector-pass claim is made.

The implemented personal-video UI shows prepare, transcribe and analyze stages, an explicit automatic-analysis permission choice, private frame access and original transcript inspection. Current and completed steps brighten their labels; pending work uses a spinner. Recorded verification now includes a real production upload whose generation-one personal-alpha analysis completed automatic Whisper transcription and sampled-frame ChatGPT analysis using gpt-5.6-sol at medium reasoning. This observed completion does not establish global production readiness, legal approval or audiovisual completeness.

Retain the existing dark overview, main-point cards and 44 px controls. The actual local detail stayed readable at 320/360/390/412/768/1440 without page overflow. A filtered library with zero rows still returned its separately authorized selected source. Native clicking, reload and background refresh passed; an initial automation reloaded before asynchronous navigation finished and was corrected. Invalid/deleted source links reveal no private record. This verifies source navigation and its states, not a complete mobile execution/PR journey.

## Do's and Don'ts

### Do:

- **Do** use cool light and matching dark surfaces with theme-primary selection.
- **Do** reuse original Scroll artwork and preserve visible phone workspace scope.
- **Do** keep loading, empty, ready, success and error feedback tied to actual state.
- **Do** preserve visible keyboard focus, 44px controls and live reduced-motion behavior.
- **Do** keep evidence, scope and recorded-outcome limits explicit.

### Don't:

- **Don't** turn filing templates into access scopes, invent parent links, exact totals, analysis completeness or benefit.
- **Don't** make a pointer reveal delay keyboard reading or action.
- **Don't** put a duplicate source enclosure around insight-owned cards.
- **Don't** publish private reference screenshots or turn a scoped fix verdict into production or full V1 acceptance.

October 9 release evidence supersedes the Atlas candidate and compact capture production-pending statements above: application e68fc3e52946 is Ready Production with exact canonical health/version, actual populated Library/Home reads and native compact header capture recovery at390/1440. See [the committed receipt](docs/operations/evidence/vibescroll-atlas-20261009.json). Review scopes and remaining independent/physical/provider/cost gates are unchanged.
