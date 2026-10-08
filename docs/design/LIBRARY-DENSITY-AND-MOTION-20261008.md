# Library density and motion studies

Mode: explanation. Date: October 8, 2026. Status: proposed refinement, not implemented. The owner likes the selected atlas direction and asked how it scales to more categories and insights, with an icon on each insight, efficient cards, easy scrolling and restrained animation using existing libraries.

This extends the [UI and UX plan](VIBESCROLL-UI-UX-PLAN-20261008.md), not the production interface. Overview-first, remembered valid position, device theme and the five mobile actions remain confirmed. No dependency, application code, taxonomy, grant or processing job changed.

## Three concrete studies

| Study                     | Image                                                    | Use                                                                                                                            |
| ------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Expanded mobile outline   | [Preview](concepts/20261008-density/mobile-expanded.png) | Six sample insights within one expanded category, collapsed neighboring categories, shallow indentation and a load-more action |
| Focused mobile category   | [Preview](concepts/20261008-density/mobile-focused.png)  | Seven sample insights, compact ancestor path and almost full-width cards; preferred inside a busy branch                       |
| Dense desktop, dark theme | [Preview](concepts/20261008-density/desktop-dark.png)    | Category outline, ten sample insight cards in two columns, and selected evidence/proposal detail                               |

Recommend using these as views of the same library. Overview starts with collapsed categories and a short bounded insight preview when a branch is expanded. Focus opens that category for sustained browsing. Desktop separates category navigation, scanning and detail. A narrow desktop/tablet collapses detail into a page or sheet and the grid into one column before squeezing text.

Native imagegen produced three initial studies and one targeted correction removing the redundant Business row. The earlier draft remains in its native output directory; the selected images and [exact prompts](concepts/20261008-density/prompts.json) are preserved here. Sample claims, sources, icons, badges and generated brand marks are illustrative. They do not prove card dimensions, scroll behavior, contrast, throughput or smooth animation. The generated dark-screen slogan and altered marks are not approved product copy/artwork. Keep original Scroll artwork in implementation unless separately selected.

## Card anatomy and useful density

A compact insight row has a small icon tile, readable title, one short source line and an opening affordance. Show a project-use badge only when an authorized current relationship exists. Use one or two title lines in scanning views; expose the complete title in detail and an accessible name. Long labels, large text and translated copy can increase row height. Do not shrink fonts to meet a fixed card height.

Provisional sizing is 28–32 CSS pixels for the icon tile, roughly 64–80 pixels for a typical mobile row and 8-pixel gaps. These are targets for a later browser prototype, not dimensions verified by raster concepts. The whole row can open detail, with an explicit separate disclosure for category expansion. Avoid competing nested controls and preserve visible keyboard focus. Touch targets retain the 44-pixel product goal.

Use the existing Lucide icon dependency. An insight always has a recognizable icon, but does not need a unique bespoke illustration. Map verified existing type/category metadata to a small stable icon vocabulary, retain manual overrides where supported, and use a neutral lightbulb/document fallback when no meaningful mapping exists. No AI icon generation, classification inference, image download or database write is needed just to open the Library. Icons supplement labels; color alone does not convey meaning or readiness. Avoid arbitrary colors that change between visits.

Large covers, evidence text, revision details and proposal trails belong in selected detail. The scanning card does not repeat an Insight badge, several toolbars or a full source summary. On desktop, two columns are a density option, with row-major reading order. Single-column list remains available when labels or width require it.

## How the hierarchy scales

| Situation                  | Behavior                                                                                                                                            |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| A few insights             | Expanded outline, real empty/unfiled states, no empty infinite canvas                                                                               |
| Many categories            | Collapsed vertical category rows, bounded child pages, find-category/search with ancestor path; do not load all categories to search locally        |
| Busy category              | Focused category view, compact icon cards, stable sort and cursor pages, clear Show more/Retry actions                                              |
| Deep hierarchy             | Compact sticky ancestor path and a parent/back action; cap visual indentation instead of losing card width; retain existing twelve-level data limit |
| Many project relationships | Small authorized-use badge in the row; reveal the specific arrows/trail on selection, not hundreds of crossing lines                                |
| Very long rendered session | Consider virtualizing the flattened visible outline/list after profiling; loaded data remains separately bounded                                    |

Mobile uses one ordinary vertical content scroll. Keep only a compact scope/path header sticky after the larger heading scrolls away. Do not pin multiple tall ancestors above the cards. No horizontal carousel or mandatory pan/zoom. Category changes can use a labeled category drawer with scoped search rather than adding another permanent filter row. An Overview action and breadcrumbs preserve the user's location in the tree; the focused view is not a new flat taxonomy.

The selected branch expands by choice; do not auto-collapse another branch unexpectedly. Collapse all can be a secondary control. A last-view preference stores only scoped IDs and position, not source content/tokens, and is revalidated on return. Revocation or deletion returns to a safe valid view rather than showing cached protected detail.

