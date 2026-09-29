# Feedback and evaluation

Mode: reference.

## Feedback semantics

Record explicit decisions as events: useful, not useful, accepted, rejected, deferred, already implemented, wrong project, inaccurate, too expensive, too risky, implemented manually, merged, reverted, and measured outcome. Keep the actor, target, timestamp, relevant prompt/model version, and optional reason.

Do not convert inactivity into rejection. Do not convert acceptance into correctness. Do not convert merge into benefit. A user can like an idea but defer it because the project has a different priority.

Feedback remains within its workspace by default. Do not train across customers or change system instructions from customer feedback without a separate lawful, consented, reviewed process.

## Initial adaptation

Use explicit preferences to rerank future proposals. Examples include avoiding a framework, preferring smaller changes, excluding a repository from marketing ideas, or deferring infrastructure work.

Keep a human-readable preference ledger. Users can edit or remove preferences. Store the reason and source decision behind an inferred preference and ask for confirmation before turning it into a strong rule.

Periodically propose ranking adjustments from accumulated decisions, then evaluate them against a fixed test set. Do not autonomously fine-tune models or deploy self-written prompts. Roll back a ranking version when it increases inaccurate or irrelevant proposals.

## Metric definitions

| Metric | Numerator | Denominator and caveat |
| --- | --- | --- |
| Processing completion rate | Sources with completed usable analysis | Sources whose processing was attempted in the cohort; report inaccessible imports separately |
| Useful-proposal rate | Reviewed proposals explicitly judged useful | All proposals reviewed in the cohort; unreviewed proposals remain visible |
| Accepted-plan rate | Proposals with an accepted generated plan | Reviewed proposals eligible for planning |
| PR creation rate | Authorized runs that created a unique PR | Authorized runs started; retries do not add to the denominator |
| PR merge rate | Unique verified merged PRs | Unique PRs created in a selected cohort; report open PRs and observation window |
| Confirmed-benefit rate | Outcomes marked positive with evidence | Outcomes actually measured; show unmeasured count separately |
| Time to first proposal review | Time from first eligible import to first review | Activated users with an observed review, with non-activated users reported separately |
| Cost per processed minute | Settled platform cost for processing | Actual processed source minutes, excluding duplicate cache hits from the denominator |
| Contribution margin | Net revenue excluding tax and refunds minus variable costs | Net revenue; overhead excluded only in this explicitly named metric |
| Operating margin | Net revenue minus variable and allocated fixed operating costs | Net revenue; excludes salary, marketing, development, and company tax by owner definition |

Do not display estimated money earned or time saved as measured metrics. Users can record a self-reported estimate with that label. Revenue causality requires evidence beyond a before-and-after number.

## Evaluation set

Create at least 40 rights-cleared clips with a small annotated reference set. Cover coding demonstrations, changing on-screen text without cuts, accented English, noisy audio, creator captions that disagree with speech, old API advice, satire, unsupported business claims, useful non-code advice, no-fit content, and ideas already implemented in the test repositories.

Use at least two repositories with known profiles and expected match outcomes. Keep training or prompt-development clips separate from the final evaluation subset. Record clip rights and permitted retention.

## Quality checks

Measure transcription word error rate on annotated speech and separately score technical names. Score timestamp usefulness and evidence support. Measure project-match precision on reviewed candidates, abstention behavior, and the rate of invented file references.

A suggested initial launch target is zero critical invented API/file claims in the held-out sample and at least 90% evidence-supported main points under human review. This is a design threshold, not a current accuracy claim. If the sample cannot support a reliable percentage, publish the counts and limits.

For execution, require no unauthorized path writes, no secret exposure, no silent paid fallback, no duplicate PR, and correct merge classification in every adversarial fixture. These are pass/fail security requirements, not average scores.

## Experiment records

Every experiment stores dataset version, model/prompt version, code commit, settings, costs, observed results, limitations, and reviewer. Use paired comparisons when changing one model or pipeline setting. Do not compare a cheap short-video set with an expensive long-video set and call the difference a model improvement.

The dashboard's analytics events exclude transcript text, credentials, private code, and raw URLs with sensitive parameters. Use stable internal identifiers and aggregate where possible.
