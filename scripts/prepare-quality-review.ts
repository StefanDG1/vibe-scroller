import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, sep, join } from "node:path";
import { createHash } from "node:crypto";
import {
  benchmarkInput,
  evaluateBenchmark,
} from "../packages/evaluation/index.ts";

// This preparation never supplies human judgments or changes retained outputs.
try {
  if (process.argv.length !== 4) throw Error();
  const inputPath = resolve(process.argv[2]);
  const output = resolve(process.argv[3]);
  const privateRoot = resolve("private");
  if (
    !inputPath.startsWith(privateRoot + sep) ||
    !output.startsWith(privateRoot + sep)
  )
    throw Error();
  const bytes = readFileSync(inputPath);
  const input = benchmarkInput.parse(JSON.parse(bytes.toString("utf8")));
  const report = evaluateBenchmark(input);
  const packet = {
    preparedAt: new Date().toISOString(),
    inputSha256: createHash("sha256").update(bytes).digest("hex"),
    datasetVersion: input.datasetVersion,
    codeCommit: input.codeCommit,
    modelVersion: input.modelVersion,
    promptVersion: input.promptVersion,
    repositories: input.repositories,
    rights: input.clips.map((c) => ({ clipId: c.id, ...c.rights })),
    provenance: input.provenance ?? null,
    existingReport: report,
    rubric: "docs/operations/numerical-review.md",
    rows: input.clips.map((c) => ({
      clipId: c.id,
      scenarioId: c.scenarioId ?? null,
      nominalSplit: c.split,
      auditedSplit: null,
      usedForTuning: c.usedForTuning ?? null,
      categories: c.categories,
      referenceSpeech: c.referenceSpeech ?? null,
      technicalNames: c.technicalNames,
      authoredExpectedMatches: c.expected,
      retainedResult: input.results.find((r) => r.clipId === c.id) ?? null,
      human: {
        reviewer: null,
        reviewedAt: null,
        mainPoints: null,
        supportedMainPoints: null,
        supportedInference: null,
        contradictoryPoints: null,
        inventedFileClaims: null,
        criticalInventedClaims: null,
        reviewedTimestamps: null,
        usefulTimestamps: null,
        referenceCorrections: null,
        reviewedMatches: c.expected.map((m) => ({
          repositoryId: m.repositoryId,
          disposition: null,
          rationale: null,
        })),
      },
    })),
  };
  mkdirSync(output, { recursive: true });
  writeFileSync(
    join(output, "review-packet.json"),
    JSON.stringify(packet, null, 2) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      prepared: input.clips.length,
      scoresSupplied: 0,
      privateOnly: true,
      inputSha256: packet.inputSha256,
    }),
  );
} catch {
  console.error(
    "Review preparation failed; use a valid retained input and a fresh directory inside private/. No private data printed.",
  );
  process.exitCode = 1;
}
