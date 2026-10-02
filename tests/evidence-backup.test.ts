import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import {
  openEvidence,
  sealEvidence,
} from "../packages/recovery/evidence-backup.mjs";

const now = 1790916000000;
const frame = Buffer.from([255, 216, 255, 224, 1, 2, 3]);
const e = {
  organizationId: "synthetic-workspace",
  sourceId: "synthetic-source",
  generation: 3,
  key: "synthetic-workspace/synthetic-frame",
  type: "image/jpeg",
  size: frame.length,
  expiresAt: now + 100000,
  restoreUntil: now + 100000,
};
const current = {
  locked: true,
  latestMarkersApplied: true,
  organization: { id: e.organizationId, status: "active" },
  source: {
    id: e.sourceId,
    organizationId: e.organizationId,
    generation: e.generation,
    state: "ready",
  },
  asset: { ...e, state: "complete" },
  retiredKeys: [],
  deletedSources: [],
  deletedWorkspaces: [],
};
describe("private evidence recovery", () => {
  it("decrypts only the exact surviving evidence in a locked recovery", () => {
    const key = randomBytes(32),
      archive = sealEvidence(e, frame, key, now);
    expect(openEvidence(archive, key, current, now)).toEqual(frame);
    expect(JSON.stringify(archive)).not.toContain(frame.toString("base64"));
    expect(() =>
      openEvidence(archive, randomBytes(32), current, now),
    ).toThrow();
    const tampered = structuredClone(archive);
    tampered.metadata.evidence.organizationId = "foreign";
    expect(() => openEvidence(tampered, key, current, now)).toThrow();
    const corrupted = structuredClone(archive);
    corrupted.ciphertext = randomBytes(frame.length).toString("base64");
    expect(() => openEvidence(corrupted, key, current, now)).toThrow();
  });
  it("never restores deletion, expired, foreign or superseded evidence", () => {
    const key = randomBytes(32),
      archive = sealEvidence(e, frame, key, now);
    for (const change of [
      { locked: false },
      { latestMarkersApplied: false },
      { source: { ...current.source, state: "deleted" } },
      { source: { ...current.source, generation: 4 } },
      { source: { ...current.source, organizationId: "foreign" } },
      { organization: { ...current.organization, status: "deleting" } },
      { retiredKeys: [e.key] },
      { deletedSources: [e.sourceId] },
      { deletedWorkspaces: [e.organizationId] },
      { asset: { ...current.asset, state: "deleted" } },
      { retiredKeys: undefined },
    ])
      expect(() =>
        openEvidence(archive, key, { ...current, ...change }, now),
      ).toThrow();
    expect(() =>
      openEvidence(archive, key, current, e.expiresAt + 1),
    ).toThrow();
    expect(() =>
      sealEvidence({ ...e, size: 1000001 }, frame, key, now),
    ).toThrow();
    expect(() =>
      sealEvidence(
        { ...e, key: e.organizationId + "/../secret" },
        frame,
        key,
        now,
      ),
    ).toThrow();
  });
});
