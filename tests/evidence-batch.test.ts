import { expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import {
  backupEvidenceBatch,
  restoreEvidenceBatch,
  readEvidenceBytes,
} from "../packages/recovery/evidence-batch.mjs";
import type {
  EvidenceArchive,
  EvidenceFrame,
} from "../packages/recovery/evidence-backup.mjs";

const now = 1790916000000;
const data = Buffer.from([255, 216, 255, 224, 1, 2, 3]);
const frame = (index: number): EvidenceFrame => ({
  organizationId: "synthetic-batch",
  sourceId: "synthetic-source",
  generation: 1,
  key: `synthetic-batch/frame-${index}`,
  type: "image/jpeg",
  size: data.length,
  restoreUntil: now + 86400000,
  expiresAt: now + 86400000,
});

it("bounds private object reads and cancels a body that exceeds its authenticated size", async () => {
  const headers = {
    "content-type": "image/jpeg",
    "content-length": String(data.length),
  };
  expect(
    await readEvidenceBytes(new Response(data, { headers }), data.length),
  ).toEqual(data);
  let canceled = false;
  const overflow = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(data.length + 1));
    },
    cancel() {
      canceled = true;
    },
  });
  await expect(
    readEvidenceBytes(new Response(overflow, { headers }), data.length),
  ).rejects.toThrow();
  expect(canceled).toBe(true);
  await expect(
    readEvidenceBytes(
      new Response(data.subarray(0, 2), { headers }),
      data.length,
    ),
  ).rejects.toThrow();
  await expect(
    readEvidenceBytes(
      new Response(data, {
        headers: { ...headers, "content-type": "audio/wav" },
      }),
      data.length,
    ),
  ).rejects.toThrow();
});
const context = (entry: EvidenceFrame) => ({
  locked: true,
  latestMarkersApplied: true,
  organization: { id: entry.organizationId, status: "active" },
  source: {
    id: entry.sourceId,
    organizationId: entry.organizationId,
    generation: 1,
    state: "ready",
  },
  asset: { ...entry, state: "complete" },
  retiredKeys: [],
  deletedSources: [],
  deletedWorkspaces: [],
});

it("backs up paginated evidence and restores verified bytes with fresh eligibility around each external write", async () => {
  const archives: EvidenceArchive[] = [],
    key = randomBytes(32),
    objects = new Map<string, Uint8Array>();
  let pages = 0;
  const backup = await backupEvidenceBatch({
    key,
    now,
    page: async (cursor) => {
      pages++;
      return {
        entries: cursor ? [frame(2)] : [frame(0), frame(1)],
        isDone: !!cursor,
        cursor: "next",
      };
    },
    current: async (e) => e,
    read: async () => data,
    save: async (_i, archive) => {
      archives.push(archive);
    },
  });
  expect(pages).toBe(2);
  expect(backup).toMatchObject({
    saved: 3,
    skipped: 0,
    bytes: 21,
    encrypted: true,
  });
  let reads = 0;
  const restored = await restoreEvidenceBatch({
    key,
    now,
    archives,
    current: async (e) => {
      reads++;
      return context(e);
    },
    put: async (e, bytes) => {
      if (objects.has(e.key)) throw Error("Never overwrite");
      objects.set(e.key, bytes);
    },
    read: async (e) => objects.get(e.key)!,
    remove: async (e) => {
      objects.delete(e.key);
    },
  });
  expect(restored).toEqual({ restored: 3, bytes: 21, hashVerified: true });
  expect(reads).toBe(12);
});

it("skips deletion during backup and removes a write if restoration eligibility changes", async () => {
  const key = randomBytes(32),
    archives: EvidenceArchive[] = [];
  let currentReads = 0;
  const backup = await backupEvidenceBatch({
    key,
    now,
    page: async () => ({ entries: [frame(0), frame(1)], isDone: true }),
    current: async (e) => (++currentReads === 2 ? null : e),
    read: async () => data,
    save: async (_i, archive) => {
      archives.push(archive);
    },
  });
  expect(backup).toMatchObject({ saved: 1, skipped: 1 });
  let written = false,
    checks = 0;
  await expect(
    restoreEvidenceBatch({
      key,
      now,
      archives,
      current: async (e) => ({
        ...context(e),
        deletedSources: ++checks >= 3 ? [e.sourceId] : [],
      }),
      put: async () => {
        written = true;
      },
      read: async () => data,
      remove: async () => {
        written = false;
      },
    }),
  ).rejects.toThrow();
  expect(written).toBe(false);
  await expect(
    backupEvidenceBatch({
      key,
      now,
      page: async () => ({
        entries: [frame(0)],
        isDone: false,
        cursor: "repeated",
      }),
      current: async (e) => e,
      read: async () => data,
      save: async () => {},
    }),
  ).rejects.toThrow();
});
