# ADR 103: Numbered single-proposal bubbles

Status: accepted owner refinement, October 10, 2026.

## Decision

Show the number for every positive proven proposal bubble, including one, in both Tree and Folders. Keep its right-side 24px slot, theme color and exact accessible count. This supersedes ADR101's dot-only appearance. Zero and incomplete totals remain hidden.

The owner also asked for parent numbers to represent the sum or total of the children. The existing implementation counts distinct proposals, including descendant references, once at each parent. Shared proposals can appear in multiple children. Whether the new number should instead count repeated child links is awaiting the owner's clarification; this appearance refinement does not silently change the unit counted or turn partial totals into complete counts.

## Verification

Inspect one and multiple counts in both views and themes without changing record access, citation matching, pagination, provider lifecycle checks or backend reads. Record the unresolved aggregation clarification separately from the implemented numeral.
