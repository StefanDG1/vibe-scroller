import { expect, test } from "vitest";
import { mkdtempSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  classifyEvidenceJob,
  evidenceJob,
} from "../scripts/evidence-backup-job.mjs";
import {
  createEvidenceCheckpoint,
  sealEvidenceCheckpoint,
} from "../packages/recovery/evidence-parts.mjs";

const paused = {
  status: 1,
  signal: null,
  stderr: JSON.stringify({
    evidenceBackupPassed: false,
    stage: "checkpoint_paused",
    resumableCheckpointPreserved: true,
  }),
};
test("only the explicit persisted pause can request another bounded job", () => {
  expect(classifyEvidenceJob(paused, { complete: false })).toEqual({
    complete: false,
    needsResume: true,
  });
  expect(
    classifyEvidenceJob(
      { status: 0, signal: null, stderr: "" },
      { complete: true },
    ),
  ).toEqual({ complete: true, needsResume: false });
  for (const result of [
    { ...paused, status: 0 },
    { ...paused, signal: "SIGTERM" },
    { ...paused, stderr: '{"stage":"retained_evidence"}' },
    { ...paused, stderr: "secret error" },
  ])
    expect(() => classifyEvidenceJob(result, { complete: false })).toThrow();
  expect(() => classifyEvidenceJob(paused, { complete: true })).toThrow();
});
test("resume publishes only new sealed files and fails if the final checkpoint is incomplete", () => {
  const root = mkdtempSync(join(tmpdir(), "vibescroll-evidence-job-"));
  const output = join(root, "input"),
    shard = join(root, "delta");
  mkdirSync(output);
  const key = Buffer.alloc(32, 1),
    commit = "a".repeat(40),
    asOf = Date.now() - 1000;
  const state = createEvidenceCheckpoint({
    deployment: "bold-lemur-667",
    commit,
    asOf,
  });
  const checkpoint = `${asOf}.evidence-checkpoint.sealed.json`;
  const save = () =>
    writeFileSync(
      join(output, checkpoint),
      JSON.stringify(sealEvidenceCheckpoint(state, key)),
    );
  state.visited = state.saved = state.partSaved = 1;
  state.bytes = state.partBytes = 3;
  state.keys = ["first"];
  save();
  writeFileSync(
    join(output, `${asOf}.0.evidence.sealed.json`),
    "sealed previous",
  );
  const run = () => {
    state.visited = state.saved = state.partSaved = 2;
    state.bytes = state.partBytes = 6;
    state.keys.push("second");
    writeFileSync(join(output, `${asOf}.1.evidence.sealed.json`), "sealed new");
    save();
    return paused;
  };
  expect(() =>
    evidenceJob({
      output,
      shard,
      key,
      commit,
      resume: String(asOf),
      final: true,
      run,
    }),
  ).toThrow("incomplete");
  expect(readdirSync(shard).sort()).toEqual(
    [`${asOf}.1.evidence.sealed.json`, checkpoint].sort(),
  );
  expect(() =>
    evidenceJob({
      output,
      shard: join(root, "wrong"),
      key: Buffer.alloc(32, 2),
      commit,
      resume: String(asOf),
      run,
    }),
  ).toThrow();
  expect(() =>
    evidenceJob({
      output,
      shard: join(root, "wrong-commit"),
      key,
      commit: "b".repeat(40),
      resume: String(asOf),
      run,
    }),
  ).toThrow();
});
