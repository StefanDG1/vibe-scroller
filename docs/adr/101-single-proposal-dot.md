# ADR 101: One open proposal uses a solid dot

Status: accepted owner direction, October 10, 2026.

## Decision

In Tree and Folders, show one proven open proposal as a solid teal dot on the right of its insight card or category node. Show two or more as the existing numbered bubble. Keep the same 24px layout slot so switching between these states does not shift the title or chevron. The single dot is 12px, centered in that slot. Its accessible name remains "1 open proposal"; numbered bubbles retain their exact count.

Zero, pending and incomplete totals have no indicator. This refines ADR100's appearance only. Distinct counts, exact citation matching, permission checks, lifecycle exclusions, pagination and backend reads stay the same. Closed and merged proposals remain in Projects.

## Verification

Inspect the labeled synthetic demo in Tree and Folders at mobile and desktop sizes, including one, two, three and zero proposal states, both themes, accessible names and right-side alignment. Record available browser evidence separately from source checks and production deployment. No real proposals, inference or backend mutation are needed for this appearance change.
