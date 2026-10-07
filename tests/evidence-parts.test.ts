import { expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import {
  backupEvidencePart,
  createEvidenceCheckpoint,
  openEvidenceCheckpoint,
  sealEvidenceCheckpoint,
} from "../packages/recovery/evidence-parts.mjs";
import { verifyEvidenceBackup } from "../packages/recovery/evidence-backup.mjs";
import type {
  EvidenceArchive,
  EvidenceFrame,
} from "../packages/recovery/evidence-backup.mjs";
import type { SealedEvidenceCheckpoint } from "../packages/recovery/evidence-parts.mjs";
const data = Buffer.from([255, 216, 255, 224, 1, 2, 3]);
function fixture() {
  const now = Date.now(),
    key = randomBytes(32),
    context = { deployment: "synthetic-recovery", commit: "a".repeat(40) };
  const frame = (n: number): EvidenceFrame => ({
    organizationId: "synthetic",
    sourceId: "synthetic-source",
    generation: 1,
    key: `synthetic/frame-${n}`,
    type: "image/jpeg",
    size: data.length,
    restoreUntil: now + 7 * 86400000,
  });
  const state = createEvidenceCheckpoint({
    ...context,
    asOf: now,
    maximumPartBytes: 14,
  });
  const archives = new Map<number, EvidenceArchive>();
  let persisted: SealedEvidenceCheckpoint = sealEvidenceCheckpoint(
      state,
      key,
      now,
    ),
    reads = 0;
  const callbacks = {
    key,
    maximumPartBytes: 14,
    clock: () => now,
    page: async (cursor: string | null) => ({
      entries: cursor ? [frame(2)] : [frame(0), frame(1)],
      isDone: !!cursor,
      cursor: "next",
    }),
    current: async (e: EvidenceFrame) => e,
    read: async () => {
      reads++;
      return data;
    },
    existing: async (index: number) => archives.get(index) ?? null,
    save: async (index: number, archive: EvidenceArchive) => {
      if (archives.has(index)) {
        expect(
          verifyEvidenceBackup(
            archives.get(index),
            key,
            archive.metadata.evidence,
            now,
          ).sha256,
        ).toBe(archive.metadata.sha256);
      } else archives.set(index, archive);
    },
    checkpoint: async (archive: SealedEvidenceCheckpoint) => {
      persisted = structuredClone(archive);
    },
  };
  return {
    now,
    key,
    context,
    frame,
    state,
    archives,
    callbacks,
    resume: () => openEvidenceCheckpoint(persisted, key, context, now),
    reads: () => reads,
  };
}
it("finishes separate bounded parts without repeating pages or exporting plaintext keys in checkpoints", async () => {
  const f = fixture();
  const first = await backupEvidencePart({ state: f.state, ...f.callbacks });
  expect(first).toMatchObject({
    complete: false,
    part: { bytes: 14, saved: 2 },
    bytes: 14,
  });
  const next = f.resume();
  expect(
    JSON.stringify(sealEvidenceCheckpoint(next, f.key, f.now)),
  ).not.toContain("frame-0");
  const last = await backupEvidencePart({ state: next, ...f.callbacks });
  expect(last).toMatchObject({
    complete: true,
    part: { bytes: 7, saved: 1 },
    saved: 3,
    bytes: 21,
  });
  expect(next.parts.map((p) => p.bytes)).toEqual([14, 7]);
  expect(f.reads()).toBe(3);
  expect(
    await backupEvidencePart({ state: f.resume(), ...f.callbacks }),
  ).toMatchObject({ complete: true, saved: 3 });
  expect(f.reads()).toBe(3);
});
it("resumes a crash after archive write before checkpoint without overwriting or redownloading", async () => {
  const f = fixture();
  let fail = true;
  await expect(
    backupEvidencePart({
      state: f.state,
      ...f.callbacks,
      checkpoint: async (a) => {
        if (f.archives.size === 1 && fail) {
          fail = false;
          throw Error("Synthetic crash");
        }
        await f.callbacks.checkpoint(a);
      },
    }),
  ).rejects.toThrow("Synthetic crash");
  expect(f.archives.size).toBe(1);
  const resumed = await backupEvidencePart({
    state: f.resume(),
    ...f.callbacks,
  });
  expect(resumed.reused).toBe(1);
  expect(f.reads()).toBe(2);
  expect(f.archives.size).toBe(2);
});
it("rejects changed deployment/commit, wrong key, modified checkpoint and expiry without extending retention", () => {
  const f = fixture(),
    sealed = sealEvidenceCheckpoint(f.state, f.key, f.now);
  for (const [key, context, time] of [
    [randomBytes(32), f.context, f.now],
    [f.key, { ...f.context, commit: "b".repeat(40) }, f.now],
    [f.key, { ...f.context, deployment: "foreign" }, f.now],
    [f.key, f.context, f.now + 7 * 86400000],
  ] as const)
    expect(() => openEvidenceCheckpoint(sealed, key, context, time)).toThrow();
  const altered = structuredClone(sealed);
  altered.metadata.asOf++;
  expect(() =>
    openEvidenceCheckpoint(altered, f.key, f.context, f.now),
  ).toThrow();
});
it("rechecks deletion and generation around resumed reads, and rejects altered existing archives", async () => {
  const f = fixture();
  let checks = 0;
  const result = await backupEvidencePart({
    state: f.state,
    ...f.callbacks,
    current: async (e) => (++checks === 2 ? null : e),
  });
  expect(result).toMatchObject({ complete: true, saved: 2, skipped: 1 });
  expect(f.archives.size).toBe(2);
  const g = fixture();
  let crashed = false;
  await expect(
    backupEvidencePart({
      state: g.state,
      ...g.callbacks,
      checkpoint: async (a) => {
        if (g.archives.size === 1 && !crashed) {
          crashed = true;
          throw Error("Synthetic crash");
        }
        await g.callbacks.checkpoint(a);
      },
    }),
  ).rejects.toThrow();
  g.archives.get(0)!.ciphertext = randomBytes(data.length).toString("base64");
  await expect(
    backupEvidencePart({ state: g.resume(), ...g.callbacks }),
  ).rejects.toThrow();
});
it("keeps the existing object/part bounds and rejects repeated page cursors", async () => {
  const f = fixture();
  await expect(
    backupEvidencePart({
      state: f.state,
      ...f.callbacks,
      maximumPartBytes: 200000001,
    }),
  ).rejects.toThrow();
  const g = fixture();
  await expect(
    backupEvidencePart({
      state: g.state,
      ...g.callbacks,
      page: async () => ({ entries: [], isDone: false, cursor: "repeated" }),
    }),
  ).rejects.toThrow();
});
