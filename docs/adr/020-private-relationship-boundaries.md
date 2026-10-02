# Validate tenant relationships before joining records

Mode: explanation. Recorded October 2, 2026.

Checking the workspace on a proposal or run does not establish ownership of its referenced repository. Normal creation already checks these relationships, but restored or damaged records must not weaken private reads or authorize work.

The acceptance matrix reproduced a proposal query returning a foreign repository when its repository ID was deliberately changed in synthetic test data. Proposal and run reads now reject inconsistent relationships. Source-detail proposal joins filter workspace ownership. Plan generation, plan editing, execution approval, worker authorization and publication also validate the relevant ownership bindings. A failed binding returns an unavailable or forbidden result without repository context.

The synthetic matrix covers sixteen private read routes against an owner, viewer, foreign user, unsigned caller, removed member, inactive account and locked recovery deployment. Viewer writes remain denied. Corrupted joins are refused before context or work is returned. These component checks supplement actual production asset and tenant tests; they do not certify every private table or a completed production PR journey.
