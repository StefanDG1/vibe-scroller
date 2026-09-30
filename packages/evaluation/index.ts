import { z } from "zod";
const categories = [
  "coding",
  "changing_text",
  "accented_english",
  "noisy_audio",
  "caption_disagreement",
  "old_api",
  "satire",
  "unsupported_claim",
  "non_code",
  "no_fit",
  "already_implemented",
] as const;
const disposition = z.enum([
  "relevant",
  "no_fit",
  "already_implemented",
  "unsupported_claim",
  "needs_context",
]);
export const benchmarkInput = z
  .object({
    datasetVersion: z.string().min(1),
    codeCommit: z.string().regex(/^[a-f0-9]{40}$/),
    modelVersion: z.string().min(1),
    promptVersion: z.string().min(1),
    reviewer: z.string().min(1),
    repositories: z
      .array(
        z
          .object({ id: z.string().min(1), profileVersion: z.string().min(1) })
          .strict(),
      )
      .min(2),
    clips: z
      .array(
        z
          .object({
            id: z.string().min(1),
            split: z.enum(["development", "held_out"]),
            rights: z
              .object({
                reference: z.string().min(1),
                permittedRetentionUntil: z.string().datetime(),
                attested: z.literal(true),
              })
              .strict(),
            categories: z.array(z.enum(categories)).min(1),
            expected: z
              .array(
                z.object({ repositoryId: z.string(), disposition }).strict(),
              )
              .min(1),
            referenceSpeech: z.string().optional(),
            technicalNames: z.array(z.string().min(1)).default([]),
          })
          .strict(),
      )
      .min(1),
    results: z.array(
      z
        .object({
          clipId: z.string(),
          attempted: z.boolean(),
          usable: z.boolean(),
          inaccessible: z.boolean(),
          transcript: z.string().optional(),
          processedSeconds: z.number().nonnegative(),
          settledUsdCents: z.number().nonnegative().nullable(),
          reviewed: z.boolean(),
          mainPoints: z.number().int().nonnegative(),
          supportedMainPoints: z.number().int().nonnegative(),
          inventedFileClaims: z.number().int().nonnegative(),
          criticalInventedClaims: z.number().int().nonnegative(),
          usefulTimestamps: z.number().int().nonnegative(),
          reviewedTimestamps: z.number().int().nonnegative(),
          matches: z.array(
            z.object({ repositoryId: z.string(), disposition }).strict(),
          ),
        })
        .strict(),
    ),
    limitations: z.array(z.string().min(1)).min(1),
  })
  .strict();
const words = (value: string) =>
  value
    .toLocaleLowerCase("en")
    .normalize("NFKC")
    .match(/[\p{L}\p{N}]+/gu) ?? [];
