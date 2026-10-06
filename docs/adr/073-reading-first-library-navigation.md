# ADR 073: Separate library reading from work controls

Mode: reference. Status: accepted. Date: October 6, 2026.

## Context

The owner could not find the map preview and described the library as confusing and excessive. The former screen stacked analysis trials, settings, filters, topic cards, corrections, evaluations, full issue editors and individual posts. Adding a map inside that stack did not solve discovery.

## Decision

Library has four explicit views: Knowledge, Posts, Ideas and Issues. Existing workflows remain available; only the selected view is visible. Issue editors and the library remain mounted across these view switches to preserve unsaved text, as well as durable saved corrections. Existing source search/filter entry points and synthetic failure/loading states open Posts. Project-embedded knowledge has its own Knowledge/Ideas/Issues navigation.

Knowledge shows searchable topic rows. Filters and analysis settings are disclosures. Opening a topic replaces the overview with its map and a Back to topics action. Full explanations, coverage, corrections and project evaluation have named disclosures. Private source links remain directly available from map nodes. Closing a topic restores focus after the hidden overview becomes visible.

The labeled demo accepts `view=library&map=1` to open its synthetic topic immediately. It does not load private production content or authorize processing. Existing pagination, manual correction, server authorization, budgets, exact issue approval and separate coding approval remain intact. The design keeps the existing dark palette and owner-authorized accent. No inference, new dependency, graph provider or funding change is introduced.

## Validation

Browser checks cover direct map entry, four view switches, source filtering, topic return/focus, collapsed editing controls, evidence expansion, keyboard use and narrow/desktop layouts. Record actual results and failures in implementation status. Owner feedback is qualitative usability evidence, not an independent usability study or proof of business benefit.
