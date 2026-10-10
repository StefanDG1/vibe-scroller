# ADR 102: Branch-owned tree connectors

Status: accepted owner bug report, October 10, 2026.

## Decision

Each Tree branch owns its connector SVG inside the existing Motion height/opacity container. Its parent-card stem fades with that branch. Closing changes accessibility and selection immediately, but retains the connector geometry until the visual branch has closed. Sequential branch switching retains the existing one-time completion handoff.

Measure geometry before paint with useLayoutEffect and ResizeObserver, using each branch's natural inner frame. Horizontal row scroll schedules one animation-frame measurement. Update retained SVG paths by topic ID and write only changed geometry. Do not schedule React state renders for each geometry frame or stretch one shared SVG across the changing whole-tree height.

Tree and Folders retain the same navigation, saved position, single-child traversal, fork stops, inline evidence, proposal indicators and keyboard/reduced-motion behavior. This fixes connector rendering only. It adds no backend read, inference, dependency, permission or paid operation.

## Verification

Reproduce the incumbent premature connector removal during native pointer closing. Compare frame samples after the fix, checking path retention and local geometry, close-before-open sibling switching, horizontal scrolling, keyboard and reduced motion. Inspect mobile and desktop themes with overflow checks. Record local synthetic evidence separately from authenticated production and physical-phone acceptance.
