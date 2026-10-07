import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve, join } from "node:path";
import { isVibeScrollRepository } from "./repository-identity.mjs";
import { readEvidenceBytes } from "../packages/recovery/evidence-batch.mjs";
import { verifyEvidenceBackup } from "../packages/recovery/evidence-backup.mjs";
import {
  backupEvidencePart,
  createEvidenceCheckpoint,
  openEvidenceCheckpoint,
} from "../packages/recovery/evidence-parts.mjs";
import { buildVersion } from "./version.mjs";

const deployment = "bold-lemur-667";
function readArchive(path, maximumBytes = 2000000) {
  if (statSync(path).size > maximumBytes) throw Error();
  return JSON.parse(readFileSync(path, "utf8"));
}
let stage = "authorization";
try {
  const key = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY ?? "", "base64");
  if (process.env.VIBE_BACKUP_ENABLED !== "true" || key.length !== 32)
    throw Error();
  const inCI = process.env.GITHUB_ACTIONS === "true";
  if (
    inCI
      ? !isVibeScrollRepository(
          process.env.GITHUB_REPOSITORY,
          process.env.GITHUB_REPOSITORY_ID,
        ) ||
        process.env.GITHUB_REF !== "refs/heads/main" ||
        !["schedule", "workflow_dispatch"].includes(
          process.env.GITHUB_EVENT_NAME,
        ) ||
        !process.env.CONVEX_DEPLOY_KEY?.startsWith(`prod:${deployment}|`)
      : process.env.VIBE_BACKUP_OPERATOR_CONFIRM !== "production-read-only"
  )
    throw Error();
  if (!process.env.CONVEX_DEPLOY_KEY?.startsWith(`prod:${deployment}|`))
    throw Error();
  const client = new ConvexHttpClient(`https://${deployment}.convex.cloud`, {
    logger: false,
    fetch: (url, options) =>
      fetch(url, {
        ...options,
        redirect: "error",
        signal: AbortSignal.timeout(30000),
      }),
  });
  client.setAdminAuth(process.env.CONVEX_DEPLOY_KEY);
  const call = (name, args) => client.query(makeFunctionReference(name), args);
  stage = "deployment_identity";
  if ((await call("recovery:backupIdentity", {})).deployment !== deployment)
    throw Error();
  const output = resolve("outputs/production-backup");
  mkdirSync(output, { recursive: true, mode: 0o700 });
  const commit = buildVersion().commit;
  const resume = process.env.VIBE_EVIDENCE_RESUME_AS_OF;
  if (resume !== undefined && !/^[1-9][0-9]{12}$/.test(resume)) throw Error();
  const { asOf } = resume
    ? { asOf: Number(resume) }
    : await call("recovery:evidenceCheckpoint", {});
  const checkpointPath = join(
    output,
    `${asOf}.evidence-checkpoint.sealed.json`,
  );
  const state = resume
    ? openEvidenceCheckpoint(readArchive(checkpointPath, 6000000), key, {
        deployment,
        commit,
      })
    : createEvidenceCheckpoint({ deployment, commit, asOf });
  if (!resume && existsSync(checkpointPath)) throw Error();
  const started = Date.now();
  const archivePath = (index) =>
    join(output, `${asOf}.${index}.evidence.sealed.json`);
  const checkpoint = async (archive) => {
    const temporary = join(output, `${asOf}.${randomUUID()}.checkpoint.tmp`);
    try {
      writeFileSync(temporary, JSON.stringify(archive), {
        flag: "wx",
        mode: 0o600,
      });
      renameSync(temporary, checkpointPath);
    } finally {
      if (existsSync(temporary)) unlinkSync(temporary);
    }
    if (Date.now() - started > 20 * 60000) {
      stage = "checkpoint_paused";
      throw Error();
    }
  };
  stage = "retained_evidence";
  const callbacks = {
    key,
    state,
    checkpoint,
    page: (cursor) => call("recovery:evidencePage", { cursor, asOf }),
    current: (entry) =>
      call("recovery:evidenceCurrent", { key: entry.key, asOf }),
    read: async (entry) => {
      const lease = await call("recoveryStorage:evidenceReadLease", {
        key: entry.key,
        asOf,
      });
      if (!lease) throw Error();
      return readEvidenceBytes(
        await fetch(lease.url, {
          redirect: "error",
          signal: AbortSignal.timeout(20000),
        }),
        entry.size,
      );
    },
    existing: async (index) =>
      existsSync(archivePath(index)) ? readArchive(archivePath(index)) : null,
    save: async (index, archive) => {
      const path = archivePath(index);
      if (existsSync(path)) {
        const retained = readArchive(path);
        const proof = verifyEvidenceBackup(
          retained,
          key,
          archive.metadata.evidence,
        );
        if (proof.sha256 !== archive.metadata.sha256) throw Error();
      } else
        writeFileSync(path, JSON.stringify(archive), {
          flag: "wx",
          mode: 0o600,
        });
    },
  };
  let proof;
  do {
    proof = await backupEvidencePart(callbacks);
  } while (!proof.complete);
  for (let i = 0; i < state.saved; i++)
    if (!existsSync(archivePath(i))) throw Error();
  console.log(
    JSON.stringify({
      deployment,
      asOf,
      complete: state.complete,
      saved: state.saved,
      skipped: state.skipped,
      bytes: state.bytes,
      parts: state.parts.map((p) => ({
        index: p.index,
        saved: p.saved,
        bytes: p.bytes,
      })),
      encrypted: true,
      temporaryMediaIncluded: false,
      storageCredentialsExported: false,
      maximumRetentionDays: 7,
    }),
  );
} catch {
  console.error(
    JSON.stringify({
      evidenceBackupPassed: false,
      stage,
      resumableCheckpointPreserved: stage === "checkpoint_paused",
      diagnosticsSuppressed: true,
    }),
  );
  process.exitCode = 1;
}
