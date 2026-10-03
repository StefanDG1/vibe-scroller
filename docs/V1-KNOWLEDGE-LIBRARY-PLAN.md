# Plan the workspace knowledge library and GitHub issues

Mode: reference. Status: implementation plan, not completed work. Owner requirements confirmed October 3, 2026. Baseline: 407e5501b4fd431709a2b0e785a58b402073fe12. [ADR 052](adr/052-workspace-knowledge-and-reviewed-issues.md) records the approved direction. This document covers the features discussed in this conversation, within V1. It supplements [the post-V1 plan](POST-V1-PLAN.md) and does not start V2.

## Intended result

A person grants the GitHub App access once, chooses repositories in VibeScroller, and confirms the business context that AI proposes. Their workspace library connects insights from saved posts into understandable topics. New information updates those topics without erasing their corrections. The person sees how a topic could help a selected repository, then reviews and publishes a detailed GitHub issue. Coding and draft PRs remain separately approved options.

Each workspace has its own library. Membership in two workspaces does not combine their content, repository context, retrieval results or derived ideas. The library remains useful without GitHub.

## Existing behavior and missing work

This baseline was checked against application code, not only earlier specifications.

| Area                  | Existing implementation                                                                                                                                                                                       | Missing work in this plan                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub access         | The dedicated App offers All repositories or Only select repositories. `console.tsx` connects one authorized repository through a dropdown. `githubAuthorization.ts` checks the linked user and installation. | Searchable, paginated repository checklist with bulk selection, removal, progress and access-loss handling. An All repositories grant must not enable every repository in the app. |
| Business context      | `integrations.draftProfile`, `profiles.ts` and `product.saveProfile` support quoted AI drafting, free-text editing, confirmation and version invalidation.                                                    | Make the AI draft the default onboarding path, show understandable fields and evidence, and offer one-action confirmation or correction. Preserve existing profiles.               |
| Saved content         | Sources retain cited insights. `categories.ts` and `productSchema.ts` provide collections, topics, manual overrides, workspace filtering and search.                                                          | Connections between insights from different posts, combined explanations, conflicting advice, useful combinations and persistent organization feedback.                            |
| Repository relevance  | A whole post can suggest up to five projects, followed by repository-specific evidence review. Proposals have one `sourceId`.                                                                                 | Retrieve knowledge across the whole analyzed workspace library, evaluate groups against selected repositories, and support versioned evidence from multiple sources.               |
| Implementation output | Plans are editable and export as JSON. Approved coding can create a draft PR.                                                                                                                                 | Editable issue drafts, Markdown export, separately approved GitHub issue publication, duplicate prevention and issue status.                                                       |
| User experience       | Responsive library, source, project and proposal views exist.                                                                                                                                                 | Topic overview, combined knowledge detail, project opportunities, business-context review and issue review, with clear coverage and update states.                                 |

The principal existing files are `apps/starter/components/console.tsx`, `plan-editor.tsx`, `convex/productSchema.ts`, `categories.ts`, `profiles.ts`, `planning.ts`, `integrations.ts`, `lib/githubAuthorization.ts`, and `packages/providers/github.ts`. New module names below are proposed paths, not claims that files already exist.

## Product requirements

| ID  | Required behavior                                                                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K01 | Users can grant All repositories at GitHub and choose the active subset through the app checklist. Future GitHub repositories appear unchecked.                             |
| K02 | AI drafts business context from permitted repository evidence by default. The user can confirm it in one action, correct individual fields or enter context manually.       |
| K03 | All eligible analyzed insights in the workspace are available for retrieval. Private, deleted, unsupported or unprocessed content is never presented as understood.         |
| K04 | Automatic organization connects similar, complementary, conflicting and otherwise useful ideas, with a plain explanation and source evidence.                               |
| K05 | New posts, source corrections and repository context changes trigger bounded updates. User names, pins, exclusions and split decisions persist.                             |
| K06 | A user can understand a topic, its supporting posts, disagreements and possible applications without reading a graph or technical identifiers.                              |
| K07 | A topic or chosen group of ideas can be evaluated against one or several selected repositories. No-fit and already-implemented results remain valid.                        |
| K08 | A user can draft and publish a detailed issue for a chosen repository without approving code execution or a PR.                                                             |
| K09 | Every derived result retains source generations, repository commit, confirmed business-context version and processing versions. Changed inputs make affected results stale. |
| K10 | Workspace isolation, current access, deletion, export, spending ceilings and existing provider restrictions apply to every new record and job.                              |

## Concepts and screens

The primary vocabulary is Library, Topics, Projects, Ideas and Issues. Collections remain broad navigation. Topics collect connected knowledge and can contain several posts; a post may appear in several topics. A connection must explain something useful, not merely report that two sources share words.

