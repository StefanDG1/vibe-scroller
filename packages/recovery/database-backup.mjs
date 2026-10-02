import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
const maximumBytes = 200_000_000;
const invalid = () => {
  throw Error("Encrypted database backup is invalid or expired.");
};
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
function validKey(key) {
  if (!(key instanceof Uint8Array) || key.byteLength !== 32) invalid();
  return key;
}
function validate(metadata, now) {
  if (
    !metadata ||
    metadata.version !== 1 ||
    !["database-backup", "deletion-markers"].includes(metadata.purpose) ||
    !/^[a-z0-9-]{3,80}$/.test(metadata.deployment) ||
    !/^[a-f0-9]{40}$/.test(metadata.commit) ||
    !Number.isSafeInteger(metadata.capturedAt) ||
    metadata.capturedAt <= 0 ||
    metadata.capturedAt > now ||
    typeof metadata.workingTreeDirty !== "boolean" ||
    !Number.isSafeInteger(metadata.expiresAt) ||
    metadata.expiresAt <= now ||
    metadata.expiresAt > metadata.capturedAt + 7 * 86400000 ||
    !Number.isSafeInteger(metadata.bytes) ||
    metadata.bytes <= 0 ||
    metadata.bytes > maximumBytes ||
    !/^[a-f0-9]{64}$/.test(metadata.sha256)
  )
    invalid();
}
export function sealDatabase(bytes, info, key, now = Date.now()) {
  if (!(bytes instanceof Uint8Array)) invalid();
  const metadata = {
    version: 1,
    purpose: info.purpose,
    deployment: info.deployment,
    commit: info.commit,
    workingTreeDirty: info.workingTreeDirty ?? false,
    capturedAt: now,
    expiresAt: now + 7 * 86400000,
    bytes: bytes.byteLength,
    sha256: digest(bytes),
  };
  validate(metadata, now);
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", validKey(key), iv);
  cipher.setAAD(Buffer.from(JSON.stringify(metadata)));
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return {
    metadata,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}
export function openDatabase(sealed, context, key, now = Date.now()) {
  validate(sealed?.metadata, now);
  if (
    context.restoreLock !== true ||
    context.sourceDeployment !== sealed.metadata.deployment ||
    typeof context.destinationDeployment !== "string" ||
    !context.destinationDeployment ||
    context.destinationDeployment === context.sourceDeployment ||
    context.purpose !== sealed.metadata.purpose ||
    typeof sealed.ciphertext !== "string" ||
    sealed.ciphertext.length > Math.ceil((maximumBytes * 4) / 3) + 4
  )
    invalid();
  try {
    const iv = Buffer.from(sealed.iv, "base64"),
      tag = Buffer.from(sealed.tag, "base64");
    if (iv.length !== 12 || tag.length !== 16) invalid();
    const decipher = createDecipheriv("aes-256-gcm", validKey(key), iv);
    decipher.setAAD(Buffer.from(JSON.stringify(sealed.metadata)));
    decipher.setAuthTag(tag);
    const bytes = Buffer.concat([
      decipher.update(Buffer.from(sealed.ciphertext, "base64")),
      decipher.final(),
    ]);
    if (
      bytes.length !== sealed.metadata.bytes ||
      digest(bytes) !== sealed.metadata.sha256
    )
      invalid();
    return bytes;
  } catch {
    invalid();
  }
}
