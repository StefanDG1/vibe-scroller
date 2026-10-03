# Evaluate held-out clips

Mode: how-to. No complete real-media benchmark has passed.

Run `pnpm benchmark private-observations.json outputs/benchmark-report.json`. The command creates a new report and refuses to overwrite an existing one. Exit 0 means the supplied dataset is complete and meets the suggested quality target. Exit 2 means valid but incomplete or below target. Exit 1 means invalid input or output. This evaluator scores supplied observations; it does not generate clips, run inference or independently establish rights.

The strict input schema is exported as `benchmarkInput` from packages/evaluation/index.ts. Supply dataset/model/prompt versions, exact code commit, reviewer, repository profile versions, rights-cleared clip entries and observed results. Keep the manifest and observations private. Give every clip a stable ID, development or held_out split, rights reference, retention expiry, applicable categories and annotated repository dispositions. Speech reference and technical-name annotations are optional and must be reviewed.

Record actual attempted/usable/inaccessible status, processed seconds, measured settled cost or null, human review counts, supported main points, timestamp review counts, invented claims and repository outcomes. Do not substitute reserved cost for actual settled cost. Include limitations. Duplicate IDs, expired rights, foreign references and impossible counts are rejected.

Completeness requires at least 40 clips, held-out coverage of all specified categories, expected references for both repositories, and reviewed results for every held-out clip. Development observations never affect the held-out quality metrics. Unreviewed results remain in completion counts but not quality numerators. Empty denominators and unresolved cost return null rather than a perfect score or zero spend.

The report gives numerator and denominator for processing completion, evidence support, timestamp usefulness, normalized transcription word error, technical-name recall, match precision and abstention accuracy. It also gives invented claim counts, processed minutes, measured cost and unknown-cost count. The suggested quality target requires a complete dataset, zero critical invented claims and at least 90 percent supported main points. This is not production authorization or a statistical accuracy guarantee.

Security fixtures, execution isolation, billing, latency, cost calibration and margin tests need their own evidence. A good aggregate quality result cannot excuse an unauthorized write, secret exposure, duplicate PR or wrong merge badge. Preserve failures and run paired datasets when comparing model settings.

## October 3 production observations

Forty labeled owned synthetic clips were uploaded to a separate owner QA workspace. The unchanged monthly trial ceiling stopped dispatch at twenty-six attempts: twenty-three analyses succeeded, three earlier attempts failed, fourteen remained saved and unprocessed. Forty-six actual Google comparisons against two owned local repository excerpt fixtures completed with strict source and repository evidence validation. These fixtures were not installed customer repositories and did not publish PRs.

The successful analysis receipts total a conservative EUR 0.281933 inference estimate and 69 service credits. Matching adds a conservative EUR 0.179094 estimate. The combined EUR 0.461027 is not a paid invoice, excludes unresolved failed usage and is not a complete infrastructure cost. Successful processing took 40.492–125.698 seconds, median 46.836. Google metered inference funded this batch, not the owner's ChatGPT subscription.

The dataset contains twenty scenarios and twenty labeled variants using two installed US-English synthetic voices. Genuine accented English and human scoring are missing. The evaluator correctly returned exit 2 and completeDataset=false. The valid incomplete report is outputs/owned-benchmark-incomplete-report-20261003.json. The private review packet is private/quality-review/owned-2026-10-03/review.html; its references and observations must not be published as customer data. No hold, budget or quality gate was changed to make the result pass. See [coarse observations](../../infra/owned-quality-observations-20261003.json).
