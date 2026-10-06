# ADR 072: Display cited topic connections as a map

Mode: reference. Status: accepted. Date: October 6, 2026.

## Decision

Topic detail defaults to an interactive tree with a text alternative. Topic branches express membership. Named connection nodes express the existing saved relationship and link its cited insights as a group. They do not invent pairwise agreement, causality or connections across topics. Selecting an insight or connection exposes full claims and authenticated source links.

Reuse the authorized, bounded knowledge detail query. Only current, non-excluded evidence on that page appears. A connection requires at least two distinct exact references and all its references must survive on the current page. A stale or incomplete connection is omitted, while surviving topic members remain inspectable. Pagination and the existing correction controls remain available. The map does not trigger inference, spending, an external graph service or additional content retrieval.

Use semantic lists and ordinary buttons, labeled selections and source links. Branch lines are decorative CSS. Mobile stacks branches vertically; desktop uses available columns. No drag-only controls, automatic animation or graph-library dependency is introduced. Workspace changes and server access denial continue to clear topic data; refreshed evidence cannot retain a selected missing claim.

## Validation

Tests exercise exact versioned references, multi-source connection groups, duplicates, exclusion, deletion, stale versions and page boundaries. Record browser, build and deployment evidence separately in the implementation ledger. The graph is not a claim that every source, topic or connection was independently verified.
