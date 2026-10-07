import { execFileSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  realpathSync,
} from "node:fs";
import { join, resolve, basename, sep } from "node:path";
import { tmpdir } from "node:os";
import { sealDatabase } from "../packages/recovery/database-backup.mjs";
import { isVibeScrollRepository } from "./repository-identity.mjs";
const deployment = "bold-lemur-667";
let temporary,
  stage = "authorization";
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
  const output = resolve("outputs/production-backup");
  mkdirSync(output, { recursive: true, mode: 0o700 });
  temporary = mkdtempSync(join(tmpdir(), "vibescroller-backup-"));
  const cli = (args) =>
    execFileSync(
      process.execPath,
      ["node_modules/convex/bin/main.js", ...args],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 180000,
        maxBuffer: 5_000_000,
      },
    );
  if (
    process.env.CONVEX_DEPLOY_KEY &&
    !process.env.CONVEX_DEPLOY_KEY.startsWith(`prod:${deployment}|`)
  )
    throw Error();
  const target = process.env.CONVEX_DEPLOY_KEY ? [] : ["--prod"];
  stage = "deployment_identity";
  const identity = JSON.parse(
    cli([
      "run",
      "recovery:backupIdentity",
      "{}",
      "--typecheck",
      "disable",
      ...target,
    ]),
  );
  if (identity.deployment !== deployment) throw Error();
  const commit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const workingTreeDirty =
    execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()
      .length > 0;
  const stamp = Date.now(),
    zip = join(temporary, "database.zip");
  stage = "export";
  cli(["export", "--path", zip, ...target]);
  if (statSync(zip).size > 200_000_000) throw Error();
  const bytes = readFileSync(zip);
  const archive = sealDatabase(
    bytes,
    { deployment, commit, workingTreeDirty, purpose: "database-backup" },
    key,
  );
  writeFileSync(
    join(output, `${stamp}.database.sealed.json`),
    JSON.stringify(archive),
    { flag: "wx", mode: 0o600 },
  );
  stage = "latest_markers";
  const entries = [];
  for (const section of ["tombstones", "deletionMarkers"]) {
    let cursor = null,
      pages = 0;
    do {
      if (++pages > 10000) throw Error();
      const page = JSON.parse(
        cli([
          "run",
          "recovery:markerPage",
          JSON.stringify({ section, cursor }),
          "--typecheck",
          "disable",
          ...target,
        ]),
      );
      entries.push(...page.page);
      cursor = page.isDone ? null : page.continueCursor;
    } while (cursor);
  }
  const markers = sealDatabase(
    Buffer.from(JSON.stringify({ capturedAt: Date.now(), entries })),
    { deployment, commit, workingTreeDirty, purpose: "deletion-markers" },
    key,
  );
  writeFileSync(
    join(output, `${stamp}.markers.sealed.json`),
    JSON.stringify(markers),
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      deployment,
      commit,
      encrypted: true,
      bytes: bytes.length,
      markerCount: entries.length,
      expiresAt: archive.metadata.expiresAt,
      runtimeEnvironmentIncluded: false,
      encryptedDatabaseCredentialsMayBeIncluded: true,
      objectBytesIncluded: false,
    }),
  );
} catch {
  console.error(
    JSON.stringify({ backupPassed: false, stage, diagnosticsSuppressed: true }),
  );
  process.exitCode = 1;
} finally {
  if (temporary) {
    const actual = realpathSync(temporary),
      parent = realpathSync(tmpdir());
    if (
      actual === resolve(temporary) &&
      actual.startsWith(parent + sep) &&
      basename(actual).startsWith("vibescroller-backup-")
    )
      rmSync(actual, { recursive: true, force: true });
    else {
      console.error("Temporary backup cleanup requires operator inspection.");
      process.exitCode = 1;
    }
  }
}