Search returns current permitted matches and their path. Switching scope clears obsolete selection/read responses. A newly fetched page appends in stable order without moving the current reading position. Insertions, revisions and restored view state need a tested scroll-anchor policy. Preserve actual workspace/private ownership and filing; the mockups do not authorize relabeling legacy knowledge or combining scopes.

These patterns target representative fixtures of 1, 30, 300 and 3,000 insight occurrences, broad category sets and deep paths. Those are proposed test datasets, not production totals or certified capacity. Duplicate memberships retain canonical insight identity for counts/evidence and distinct scoped occurrence IDs for display. A mockup with ten cards does not prove performance at 3,000.

## Motion that explains changes

Use the open-source Motion for React core for coordinated expansion, presence and selected-detail transitions. It is not currently installed in the starter app. Existing CSS handles simple press/color/chevron feedback; preserve current menu/dialog primitives. Do not purchase Motion+ or build a new animation engine for these interactions.

| Interaction                                  | Proposed motion                                                                             | Purpose                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Expand/collapse category                     | Short 150–200 ms local reveal and chevron turn; neighboring visible positions settle gently | Explain where children belong                              |
| Select an insight                            | Immediate selection plus brief emphasis/color transition                                    | Confirm the selected item without making navigation wait   |
| Open detail                                  | Restrained 180–220 ms fade/short movement from the selection; faster close                  | Retain context between list and detail                     |
| Load another page                            | Show reserved loading state, then append; at most a short fade for newly added items        | Keep reading position and distinguish new content          |
| Reorder after an explicit user action        | Local position transition, only for visible affected rows                                   | Explain the deliberate structural change                   |
| Scroll, keyboard traversal, scope revocation | Native/immediate behavior                                                                   | Avoid latency, motion sickness and stale protected content |

No bouncing, parallax, continuous node physics, decorative connector drawing, scroll-triggered card choreography or whole-grid entrance cascade. Motion must be interruptible and must not postpone interaction or fetch completion. Existing visible cards do not animate again when a page arrives or rows re-enter the viewport.

Use device reduced-motion preferences. Disable position/layout movement and allow immediate or minimal nonmoving state feedback. A revoked source must leave the rendered/accessible detail immediately, rather than lingering for an exit animation. Accessibility denial overrides presentation.

Motion's documented layout transitions use transforms. Use scoped position-only transitions where scaling would distort text, local groups rather than a layout measurement on every library item, and scroll-container integration where appropriate. Stable scoped occurrence IDs prevent a repeated insight from teleporting between two categories. Do not run exit animations merely because virtualization unmounted an offscreen row. If virtualization owns row transforms, use an inner wrapper for local motion rather than two systems fighting over the same transform.

## Rendering efficiency and Convex usage

TanStack Virtual is an optional existing headless virtualizer for a genuinely long rendered list. It limits DOM work, not backend reads. Begin with bounded paginated native lists; add virtualization only if matched profiling shows a need. Preserve focused rows, keyboard traversal, large-text measurement and a paginated accessible alternative. Do not implement a partial ARIA tree whose offscreen nodes make its navigation model unusable.

Continue the plan's bounded indexed child/ancestor/evidence queries and existing authorization checks. Rendering an icon, expanding cached content, positioning cards or animating selection is local work. New child pages use bounded reads, never a whole-library scan, recurring polling or inference-on-open. Optional near-end prefetch needs a small explicit bound, deduplication, cancellation and a manual load-more fallback. No eager all-category evidence fetch follows from the desktop grid.

Measure database read/write consumption, request counts and payload at matched cold/warm workloads. Do not claim that virtualization or compact cards save Convex money without those results. Exact category counts remain unavailable or cohort-labeled until a tested scoped projection supports them. All provider restrictions, action reviews, caps and the cumulative EUR 2 finish budget remain intact.

## Proof required before shipping

Test finding an insight in broad and deep fixtures, reading full long titles, loading multiple pages without repeats/jumps, opening evidence and returning to the same item, scope switching, correction/deletion/revocation, duplicate memberships and empty/error states. Test 320/390 mobile, 768 tablet and 1440 desktop, large text, keyboard focus, screen-reader structure, touch targets and reduced motion. Record representative interactions under browser performance profiling; static images cannot establish smoothness. Physical-device and independent comprehension evidence remain separate.

## Verified references

- [Motion layout animations](https://motion.dev/docs/react-layout-animations): local layout/shared-element transitions, scroll offsets and text-scaling cautions.
- [Motion accessibility](https://motion.dev/docs/react-accessibility): device reduced-motion controls and manual adaptation.
- [Motion MIT license](https://github.com/motiondivision/motion/blob/main/LICENSE.md): open-source core license, distinct from paid Motion+ products.
- [TanStack Virtual introduction](https://tanstack.com/virtual/latest/docs/introduction): headless long-list rendering, with markup/styles supplied by the app.

These official pages were read in a bounded local browser review on October 8. The four research tabs were closed afterward; existing owner tabs were preserved. No package installation or application implementation followed.