Library shows topic cards with a short explanation, source count, recent changes and unresolved conflicts. A list of individual posts remains available. Topic detail answers: What is the idea? Which posts support it? Where do they disagree? Why might these ideas work together? Which projects could use it? Expandable evidence opens the existing private viewer.

Projects contains the repository checklist and an editable business-context card. The AI draft labels guesses and missing information. Confirmed user corrections take priority over later inferences. A later refresh proposes changes rather than silently changing confirmed goals.

A project's Ideas view shows useful changes, ideas already implemented, no-fit decisions and work requiring more context. Each item explains why it applies to this project. Issue review shows the target repository, exact public or private visibility, editable title/body, evidence selection and Publish issue. No issue is published merely by accepting an idea.

Empty, updating, partially analyzed, stale, budget-paused, unavailable and disconnected states have useful next actions. Coverage says how many eligible sources have been processed and which remain pending. No screen claims that the entire library was reviewed when a bounded job covered only part.

## Data and processing design

Use the existing Convex database, source analyses, categories, repository snapshots, inference adapter and durable job/budget machinery. A new database vendor or model provider is unnecessary for the first implementation. A dedicated graph database, customer-content training and a conversational agent are outside this scope.

Proposed records are workspace-owned knowledge topics, topic memberships, explained relations, versioned topic summaries, organization overrides, repository knowledge evaluations, issue drafts and publication attempts/receipts. References identify a source, its analysis generation and a stable insight identifier. Topics support many-to-many membership. Summary claims cite specific references rather than only a topic name. Confirmed context and manual corrections have their own versions. Dependent records retain version checks even beyond the current first-page limits; paginated invalidation must cover larger libraries.

Existing single-source proposals and plans remain valid. Add a bounded evidence-set representation for new multi-source evaluations; retain compatibility with the existing `sourceId` path. A new issue draft need not invent code files merely to satisfy a coding-plan schema. Issue-only advice, research or business changes can have explicit unknown file locations. Coding plans still require their existing stricter file and execution checks.

Automatic updates mean maintaining records and relationships from approved analysis, not retraining models. Candidate retrieval uses workspace filters, existing search/categories and bounded batches first. An embedding index is optional only if measured retrieval quality justifies it and its provider, privacy, cost and deletion behavior pass review. Retrieval excludes foreign/deleted data before ranking, not after a global search.

Jobs process changed inputs and affected topics rather than comparing every post with every other post on each import. They record input versions, cursors, coverage, retry limits, model/prompt versions and measured usage. Repeated events reuse completed work. Late results cannot resurrect deleted sources or overwrite newer user corrections. A relationship can identify shared advice, complementary steps, conflicting advice or a useful project connection. Model uncertainty is not a calibrated truth score. Repeated copies of one claim are not independent verification.

An All repositories grant permits discovery, not indiscriminate cloning. Read limited list metadata to populate choices. Retrieve repository content only for the app-selected subset, subject to current user/installation authorization. Selection changes invalidate affected queued work and approvals. Existing external issues/PRs remain external history and are not silently deleted.

## Work packages and dependencies

| Package | Deliverable                                                   | Depends on                                                 |
| ------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| W01     | Contracts, compatibility, privacy/deletion and job boundaries | This approved scope; existing tenancy and budget machinery |
| W02     | Repository checklist and AI-first context review              | W01                                                        |
| W03     | Incremental topic organization and combined knowledge         | W01                                                        |
| W04     | Library/topic experience                                      | W03; screen prototypes can precede backend completion      |
| W05     | Knowledge-to-project evaluations                              | W02, W03                                                   |
| W06     | Reviewed GitHub issues and export                             | W05; issue UI/protocol preparation can run earlier         |
| W07     | Integration, migration, UX and release evidence               | W02 through W06                                            |

### W01. Define compatible records and enforcement

Deliver strict serialized contracts, indexed workspace-owned records, version/state rules and migration/backfill design. Proposed modules include `packages/knowledge/` and `convex/knowledge.ts`; publication uses a separate proposed `convex/issues.ts` with a trusted provider adapter. Extend API, data-model, state-machine and privacy/export documentation during implementation.

Specify field lengths, source counts per inference request, page sizes, concurrency, retries, timeouts and per-job quotes before enabling processing. Retain current monthly/service/provider ceilings. Backfill reads existing analyses and does not reprocess media or bill again for completed analysis. Any new synthesis inference has its own bounded reservation. Backup/recovery quarantine must include new publication and organization jobs.

