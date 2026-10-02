import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  backupEvidenceBatch,
  readEvidenceBytes,
} from "../packages/recovery/evidence-batch.mjs";

const deployment = "bold-lemur-667";
let stage = "authorization";
try {
  const key = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY ?? "", "base64");
  if (process.env.VIBE_BACKUP_ENABLED !== "true" || key.length !== 32)
    throw Error();
  const inCI = process.env.GITHUB_ACTIONS === "true";
  if (
    inCI
      ? process.env.GITHUB_REPOSITORY !== "StefanDG1/vibe-scroller" ||
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
  const { asOf } = await call("recovery:evidenceCheckpoint", {});
  stage = "retained_evidence";
  const proof = await backupEvidenceBatch({
    key,
    now: asOf,
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
    save: (index, archive) =>
      writeFileSync(
        join(output, `${asOf}.${index}.evidence.sealed.json`),
        JSON.stringify(archive),
        { flag: "wx", mode: 0o600 },
      ),
  });
  console.log(
    JSON.stringify({
      deployment,
      ...proof,
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
      diagnosticsSuppressed: true,
    }),
  );
  process.exitCode = 1;
}
