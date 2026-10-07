import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { sealEvidence, verifyEvidenceBackup } from "./evidence-backup.mjs";

const maxObjects = 10000,
  maxPages = 1000,
  maxPartBytes = 200000000;
const fail = () => {
  throw Error("Evidence checkpoint unavailable, invalid or expired.");
};
function valid(state, now) {
  if (
    !state ||
    state.version !== 1 ||
    !/^[a-z0-9-]{3,80}$/.test(state.deployment) ||
    !/^[a-f0-9]{40}$/.test(state.commit) ||
    !Number.isSafeInteger(state.asOf) ||
    state.asOf <= 0 ||
    state.asOf > now ||
    state.asOf + 7 * 86400000 <= now ||
    ![
      state.visited,
      state.saved,
      state.skipped,
      state.bytes,
      state.part,
      state.partBytes,
      state.partSaved,
    ].every((n) => Number.isSafeInteger(n) && n >= 0) ||
    state.visited > maxObjects ||
    state.saved + state.skipped !== state.visited ||
    state.part > 50 ||
    !Number.isSafeInteger(state.maximumPartBytes) ||
    state.maximumPartBytes < 1 ||
    state.maximumPartBytes > maxPartBytes ||
    state.partBytes > state.maximumPartBytes ||
    !Array.isArray(state.pending) ||
    state.pending.length > 25 ||
    !Array.isArray(state.keys) ||
    state.keys.length !== state.visited ||
    new Set(state.keys).size !== state.keys.length ||
    !Array.isArray(state.cursors) ||
    state.cursors.length > maxPages ||
    new Set(state.cursors).size !== state.cursors.length ||
    !Array.isArray(state.parts) ||
    state.parts.length !== state.part ||
    !state.parts.every(
      (p, index) =>
        p.index === index &&
        Number.isSafeInteger(p.bytes) &&
        p.bytes >= 0 &&
        p.bytes <= state.maximumPartBytes &&
        Number.isSafeInteger(p.saved) &&
        p.saved >= 0,
    ) ||
    state.parts.reduce((n, p) => n + p.bytes, 0) + state.partBytes !==
      state.bytes ||
    state.parts.reduce((n, p) => n + p.saved, 0) + state.partSaved !==
      state.saved ||
    typeof state.pageDone !== "boolean" ||
    typeof state.complete !== "boolean" ||
    ![state.cursor, state.nextCursor].every(
      (c) =>
        c === null ||
        (typeof c === "string" && c.length > 0 && c.length <= 16000),
    )
  )
    fail();
  return state;
}
function checkedKey(key) {
  if (!(key instanceof Uint8Array) || key.byteLength !== 32) fail();
  return key;
}
export function createEvidenceCheckpoint({
  deployment,
  commit,
  asOf = Date.now(),
  maximumPartBytes = 190000000,
}) {
  return valid(
    {
      version: 1,
      deployment,
      commit,
      asOf,
      maximumPartBytes,
      cursor: null,
      nextCursor: null,
      pageDone: false,
      pending: [],
      keys: [],
      cursors: [],
      parts: [],
      visited: 0,
      saved: 0,
      skipped: 0,
      bytes: 0,
      part: 0,
      partBytes: 0,
      partSaved: 0,
      complete: false,
    },
    Date.now(),
  );
}
export function sealEvidenceCheckpoint(state, key, now = Date.now()) {
  valid(state, now);
  const bytes = Buffer.from(JSON.stringify(state));
  if (bytes.length > 4000000) fail();
  const metadata = {
    version: 1,
    purpose: "evidence-checkpoint",
    deployment: state.deployment,
    commit: state.commit,
    asOf: state.asOf,
  };
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", checkedKey(key), iv);
  cipher.setAAD(Buffer.from(JSON.stringify(metadata)));
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return {
    metadata,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}
export function openEvidenceCheckpoint(
  archive,
  key,
  { deployment, commit },
  now = Date.now(),
) {
  if (
    archive?.metadata?.version !== 1 ||
    archive.metadata.purpose !== "evidence-checkpoint" ||
    archive.metadata.deployment !== deployment ||
    archive.metadata.commit !== commit ||
    typeof archive.ciphertext !== "string" ||
    archive.ciphertext.length > 5400000 ||
    typeof archive.iv !== "string" ||
    Buffer.from(archive.iv, "base64").length !== 12 ||
    typeof archive.tag !== "string" ||
    Buffer.from(archive.tag, "base64").length !== 16
  )
    fail();
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      checkedKey(key),
      Buffer.from(archive.iv, "base64"),
    );
    decipher.setAAD(Buffer.from(JSON.stringify(archive.metadata)));
    decipher.setAuthTag(Buffer.from(archive.tag, "base64"));
    const state = JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(archive.ciphertext, "base64")),
        decipher.final(),
      ]).toString("utf8"),
    );
    if (
      state.deployment !== deployment ||
      state.commit !== commit ||
      state.asOf !== archive.metadata.asOf
    )
      fail();
    return valid(state, now);
  } catch {
    fail();
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
    "restoreUntil",
  ].every((f) => entry[f] === current[f]);
