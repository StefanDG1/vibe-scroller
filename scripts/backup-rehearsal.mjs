import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  unlinkSync,
  statSync,
} from "node:fs";
import { resolve, sep } from "node:path";
import { execFileSync } from "node:child_process";
if (process.env.CONVEX_DEPLOYMENT !== "dev:resolute-ladybug-999")
  throw Error("Dedicated staging backup rehearsal required.");
const root = resolve("outputs/backups");
mkdirSync(root, { recursive: true });
const prefix = `${Date.now()}-${randomUUID()}`;
const original = resolve(root, `${prefix}.temporary.zip`),
  restored = resolve(root, `${prefix}.restored.zip`);
for (const path of [original, restored])
  if (!path.startsWith(root + sep))
    throw Error("Unsafe temporary backup path.");
const call = (args) =>
  execFileSync(process.execPath, ["node_modules/convex/bin/main.js", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 120000,
    maxBuffer: 10000000,
  });
let stage = "prepare_key";
try {
  let key = process.env.BACKUP_ENCRYPTION_KEY;
  if (!key) {
    key = randomBytes(32).toString("base64");
    writeFileSync(
      ".env.local",
      readFileSync(".env.local", "utf8") + `\nBACKUP_ENCRYPTION_KEY="${key}"\n`,
    );
  }
  const bytes = Buffer.from(key, "base64");
  if (bytes.length !== 32) throw Error("Invalid backup key.");
  const seal = (data, purpose) => {
    const metadata = {
      version: 1,
      purpose,
      deployment: "resolute-ladybug-999",
      createdAt: new Date().toISOString(),
      sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      workingTreeDirty:
        execFileSync("git", ["status", "--porcelain"], {
          encoding: "utf8",
        }).trim().length > 0,
    };
    const aad = Buffer.from(JSON.stringify(metadata)),
      iv = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", bytes, iv);
    cipher.setAAD(aad);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return {
      metadata,
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      ciphertext: encrypted.toString("base64"),
    };
  };
  const open = (sealed) => {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      bytes,
      Buffer.from(sealed.iv, "base64"),
    );
    decipher.setAAD(Buffer.from(JSON.stringify(sealed.metadata)));
    decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(sealed.ciphertext, "base64")),
      decipher.final(),
    ]);
  };
  stage = "provider_export";
  call(["export", "--path", original]);
  if (statSync(original).size > 200000000)
    throw Error("Backup exceeds staging rehearsal bound.");
  stage = "seal_and_restore";
  const archive = readFileSync(original),
    sealed = seal(archive, "database-backup");
  const backupFile = resolve(root, `${prefix}.sealed.json`);
  writeFileSync(backupFile, JSON.stringify(sealed));
  const roundTrip = open(JSON.parse(readFileSync(backupFile, "utf8")));
  if (!roundTrip.equals(archive)) throw Error("Backup round-trip differs.");
  let tamperRejected = false;
  try {
    open({
      ...sealed,
      metadata: { ...sealed.metadata, deployment: "foreign" },
    });
  } catch {
    tamperRejected = true;
  }
  if (!tamperRejected) throw Error("Backup authentication failed.");
  writeFileSync(restored, roundTrip);
  stage = "archive_inspection";
  const inspection = JSON.parse(
    execFileSync("python", ["scripts/inspect-backup.py", restored], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30000,
    }),
  );
  stage = "marker_export";
  const markers = [];
  for (const section of ["tombstones", "deletionMarkers"]) {
    let cursor = null;
    do {
      const page = JSON.parse(
        call([
          "run",
          "recovery:markerPage",
          JSON.stringify({ section, cursor }),
        ]),
      );
      markers.push(...page.page);
      cursor = page.isDone ? null : page.continueCursor;
    } while (cursor);
  }
  const markerFile = resolve(root, `${prefix}.markers.sealed.json`);
  writeFileSync(
    markerFile,
    JSON.stringify(
      seal(
        Buffer.from(
          JSON.stringify({
            capturedAt: new Date().toISOString(),
            entries: markers,
          }),
        ),
        "deletion-markers",
      ),
    ),
  );
  const evidence = {
    observedAt: new Date().toISOString(),
    environment: "dedicated staging export and isolated offline ZIP restore",
    labeledStagingContentIncluded: true,
    operatorAccountMetadataIncluded: true,
    encryptedAtRest: true,
    plaintextTemporaryFilesRemoved: false,
    byteRoundTripPassed: true,
    authenticatedMetadataTamperingRejected: true,
    backupSha256: createHash("sha256").update(archive).digest("hex"),
    archiveBytes: archive.length,
    inspection,
    authoritativeMarkerCount: markers.length,
    providerDatabaseImportTested: false,
    limitations: [
      "Actual Convex export, encryption and isolated offline archive restoration only",
      "No production import, R2 object backup or provider retention validation",
      "A new locked deployment must import data, reapply the latest separate markers, quarantine credentials and pass acceptance before serving traffic",
      "Local sealed archives are not a scheduled independently stored production backup; retain at most 30 days",
    ],
  };
  unlinkSync(original);
  unlinkSync(restored);
  evidence.plaintextTemporaryFilesRemoved = true;
  writeFileSync(
    "infra/backup-rehearsal-evidence.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      exportAndOfflineRestorePassed: true,
      databaseImportTested: false,
      records: inspection.records,
      authoritativeMarkerCount: markers.length,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      rehearsalPassed: false,
      stage,
      processExitCode: typeof error?.status === "number" ? error.status : null,
    }),
  );
  process.exitCode = 1;
} finally {
  for (const path of [original, restored]) {
    try {
      unlinkSync(path);
    } catch {}
  }
}