Acceptance: strict unknown-property rejection; cross-workspace reads/writes/search denied; stable cursors cover a library larger than one page; old sources/profiles/proposals remain readable; deletion and disconnect fence delayed results; export contains permitted new records but no credentials or private storage URLs; rollback disables new workers without losing existing data or ledger holds.

### W02. Select projects and confirm inferred context

Replace the single repository connection dropdown with searchable checkboxes, installation/account filters, selected count and Save selection. Select all applies to the visible filtered choices and says so. Saving shows per-repository progress, partial failures and retryable failures. Server checks every submitted identity against the current authorized choices. Newly discovered repositories remain unchecked.

Selecting repositories offers a batch quote covering snapshot/context preparation. With approved funding, AI drafting is the default. Context cards cover purpose, intended users, stage, goals, business model, constraints and non-goals. The card states what evidence informed the draft, distinguishes assumptions and offers Looks right or Edit. Unknown facts stay unknown. Manual entry works without AI funding. Existing confirmed profiles survive migration without re-drafting.

Acceptance: actual All repositories and restricted installation cases; multi-page discovery; multiple installations; revoked/private/renamed/transferred repositories; forged IDs refused; subset only receives snapshots; selection removal invalidates pending work. Context can be confirmed/corrected on mobile and keyboard, stale drafts are refused, later refresh preserves user fields, and batch partial failures do not duplicate charges.

### W03. Connect and maintain workspace knowledge

Backfill topic memberships from existing analyzed insights. Build incremental candidate retrieval, explained relations and cited topic summaries. Add rename, pin, include/exclude, move, merge and split controls. Store persistent exceptions so a rejected connection or split is not undone by the next automatic update. Distinct posts stay accessible even when classified as similar.

New completed analysis schedules bounded updates only under the workspace's reviewed automatic-organization funding policy. The feature defaults to automatic organization when eligible funding is configured. The user sees and can pause its ceiling. Consent to organization alone does not authorize unspecified paid work. Exhaustion or unavailable inference leaves searchable prior knowledge intact and marks pending updates.

Acceptance: retained test sets cover similar, complementary, conflicting, unrelated and duplicate material, with human reference judgments separate from model output. Every summary claim cites a surviving reference. No invented useful relationship is forced for an unrelated source. Corrections/pins/split decisions survive reruns. Events, interruptions and resume do not duplicate rows or usage; deletion removes derived access and recomputes affected summaries. No foreign-workspace candidates reach the model. Large-library updates remain bounded and coverage is visible.

### W04. Make the library understandable

Build Library topic cards, topic detail, grouped evidence, a recent-updates view and related-project actions. Keep source list/search and familiar collections available. Explain a topic in plain language before showing its constituent insights. Show disagreement and unsupported conclusions explicitly. Provide title/source search and filters for project applicability, readiness and recent updates. A node graph is not required.

Acceptance: native 320, 390, 430, 768, 1024 and 1440 CSS-pixel checks; no overflow; visible focus, keyboard navigation, touch targets and reduced motion. Loading, empty, no-fit, stale, deleted evidence and budget-pause states work. Physical Android checks remain distinct. Fresh users can explain a combined topic, inspect its original evidence, correct organization and identify a useful next action; engineer regression is not counted as independent usability.

### W05. Apply combined knowledge to selected projects

Add project-level discovery across all eligible workspace knowledge and topic-level evaluation against chosen repositories. Paginate/index the full corpus rather than silently restricting it to the first page. Each inference receives a bounded relevant evidence set. Coverage and omissions are explicit; the entire library need not fit one prompt.

Reuse confirmed profiles, current repository snapshots, inspected file evidence and existing relevance/no-fit rules. Store source-set hash/version, topic version, repository SHA, profile version, model/prompt versions and rejected/deferred decisions. One group may help several repositories differently. Each repo gets its own evaluation and optional issue; avoid automatically publishing a topic to every selected repo.

Acceptance: real owned repositories plus held-out useful/no-fit/already-implemented cases; multi-source combinations and contradictions; stale source/profile/base invalidation; omitted and unavailable source coverage; current access at commit. Multiple repositories receive distinct grounded explanations, not copied generic advice. Out-of-scope goals and nonexistent files are not invented. Old single-source proposal and coding/PR journeys still pass.

### W06. Review and publish detailed issues

Create an issue from a selected idea or topic and repository. Reuse provenance and plan fields where applicable. The draft includes problem/context, why it fits, cited source insights, relevant repository evidence, suggested approach, acceptance criteria, tests, risks, alternatives and open questions. It records the evaluated commit/context version. Effort and benefit remain hypotheses unless measured.

