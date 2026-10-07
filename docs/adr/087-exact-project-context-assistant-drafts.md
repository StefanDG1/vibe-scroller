# Bind private assistant suggestions to exact selected project context

Mode: reference. Decision October 7, 2026. Status: implementation candidate.

The evolution plan requires a reviewable project suggestion without granting coding, publication or spending authority. Reuse existing canonical knowledge evaluations and private issue drafts. The assistant does not run another inference, supply arbitrary issue text, create a follow-up implicitly or overwrite existing manual edits.

Extend an assistant grant with at most five explicitly selected repositories. Each binding includes the repository ID, base commit, confirmed business-context version and snapshot-selection version. The separate context-read scope must be present in both OAuth and the app grant. Confirmed library goal/interests are a separate optional choice, not implicitly included by selecting a project. Existing grants omit project bindings and retain their original meaning.

Project choices and post choices use separate bounded queries because Convex permits only one paginated query per function. Each page has twenty metadata entries. Selecting context never grants repository code or chat history. Profile discovery pages ten approved profiles; requesting one exact profile includes at most five current selected project contexts and five current evaluations per project. Omitted evaluations and changed context are disclosed.

`draft_project_suggestion` requires its separate registered scope, explicit request, exact current evaluation hash and app-grant version. Every referenced source must be selected, current and rights-attested. Existing evaluation checks enforce current topic, preferences, project commit, context and snapshot bindings. Output references must remain a subset of the evaluated references. Owner/admin authority remains mandatory, matching the existing private issue workflow.

Relevant current evaluations create or reopen a private cited draft. No-fit, already-implemented, unsupported-claim, needs-context and deferred results remain distinct and create no draft. A retry returns the existing draft identity without changing manual content or creating a second draft. The protected project review page identifies its Reviewed issues section; no nonexistent issue detail route is advertised. The result explicitly withholds publication and coding authority. Benefit and effort remain hypotheses.

Affected checks: actual Convex handler current/replay/manual preservation/non-fit/revocation/foreign project and cross-page tests, actual SDK dual-scope/schema dispatch, existing auth, Basic build policy and both production builds. Native synthetic captures verify the local selector. Real host OAuth scope consent, provider revocation, two-account behavior and comprehension remain external acceptance gates. Provider registration and activation must not precede a deployed verified adapter.