export function wordErrors(reference: string, actual: string) {
  const a = words(reference),
    b = words(actual);
  if (a.length > 20000 || b.length > 20000 || a.length * b.length > 4000000)
    throw Error("Transcription comparison bound exceeded");
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(
        row[j] + 1,
        next[j - 1] + 1,
        row[j - 1] + Number(a[i - 1] !== b[j - 1]),
      );
    row = next;
  }
  return { errors: row[b.length], referenceWords: a.length };
}
export function evaluateBenchmark(raw: unknown, now = Date.now()) {
  const input = benchmarkInput.parse(raw);
  const unique = (values: string[]) => new Set(values).size === values.length;
  if (
    !unique(input.repositories.map((r) => r.id)) ||
    !unique(input.clips.map((c) => c.id)) ||
    !unique(input.results.map((r) => r.clipId))
  )
    throw Error("Duplicate evaluation identifier");
  const repositories = new Set(input.repositories.map((r) => r.id)),
    clips = new Map(input.clips.map((c) => [c.id, c]));
  for (const clip of input.clips) {
    if (
      Date.parse(clip.rights.permittedRetentionUntil) <= now ||
      !unique(clip.expected.map((m) => m.repositoryId)) ||
      clip.expected.some((m) => !repositories.has(m.repositoryId))
    )
      throw Error("Invalid rights or reference mapping");
  }
  for (const result of input.results) {
    if (
      !clips.has(result.clipId) ||
      !unique(result.matches.map((m) => m.repositoryId)) ||
      result.matches.some((m) => !repositories.has(m.repositoryId)) ||
      result.supportedMainPoints > result.mainPoints ||
      result.usefulTimestamps > result.reviewedTimestamps ||
      (result.usable && (!result.attempted || result.inaccessible)) ||
      (!result.reviewed &&
        (result.supportedMainPoints ||
          result.reviewedTimestamps ||
          result.inventedFileClaims ||
          result.criticalInventedClaims))
    )
      throw Error("Invalid observation mapping or reviewed counts");
  }
  const held = input.clips.filter((c) => c.split === "held_out"),
    heldIds = new Set(held.map((c) => c.id));
  const results = input.results.filter((r) => heldIds.has(r.clipId)),
    reviewed = results.filter((r) => r.reviewed);
  const sum = (
    field:
      | "mainPoints"
      | "supportedMainPoints"
      | "criticalInventedClaims"
      | "inventedFileClaims"
      | "usefulTimestamps"
      | "reviewedTimestamps",
  ) => reviewed.reduce((s, r) => s + r[field], 0);
  const ratio = (numerator: number, denominator: number) => ({
    numerator,
    denominator,
    value: denominator ? numerator / denominator : null,
  });
  let errors = 0,
    referenceWords = 0,
    technicalFound = 0,
    technicalTotal = 0,
    relevant = 0,
    correctRelevant = 0,
    abstentions = 0,
    correctAbstentions = 0;
  for (const result of reviewed) {
    const clip = clips.get(result.clipId)!;
    if (clip.referenceSpeech !== undefined && result.transcript !== undefined) {
      const wer = wordErrors(clip.referenceSpeech, result.transcript);
      errors += wer.errors;
      referenceWords += wer.referenceWords;
      for (const name of clip.technicalNames) {
        technicalTotal++;
        const expectedWords = words(name);
        if (!expectedWords.length)
          throw Error("Invalid technical-name annotation");
        technicalFound += Number(
          ` ${words(result.transcript).join(" ")} `.includes(
            ` ${expectedWords.join(" ")} `,
          ),
        );
      }
    }
    for (const match of result.matches) {
      const expected = clip.expected.find(
        (e) => e.repositoryId === match.repositoryId,
      );
      if (!expected)
        throw Error("Observation has no annotated repository reference");
      if (match.disposition === "relevant") {
        relevant++;
        correctRelevant += Number(expected.disposition === "relevant");
      } else {
        abstentions++;
        correctAbstentions += Number(
          expected.disposition === match.disposition,
        );
      }
    }
  }
  const missingCategories = categories.filter(
    (category) => !held.some((c) => c.categories.includes(category)),
  );
  const coveredRepositories = new Set(
    held.flatMap((clip) => clip.expected.map((match) => match.repositoryId)),
  );
  const missingRepositoryReferences = [...repositories].filter(
    (id) => !coveredRepositories.has(id),
  );
  const complete =
    input.clips.length >= 40 &&
    held.length > 0 &&
    missingCategories.length === 0 &&
    missingRepositoryReferences.length === 0 &&
    held.length === results.length &&
    reviewed.length === held.length &&
    reviewed.every(
      (r) => r.matches.length === clips.get(r.clipId)!.expected.length,
    );
  const costKnown = results.every((r) => r.settledUsdCents !== null);
  return {
    datasetVersion: input.datasetVersion,
    codeCommit: input.codeCommit,
    modelVersion: input.modelVersion,
    promptVersion: input.promptVersion,
    reviewer: input.reviewer,
    observedAt: new Date(now).toISOString(),
    clipCount: input.clips.length,
    heldOutCount: held.length,
    observedHeldOutCount: results.length,
    reviewedHeldOutCount: reviewed.length,
    missingCategories,
    missingRepositoryReferences,
    completeDataset: complete,
    processingCompletion: ratio(
      results.filter((r) => r.usable).length,
      results.filter((r) => r.attempted).length,
    ),
    inaccessible: results.filter((r) => r.inaccessible).length,
    evidenceSupport: ratio(sum("supportedMainPoints"), sum("mainPoints")),
    timestampUsefulness: ratio(
      sum("usefulTimestamps"),
      sum("reviewedTimestamps"),
    ),
    wordErrorRate: ratio(errors, referenceWords),
    technicalNameRecall: ratio(technicalFound, technicalTotal),
    matchPrecision: ratio(correctRelevant, relevant),
    abstentionAccuracy: ratio(correctAbstentions, abstentions),
    inventedFileClaims: sum("inventedFileClaims"),
    criticalInventedClaims: sum("criticalInventedClaims"),
    processedMinutes: results.reduce((s, r) => s + r.processedSeconds, 0) / 60,
    settledUsdCents: costKnown
      ? results.reduce((s, r) => s + r.settledUsdCents!, 0)
      : null,
    unknownCostCount: results.filter((r) => r.settledUsdCents === null).length,
    suggestedQualityTargetMet:
      complete &&
      sum("criticalInventedClaims") === 0 &&
      sum("mainPoints") > 0 &&
      sum("supportedMainPoints") / sum("mainPoints") >= 0.9,
    limitations: input.limitations,
  };
}
