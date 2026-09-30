import { expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { evaluateBenchmark, wordErrors } from "../packages/evaluation";
const data = {
  datasetVersion: "synthetic-unit-only",
  codeCommit: "a".repeat(40),
  modelVersion: "synthetic",
  promptVersion: "synthetic",
  reviewer: "synthetic",
  repositories: [
    { id: "a", profileVersion: "1" },
    { id: "b", profileVersion: "1" },
  ],
  clips: [
    {
      id: "synthetic",
      split: "held_out",
      rights: {
        reference: "Owned synthetic test",
        permittedRetentionUntil: "2099-01-01T00:00:00.000Z",
        attested: true,
      },
      categories: ["no_fit"],
      expected: [{ repositoryId: "a", disposition: "no_fit" }],
      referenceSpeech: "hello Convex",
      technicalNames: ["Convex"],
    },
  ],
  results: [
    {
      clipId: "synthetic",
      attempted: true,
      usable: true,
      inaccessible: false,
      transcript: "hello convex",
      processedSeconds: 60,
      settledUsdCents: null,
      reviewed: true,
      mainPoints: 1,
      supportedMainPoints: 1,
      inventedFileClaims: 0,
      criticalInventedClaims: 0,
      usefulTimestamps: 0,
      reviewedTimestamps: 0,
      matches: [{ repositoryId: "a", disposition: "no_fit" }],
    },
  ],
  limitations: ["Synthetic unit input, not a real quality benchmark"],
};
it("reports counts and uncertainty without passing an incomplete benchmark", () => {
  const report = evaluateBenchmark(data);
  expect(report.completeDataset).toBe(false);
  expect(report.suggestedQualityTargetMet).toBe(false);
  expect(report.wordErrorRate.value).toBe(0);
  expect(report.matchPrecision.value).toBeNull();
  expect(report.timestampUsefulness.value).toBeNull();
  expect(report.settledUsdCents).toBeNull();
  expect(report.technicalNameRecall.value).toBe(1);
  expect(wordErrors("one two three", "one four three five")).toEqual({
    errors: 2,
    referenceWords: 3,
  });
});
it("rejects replayed observations, expired rights, foreign references and impossible review counts", () => {
  expect(() =>
    evaluateBenchmark({ ...data, results: [...data.results, ...data.results] }),
  ).toThrow();
  expect(() =>
    evaluateBenchmark({
      ...data,
      clips: [
        {
          ...data.clips[0],
          rights: {
            ...data.clips[0].rights,
            permittedRetentionUntil: "2000-01-01T00:00:00.000Z",
          },
        },
      ],
    }),
  ).toThrow();
  expect(() =>
    evaluateBenchmark({
      ...data,
      results: [
        {
          ...data.results[0],
          matches: [{ repositoryId: "foreign", disposition: "relevant" }],
        },
      ],
    }),
  ).toThrow();
  expect(() =>
    evaluateBenchmark({
      ...data,
      results: [{ ...data.results[0], supportedMainPoints: 2 }],
    }),
  ).toThrow();
});
it("runs the actual evaluator command and refuses to overwrite an existing report", () => {
  const path = join(tmpdir(), `vibescroller-synthetic-${randomUUID()}.json`),
    output = `${path}.report.json`;
  try {
    writeFileSync(path, JSON.stringify(data));
    const run = () =>
      spawnSync(
        process.execPath,
        ["scripts/evaluate-benchmark.ts", path, output],
        { encoding: "utf8" },
      );
    expect(run().status).toBe(2);
    expect(JSON.parse(readFileSync(output, "utf8")).completeDataset).toBe(
      false,
    );
    expect(run().status).toBe(1);
  } finally {
    for (const file of [path, output]) if (existsSync(file)) unlinkSync(file);
  }
});
