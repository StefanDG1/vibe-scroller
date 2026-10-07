import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  linkSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openEvidenceCheckpoint } from "../packages/recovery/evidence-parts.mjs";
import { buildVersion } from "./version.mjs";

export function classifyEvidenceJob(result, state) {
  if (result.status === 0 && !result.signal && state.complete)
    return { complete: true, needsResume: false };
  const lines = result.stderr.trim().split("\n");
  let report;
  try {
    report = JSON.parse(lines.at(-1));
  } catch {
    throw Error("Backup failed.");
  }
  if (
    result.status !== 1 ||
    result.signal ||
    state.complete ||
    report.evidenceBackupPassed !== false ||
    report.stage !== "checkpoint_paused" ||
    report.resumableCheckpointPreserved !== true
  )
    throw Error("Backup failed.");
  return { complete: false, needsResume: true };
}
export function evidenceJob({
  output,
  shard,
  key,
  commit,
  resume,
  final = false,
  run,
}) {
  const checkpoints = () =>
    readdirSync(output).filter((n) =>
      /^[1-9][0-9]{12}\.evidence-checkpoint\.sealed\.json$/.test(n),
    );
  const read = (name) => {
    const path = join(output, name);
    if (statSync(path).size > 6000000) throw Error("Invalid checkpoint.");
    return openEvidenceCheckpoint(JSON.parse(readFileSync(path, "utf8")), key, {
      deployment: "bold-lemur-667",
      commit,
    });
  };
  mkdirSync(output, { recursive: true, mode: 0o700 });
  let before = 0;
  if (resume) {
    if (!/^[1-9][0-9]{12}$/.test(resume)) throw Error("Invalid resume.");
    before = read(`${resume}.evidence-checkpoint.sealed.json`).saved;
  } else if (checkpoints().length) throw Error("Unexpected checkpoint.");
  const result = run();
  const names = checkpoints();
  if (names.length !== 1) throw Error("Checkpoint unavailable.");
  const name = names[0],
    state = read(name);
  if ((resume && state.asOf !== Number(resume)) || state.saved < before)
    throw Error("Invalid checkpoint.");
  const disposition = classifyEvidenceJob(result, state);
  mkdirSync(shard, { recursive: true, mode: 0o700 });
  for (let i = 0; i < state.saved; i++) {
    const archive = `${state.asOf}.${i}.evidence.sealed.json`;
    if (!existsSync(join(output, archive)))
      throw Error("Missing retained archive.");
    if (i >= before) linkSync(join(output, archive), join(shard, archive));
  }
  linkSync(join(output, name), join(shard, name));
  if (final && disposition.needsResume)
    throw Error("Backup remains incomplete; sealed checkpoint preserved.");
  return {
    ...disposition,
    asOf: state.asOf,
    saved: state.saved,
    bytes: state.bytes,
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    if (process.env.GITHUB_ACTIONS !== "true") throw Error();
    const result = evidenceJob({
      output: resolve("outputs/production-backup"),
      shard: resolve("outputs/evidence-job"),
      key: Buffer.from(process.env.BACKUP_ENCRYPTION_KEY ?? "", "base64"),
      commit: buildVersion().commit,
      resume: process.env.VIBE_EVIDENCE_RESUME_AS_OF,
      final: process.env.VIBE_EVIDENCE_FINAL_JOB === "true",
      run: () =>
        spawnSync(
          process.execPath,
          ["scripts/production-evidence-backup.mjs"],
          { encoding: "utf8", maxBuffer: 1000000 },
        ),
    });
    if (process.env.GITHUB_OUTPUT)
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `as_of=${result.asOf}\nneeds_resume=${result.needsResume}\n`,
      );
    console.log(JSON.stringify(result));
  } catch {
    console.error(
      JSON.stringify({ evidenceJobPassed: false, diagnosticsSuppressed: true }),
    );
    process.exitCode = 1;
  }
}
