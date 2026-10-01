# Product analytics

Dedicated project: VibeScroller, PostHog EU Cloud, project 289940. The public write-only project token is configured separately from the existing Exponential project's token. No personal API key is needed in the app. Free setup only; no new purchase.

## Events and denominators

| Event                | Meaning                                         | Allowed properties                   |
| -------------------- | ----------------------------------------------- | ------------------------------------ |
| page_viewed          | Sanitized public page class after consent       | Fixed page and surface enums; no URL |
| workspace_viewed     | App navigation after consent                    | Fixed view name                      |
| source_captured      | Server confirmed a capture                      | Input kind                           |
| import_previewed     | Local parser found selected Saved links         | Format, capped count                 |
| import_completed     | Server accepted the import                      | Accepted, duplicates, waiting counts |
| source_viewed        | User opened a source                            | Kind, processing state, coverage     |
| analysis_approved    | Server accepted separate analysis permission    | Funding route                        |
| analysis_completed   | The browser observed a transition to ready      | Funding route, coverage              |
| analysis_canceled    | Server accepted cancellation                    | None                                 |
| repository_connected | Server confirmed selected repository connection | None                                 |
| proposal_reviewed    | Server accepted the review decision             | Accepted, rejected or deferred       |
| plan_saved           | Server confirmed plan editing                   | None                                 |
| execution_approved   | Server accepted execution permission            | Local or cloud route                 |
| draft_pr_created     | Server returned from the trusted publisher      | None                                 |
| pr_reconciled        | Server returned from PR reconciliation          | None                                 |
| source_deleted       | Server accepted deletion                        | None                                 |
| operation_failed     | A named request was refused                     | Fixed operation and safe code        |

These events are opt-in browser observations, not authoritative billing or complete background-job records. Do not compute a global merge rate from pr_reconciled or imply a completed analysis equals an accepted proposal. Consent rejection, offline browsers and blockers create missing data. The backend's durable PR, billing and feedback records remain the authoritative denominators.

Recommended PostHog funnels: import_completed → source_viewed → analysis_approved → analysis_completed; repository_connected → proposal_reviewed → plan_saved → execution_approved → draft_pr_created. Segment by route and coverage. Show failures separately and preserve rejection as a valid result. No customer outcome or savings is established by these events.

## Privacy boundaries

CookieConsent 3.1.0 runs in opt-in mode, equal accept/reject prominence and a persistent preferences control. PostHog JS 1.435.5 uses the no-external bundle loaded only after permission, memory-only identity, no replay/autocapture/page URL/flags/surveys/LLM capture. A second allowlist before_send drops all unknown events and properties, including SDK URL/referrer defaults. Counts cap at 1,000. Tokens are the project's public write-only key, never account credentials. No source, email, workspace, repository or model prompt identifier is added.

Withdrawal prevents future captures and resets memory. Cookie checks notice withdrawal in another tab. Already-transmitted events cannot be unsent. DNT/GPC override a stored allow choice. Policy drafts do not constitute legal review. Confirm EU provider agreement, retention and production cookie inventory before paid launch.

## References

[PostHog Next.js documentation](https://posthog.com/docs/libraries/next-js), [PostHog JS](https://github.com/PostHog/posthog-js), [CookieConsent MIT repository](https://github.com/orestbida/cookieconsent), [CookieConsent React setup](https://cookieconsent.orestbida.com/essential/getting-started.html), [shadcn dropdown guidance](https://ui.shadcn.com/docs/components/dropdown-menu). Inspected 1 October 2026. Radix supplies accessible dropdown behavior; no competitor assets or production credentials are copied.