// One call finishes at most one bounded part. Persist each step atomically in
// private encrypted storage; existing archives are authenticated before reuse.
export async function backupEvidencePart({
  state,
  key,
  page,
  current,
  read,
  save,
  existing,
  checkpoint,
  maximumPartBytes = state.maximumPartBytes,
  clock = Date.now,
}) {
  valid(state, clock());
  checkedKey(key);
  if (
    !Number.isSafeInteger(maximumPartBytes) ||
    maximumPartBytes < 1 ||
    maximumPartBytes > maxPartBytes ||
    maximumPartBytes !== state.maximumPartBytes ||
    state.partBytes > maximumPartBytes
  )
    fail();
  let reused = 0;
  const persist = () => checkpoint(sealEvidenceCheckpoint(state, key, clock()));
  const finish = (complete) => {
    if (state.part >= 50) fail();
    const part = {
      index: state.part,
      saved: state.partSaved,
      bytes: state.partBytes,
      firstArchive: state.saved - state.partSaved,
      lastArchive: state.saved - 1,
    };
    state.parts.push(part);
    state.part++;
    state.partBytes = 0;
    state.partSaved = 0;
    state.complete = complete;
    return part;
  };
  if (state.complete)
    return {
      complete: true,
      reused,
      parts: state.parts.length,
      saved: state.saved,
      skipped: state.skipped,
      bytes: state.bytes,
    };
  if (state.part >= 50) fail();
  while (true) {
    if (!state.pending.length) {
      if (state.pageDone) {
        const part = finish(true);
        await persist();
        return {
          complete: true,
          part,
          reused,
          saved: state.saved,
          skipped: state.skipped,
          bytes: state.bytes,
        };
      }
      if (
        state.cursors.length >= maxPages ||
        (state.cursor !== null && state.cursors.includes(state.cursor))
      )
        fail();
      if (state.cursor !== null) state.cursors.push(state.cursor);
      const next = await page(state.cursor, state.asOf);
      if (
        !Array.isArray(next.entries) ||
        next.entries.length > 25 ||
        typeof next.isDone !== "boolean" ||
        (!next.isDone &&
          (typeof next.cursor !== "string" ||
            !next.cursor ||
            next.cursor === state.cursor))
      )
        fail();
      state.pending = next.entries.map((e) => ({
        organizationId: e.organizationId,
        sourceId: e.sourceId,
        generation: e.generation,
        key: e.key,
        type: e.type,
        size: e.size,
        restoreUntil: e.restoreUntil,
        ...(e.expiresAt === undefined ? {} : { expiresAt: e.expiresAt }),
      }));
      state.pageDone = next.isDone;
      state.nextCursor = next.isDone ? null : next.cursor;
      state.cursor = state.nextCursor;
      await persist();
      if (!state.pending.length) continue;
    }
    const entry = state.pending[0];
    if (
      state.visited >= maxObjects ||
      !entry ||
      typeof entry.key !== "string" ||
      entry.key.length > 256 ||
      state.keys.includes(entry.key)
    )
      fail();
    if (
      entry.type !== "image/jpeg" ||
      !Number.isSafeInteger(entry.size) ||
      entry.size <= 0 ||
      entry.size > 1000000 ||
      entry.size > maximumPartBytes
    )
      fail();
    if (state.partBytes + entry.size > maximumPartBytes) {
      const part = finish(false);
      await persist();
      return {
        complete: false,
        part,
        reused,
        saved: state.saved,
        skipped: state.skipped,
        bytes: state.bytes,
      };
    }
    let archive;
    if (same(entry, await current(entry))) {
      archive = await existing(state.saved, entry);
      if (archive) {
        verifyEvidenceBackup(archive, key, entry, clock());
        reused++;
      } else {
        const data = await read(entry);
        if (!(data instanceof Uint8Array) || data.byteLength !== entry.size)
          fail();
        archive = sealEvidence(
          {
            ...entry,
            restoreUntil: Math.min(
              state.asOf + 7 * 86400000,
              entry.expiresAt ?? Infinity,
            ),
          },
          data,
          key,
          state.asOf,
        );
      }
      if (!same(entry, await current(entry))) archive = undefined;
    }
    if (archive) {
      await save(state.saved, archive);
      state.saved++;
      state.partSaved++;
      state.partBytes += entry.size;
      state.bytes += entry.size;
    } else state.skipped++;
    state.visited++;
    state.keys.push(entry.key);
    state.pending.shift();
    await persist();
  }
}