Provide editable Markdown, preview and Copy/Download even when GitHub issue permission is absent. Actual publication requires verified Issues write permission, current linked-user/installation/repository access, allowed workspace role and separate approval bound to target repository and exact reviewed title/body hash. Verify current provider documentation and App settings during implementation; contents or PR permission does not prove issue permission. Prepare the consent screen if installation owners must approve a permission change.

Private workspace knowledge does not become public by default. Show repository visibility and the exact text leaving VibeScroller. Default to concise paraphrases and authenticated evidence links; exclude raw transcripts, screenshots, private code excerpts, credentials and signed storage URLs. A separate inclusion choice controls sensitive excerpts. Processing permission does not establish publication rights; only permitted excerpts may leave the app. Secret/privacy checks can still reject publication after user review. No model output can grant access or approve publication.

Use a stored attempt identity and recoverable provider marker/receipt to prevent duplicate issues. On an unknown network result, reconcile authoritative GitHub state before retrying. If reconciliation cannot prove the prior result, leave the attempt unknown and block a blind retry. Absence from one response page does not prove that no issue was created. Preview identifies existing linked issues for the same idea/repository and permits an explicitly reviewed follow-up rather than creating hidden duplicates. Refresh open/closed/reopened state; edited or deleted external issues are handled without overwriting user edits. Closing an issue does not establish implementation or benefit.

Acceptance: actual issue creation on an explicitly authorized owned test repository; exact reviewed bytes/target; public/private visibility warnings; permission denial and downgrade; disabled repo; stale source/profile/base; malicious source/repository text; secret refusal; ambiguous timeout and duplicate webhook/retry tests; foreign-user denial; reopen/close reconciliation. No coding, branch, PR or merge is produced by issue-only publication. Linked receipts survive source deletion while private draft content follows retention. Explain that deleting app content does not delete an existing GitHub issue; any external edit/deletion requires separate authorization. Workspace/account deletion follows the existing documented retention rules.

### W07. Verify and release in stages

Roll out repository/context changes, then library organization, then project evaluations and issue publication. Each application stage needs tests, real provider acceptance where applicable, exact-commit CI and private implementation evidence. The current production app remains available while new features are gated.

Verification includes formatting, lint/types, strict contracts, relevant tenant/deletion/budget/race tests, dependency/secret checks and production builds. Existing regression suites include `categories.test.ts`, `content-export.test.ts`, `planning-retrieval.test.ts`, `github-refresh.test.ts`, `github-publish.test.ts`, `source-repository-retrieval.test.ts`, privacy/recovery and inference-budget tests. New organization, selection and issue tests need adverse cases rather than mirrors of implementation.

Real acceptance uses permitted source groups, selected owned repositories and explicitly approved test issue publication. Live provider work needs a current bounded quote and headroom; no cap increase is implied. Phone consent/MFA is requested only when the provider requires it. No codes enter files, logs or commits. Physical Android, fresh-user comprehension, numerical usefulness and invoice settlement each retain their own actual outcomes or skipped/blocker status.

Release requires verified migration/backfill, interrupted-job recovery, stale-result rejection, export/deletion and kill switches. Use fixed Basic queued Vercel builds, the existing provider stack, immutable alpha versions and normal required checks. Marketing describes only deployed, demonstrated capabilities. These features do not close the earlier numerical, invoice, full serving-recovery or cohort gates automatically.

## Scope and review conclusions

The owner approved workspace separation, automatic organization and AI-first context with easy confirmation/correction. This request authorizes a plan. It does not report these additions as implemented or authorize production issue publication on behalf of customers.

V2-created businesses, autonomous account/domain/merchant provisioning, advertising, public campaigns, cross-customer learning, pooled ChatGPT subscriptions and automatic merge/deployment remain excluded. Live Instagram synchronization, Telegram, Gemini and physical Android feature expansion are not added by this scope. Existing import/access limitations remain visible.

Review found four implementation risks that determine the order: repository selection must precede content retrieval; manual decisions need durable versions before automatic regrouping; multi-source evidence needs a compatible contract before project matching; and issue publication needs its own authorization/idempotency path before any real write. There is no independent evidence yet for organization quality, improved business decisions, lower correction effort or issue-first customer demand.

The finished V1 acceptance journey is: select repositories, confirm AI context, import permitted posts, inspect a coherent topic and its evidence, correct its organization, see distinct repository applications, review a complete issue, explicitly publish it, and observe its real GitHub state. It must work on mobile with no coding approval required.

## Implementation tracking

The owner subsequently requested implementation of W01�W07. Follow [the execution ledger](V1-KNOWLEDGE-EXECUTION.md) for exact implemented behavior, limits, migration, tests and outstanding external acceptance. The requirements and acceptance criteria above remain authoritative; an engineering pass alone does not complete external or independent-user acceptance.
