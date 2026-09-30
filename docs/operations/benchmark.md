# Evaluate held-out clips

Mode: how-to. No complete real-media benchmark has passed.

Run `pnpm benchmark private-observations.json outputs/benchmark-report.json`. The command creates a new report and refuses to overwrite an existing one. Exit 0 means the supplied dataset is complete and meets the suggested quality target. Exit 2 means valid but incomplete or below target. Exit 1 means invalid input or output. This evaluator scores supplied observations; it does not generate clips, run inference or independently establish rights.

The strict input schema is exported as `benchmarkInput` from packages/evaluation/index.ts. Supply dataset/model/prompt versions, exact code commit, reviewer, repository profile versions, rights-cleared clip entries and observed results. Keep the manifest and observations private. Give every clip a stable ID, development or held_out split, rights reference, retention expiry, applicable categories and annotated repository dispositions. Speech reference and technical-name annotations are optional and must be reviewed.

Record actual attempted/usable/inaccessible status, processed seconds, measured settled cost or null, human review counts, supported main points, timestamp review counts, invented claims and repository outcomes. Do not substitute reserved cost for actual settled cost. Include limitations. Duplicate IDs, expired rights, foreign references and impossible counts are rejected.

Completeness requires at least 40 clips, held-out coverage of all specified categories, expected references for both repositories, and reviewed results for every held-out clip. Development observations never affect the held-out quality metrics. Unreviewed results remain in completion counts but not quality numerators. Empty denominators and unresolved cost return null rather than a perfect score or zero spend.

The report gives numerator and denominator for processing completion, evidence support, timestamp usefulness, normalized transcription word error, technical-name recall, match precision and abstention accuracy. It also gives invented claim counts, processed minutes, measured cost and unknown-cost count. The suggested quality target requires a complete dataset, zero critical invented claims and at least 90 percent supported main points. This is not production authorization or a statistical accuracy guarantee.

Security fixtures, execution isolation, billing, latency, cost calibration and margin tests need their own evidence. A good aggregate quality result cannot excuse an unauthorized write, secret exposure, duplicate PR or wrong merge badge. Preserve failures and run paired datasets when comparing model settings.
