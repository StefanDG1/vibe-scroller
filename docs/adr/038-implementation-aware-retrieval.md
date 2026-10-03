# Inspect implementation before recommending code changes

Mode: reference. Decision date: October 3, 2026. WP08, WP09 and WP17 apply.

An actual production match for an owned mobile-design video cited only a design specification and claimed that current controls were inadequate. The specification did not establish that defect; the current stylesheet already defines 44-pixel controls. The operator deferred this synthetic proposal with an explicit needs-context correction. No execution was approved.

Source-focused retrieval now admits immutable text blobs up to 250,000 bytes so ordinary larger components can be inspected. The bound for material supplied to a model remains 24 files, 4,000 characters per contiguous window and 40,000 characters overall. Whole-blob identity verification, excluded paths, secret scanning and strict cited-line validation remain unchanged. Coding and changed-file limits are separate and are not increased by this decision.

For interface-related sources, styles and JSX/TSX implementation files receive priority alongside lexical matches. Requirements documents remain available as context. The matching prompt explicitly distinguishes a specification from an observed implementation defect and requests needs_context when relevant code was not inspected. This is a retrieval improvement, not a guarantee that model recommendations are correct. The semantic retrieval version changes to prevent reuse of the earlier match.

Thirteen focused retrieval/planning tests passed, including a larger component, stylesheet selection ahead of specification-only matches, the size boundary and existing immutable-blob/cited-line denial checks. Actual repeated production matching is a separate acceptance check.
