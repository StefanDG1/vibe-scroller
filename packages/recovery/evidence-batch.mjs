import { createHash } from "node:crypto";
import { sealEvidence, openEvidence } from "./evidence-backup.mjs";

const maximumObjects = 10000;
const maximumBytes = 200000000;
const fail = () => {
  throw new Error(
    "Evidence recovery stopped. Review the private operator report.",
  );
};
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
export async function readEvidenceBytes(response, expectedSize) {
  if (
    !response.ok ||
    !response.body ||
    !Number.isSafeInteger(expectedSize) ||
    expectedSize <= 0 ||
    expectedSize > 1000000 ||
    response.headers.get("content-type")?.split(";")[0] !== "image/jpeg" ||
    Number(response.headers.get("content-length")) !== expectedSize
  )
    fail();
  const reader = response.body.getReader(),
    parts = [];
  let size = 0;
  try {
    let done = false;
    do {
      const part = await reader.read();
      done = part.done;
      if (part.value) {
        size += part.value.byteLength;
        if (size > expectedSize) fail();
        parts.push(part.value);
      }
    } while (!done);
    if (size !== expectedSize) fail();
    return Buffer.concat(parts, size);
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}
const same = (entry, current) =>
  current &&
  [
    "organizationId",
    "sourceId",
    "generation",
    "key",
    "type",
    "size",
    "expiresAt",
  ].every((field) => current[field] === entry[field]);

// Operator callbacks must use authoritative records and private storage, never
// archived records or a caller's user-supplied restoration eligibility.
export async function backupEvidenceBatch({
  page,
  read,
  current,
  save,
  key,
  now = Date.now(),
}) {
  if (!(key instanceof Uint8Array) || key.byteLength !== 32) fail();
  let cursor = null,
    visited = 0,
    saved = 0,
    skipped = 0,
    bytes = 0;
  const cursors = new Set(),
    keys = new Set();
  let done = false;
  do {
    if (cursors.size >= 1000 || (cursor !== null && cursors.has(cursor)))
      fail();
    if (cursor !== null) cursors.add(cursor);
    const next = await page(cursor, now);
    if (
      !Array.isArray(next.entries) ||
      next.entries.length > 25 ||
      typeof next.isDone !== "boolean"
    )
      fail();
    for (const entry of next.entries) {
      if (++visited > maximumObjects || keys.has(entry.key)) fail();
      keys.add(entry.key);
      if (!same(entry, await current(entry))) {
        skipped++;
        continue;
      }
      // Validate bounded metadata before downloading. sealEvidence also checks
      // bytes and magic before any archive is written.
      if (
        entry.type !== "image/jpeg" ||
        !Number.isSafeInteger(entry.size) ||
        entry.size <= 0 ||
        entry.size > 1000000 ||
        bytes + entry.size > maximumBytes
      )
        fail();
      const data = await read(entry);
      if (!(data instanceof Uint8Array) || data.byteLength !== entry.size)
        fail();
      if (!same(entry, await current(entry))) {
        skipped++;
        continue;
      }
      const archive = sealEvidence(
        {
          ...entry,
          restoreUntil: Math.min(
            now + 7 * 86400000,
            entry.expiresAt ?? Infinity,
          ),
        },
        data,
        key,
        now,
      );
      await save(saved, archive);
      bytes += data.byteLength;
      saved++;
    }
    if (next.isDone) {
      done = true;
      break;
    }
    if (
      typeof next.cursor !== "string" ||
      !next.cursor ||
      next.cursor === cursor
    )
      fail();
    cursor = next.cursor;
  } while (!done);
  return { visited, saved, skipped, bytes, encrypted: true };
}

// put must create only in an isolated destination and refuse existing objects.
// remove closes a deletion/generation race after PUT; errors never count as a
// successful recovery. Adapters must not log plaintext or bearer grants.
export async function restoreEvidenceBatch({
  archives,
  current,
  put,
  read,
  remove,
  key,
  now,
}) {
  if (!(key instanceof Uint8Array) || key.byteLength !== 32) fail();
  const time = () => now ?? Date.now();
  let restored = 0,
    bytes = 0;
  const keys = new Set();
  for await (const archive of archives) {
    const entry = archive?.metadata?.evidence;
    if (!entry || keys.has(entry.key) || keys.size >= maximumObjects) fail();
    keys.add(entry.key);
    const data = openEvidence(archive, key, await current(entry), time());
    if (bytes + data.byteLength > maximumBytes) fail();
    // Eligibility is checked again immediately before the external write.
    openEvidence(archive, key, await current(entry), time());
    await put(entry, data);
    try {
      openEvidence(archive, key, await current(entry), time());
      const reread = await read(entry);
      if (
        !(reread instanceof Uint8Array) ||
        reread.byteLength !== data.byteLength ||
        digest(reread) !== archive.metadata.sha256
      )
        fail();
      openEvidence(archive, key, await current(entry), time());
    } catch (error) {
      await remove(entry);
      throw error;
    }
    bytes += data.byteLength;
    restored++;
  }
  return { restored, bytes, hashVerified: true };
}
