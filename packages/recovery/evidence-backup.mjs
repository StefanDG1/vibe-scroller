import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const maximumBytes = 1000000;
const hash = (data) => createHash("sha256").update(data).digest("hex");
const reject = () => {
  throw new Error(
    "Private evidence backup is invalid or no longer restorable.",
  );
};
function validateEvidence(e) {
  if (
    !e ||
    typeof e.organizationId !== "string" ||
    !e.organizationId ||
    typeof e.sourceId !== "string" ||
    !e.sourceId ||
    !Number.isSafeInteger(e.generation) ||
    e.generation < 0 ||
    typeof e.key !== "string" ||
    !e.key.startsWith(e.organizationId + "/") ||
    e.key.split("/").length !== 2 ||
    e.key.includes("\\") ||
    e.key.split("/").includes("..") ||
    e.type !== "image/jpeg" ||
    !Number.isSafeInteger(e.size) ||
    e.size <= 0 ||
    e.size > maximumBytes ||
    !Number.isSafeInteger(e.restoreUntil) ||
    e.restoreUntil <= 0 ||
    (e.expiresAt !== undefined &&
      (!Number.isSafeInteger(e.expiresAt) || e.expiresAt <= 0))
  )
    reject();
}
function checkedKey(key) {
  if (!(key instanceof Uint8Array) || key.byteLength !== 32) reject();
  return key;
}

// Operator-side utility only. Runtime provider credentials never enter an archive.
export function sealEvidence(evidence, bytes, backupKey, now = Date.now()) {
  validateEvidence(evidence);
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.byteLength !== evidence.size ||
    bytes[0] !== 255 ||
    bytes[1] !== 216 ||
    evidence.restoreUntil <= now ||
    evidence.restoreUntil > now + 7 * 86400000 ||
    (evidence.expiresAt !== undefined && evidence.expiresAt <= now)
  )
    reject();
  const metadata = {
    version: 1,
    purpose: "private-evidence-frame",
    capturedAt: now,
    evidence: {
      organizationId: evidence.organizationId,
      sourceId: evidence.sourceId,
      generation: evidence.generation,
      key: evidence.key,
      type: evidence.type,
      size: evidence.size,
      restoreUntil: evidence.restoreUntil,
      ...(evidence.expiresAt === undefined
        ? {}
        : { expiresAt: evidence.expiresAt }),
    },
    sha256: hash(bytes),
  };
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", checkedKey(backupKey), iv);
  cipher.setAAD(Buffer.from(JSON.stringify(metadata)));
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return {
    metadata,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

// These latest records must come from the locked recovery deployment and current
// authoritative deletion manifest, never from the archive's own older snapshot.
function checkedArchive(archive, now) {
  if (
    !archive?.metadata ||
    archive.metadata.version !== 1 ||
    archive.metadata.purpose !== "private-evidence-frame" ||
    !Number.isSafeInteger(archive.metadata.capturedAt) ||
    archive.metadata.capturedAt > now ||
    !/^[a-f0-9]{64}$/.test(archive.metadata.sha256 ?? "") ||
    typeof archive.ciphertext !== "string" ||
    archive.ciphertext.length > Math.ceil(maximumBytes / 3) * 4 ||
    typeof archive.iv !== "string" ||
    Buffer.from(archive.iv, "base64").length !== 12 ||
    typeof archive.tag !== "string" ||
    Buffer.from(archive.tag, "base64").length !== 16
  )
    reject();
  const e = archive.metadata.evidence;
  validateEvidence(e);
  if (
    e.restoreUntil <= now ||
    e.restoreUntil > archive.metadata.capturedAt + 7 * 86400000 ||
    (e.expiresAt !== undefined && e.expiresAt <= now)
  )
    reject();
  return e;
}

// Backup resumption verifies a surviving archive against a freshly authorized
// read-only inventory entry. This proof grants no restoration or object writes.
export function verifyEvidenceBackup(
  archive,
  backupKey,
  current,
  now = Date.now(),
) {
  const e = checkedArchive(archive, now);
  if (
    !current ||
    ![
      "organizationId",
      "sourceId",
      "generation",
      "key",
      "type",
      "size",
      "expiresAt",
      "restoreUntil",
    ].every((field) => current[field] === e[field])
  )
    reject();
  decryptArchive(archive, backupKey, e);
  return { sha256: archive.metadata.sha256, size: e.size };
}

export function openEvidence(archive, backupKey, current, now = Date.now()) {
  const e = checkedArchive(archive, now);
  if (
    !current?.locked ||
    !current.latestMarkersApplied ||
    current.organization?.id !== e.organizationId ||
    current.organization?.status !== "active" ||
    current.source?.id !== e.sourceId ||
    current.source?.organizationId !== e.organizationId ||
    current.source?.generation !== e.generation ||
    current.source?.state === "deleted" ||
    current.asset?.key !== e.key ||
    current.asset?.sourceId !== e.sourceId ||
    current.asset?.organizationId !== e.organizationId ||
    current.asset?.state !== "complete" ||
    current.asset?.type !== e.type ||
    current.asset?.size !== e.size ||
    current.asset?.expiresAt !== e.expiresAt ||
    e.restoreUntil <= now ||
    e.restoreUntil > archive.metadata.capturedAt + 7 * 86400000 ||
    (e.expiresAt !== undefined && e.expiresAt <= now) ||
    !Array.isArray(current.retiredKeys) ||
    current.retiredKeys.includes(e.key) ||
    !Array.isArray(current.deletedSources) ||
    current.deletedSources.includes(e.sourceId) ||
    !Array.isArray(current.deletedWorkspaces) ||
    current.deletedWorkspaces.includes(e.organizationId)
  )
    reject();
  return decryptArchive(archive, backupKey, e);
}

function decryptArchive(archive, backupKey, e) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    checkedKey(backupKey),
    Buffer.from(archive.iv, "base64"),
  );
  decipher.setAAD(Buffer.from(JSON.stringify(archive.metadata)));
  decipher.setAuthTag(Buffer.from(archive.tag, "base64"));
  let bytes;
  try {
    bytes = Buffer.concat([
      decipher.update(Buffer.from(archive.ciphertext, "base64")),
      decipher.final(),
    ]);
  } catch {
    reject();
  }
  if (bytes.length !== e.size || hash(bytes) !== archive.metadata.sha256)
    reject();
  return bytes;
}
