# Enforce the approved subscription session deadline

Mode: reference. Decision October 6, 2026. Status: implementation candidate.

The personal-session controller waited on an unreferenced expiry timer. Closing its completed official sign-in client left no active handles; Node exited with an unsettled top-level await before the cleanup block ran. An actual expired session still had its worker and proxy running at 15:21Z. The operator removed those exact owned containers and socket volume without reading credentials. Earlier evidence must retain this failure.

Compute one absolute deadline before setup, bounded to the approved thirty minutes or four hours. Keep the controller expiry timer referenced until cleanup completes. Both the isolated worker and proxy independently stop at that same absolute deadline, with no additional fifteen-minute grace or deadline reset after sign-in. Credentials remain in worker tmpfs; cleanup removes only this session's owned resources. No paid fallback, account reuse or credential retention is introduced.

Regression tests run real child processes to reproduce the no-other-handles condition and verify cleanup is reached. They also verify the four-hour bound and worker stop script. A real short-lived isolated Docker probe and the usual application checks provide separate evidence; a passing unit test does not prove a four-hour production session has expired correctly.
