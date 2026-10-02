import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { toolSnapshot } from "../packages/policy/tool-snapshots";
import { signSandboxRequest } from "../packages/policy/sandbox-broker";
const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => vi.unstubAllEnvs());
it("refuses expired, expiring and unsafe tool images instead of silently selecting an unverified fallback", () => {
  const now = Date.now();
  for (const value of [
    null,
    {},
    { snapshotId: "../arbitrary", expiresAt: now + 86400000 },
    { snapshotId: "snap_synthetic123", expiresAt: now + 20000 },
  ])
    expect(() => toolSnapshot(value, now)).toThrow("SETUP_REQUIRED");
  expect(
    toolSnapshot(
      { snapshotId: "snap_synthetic123", expiresAt: now + 86400000 },
      now,
    ).snapshotId,
  ).toBe("snap_synthetic123");
});
it("leases one scoped clean renewal, requires teardown and preserves the prior image on failure or stale promotion", async () => {
  const t = convexTest(schema, modules),
    now = Date.now(),
    secret = "01".repeat(32);
  for (const [key, value] of Object.entries({
    VERCEL_SANDBOX_PROJECT_ID: "prj_synthetic",
    VERCEL_SANDBOX_TEAM_ID: "team_synthetic",
    VERCEL_MEDIA_SNAPSHOT: "snap_synthetic123",
    SANDBOX_SNAPSHOT_RENEWAL_ENABLED: "true",
    SANDBOX_BRIDGE_ENABLED: "true",
    SANDBOX_BRIDGE_SECRET: secret,
  }))
    vi.stubEnv(key, value);
  const seed = {
    kind: "media" as const,
    snapshotId: "snap_synthetic123",
    expiresAt: now + 86400000,
    projectId: "prj_synthetic",
    teamId: "team_synthetic",
  };
  await expect(
    t.mutation(internal.sandboxSnapshots.seed, {
      ...seed,
      projectId: "prj_foreign",
    }),
  ).rejects.toThrow("POLICY_BLOCKED");
  await expect(
    t.mutation(internal.sandboxSnapshots.seed, {
      ...seed,
      snapshotId: "snap_unverified123",
    }),
  ).rejects.toThrow("POLICY_BLOCKED");
  await t.mutation(internal.sandboxSnapshots.seed, seed);
  const leases = await Promise.all(
    ["ab".repeat(16), "cd".repeat(16)].map((lease) =>
      t.mutation(internal.sandboxSnapshots.claim, {
        kind: "media",
        lease,
        force: false,
      }),
    ),
  );
  expect(leases.filter(Boolean)).toHaveLength(1);
  const active = await t.query(internal.sandboxSnapshots.current, {
    kind: "media",
  });
  const next = {
    kind: "media" as const,
    lease: active!.lease!,
    parentSnapshotId: seed.snapshotId,
    snapshotId: "snap_newsynthetic123",
    expiresAt: now + 7 * 86400000,
    computeSeconds: 30,
    teardownConfirmed: true,
  };
  await expect(
    t.mutation(internal.sandboxSnapshots.promote, {
      ...next,
      teardownConfirmed: false,
    }),
  ).rejects.toThrow("POLICY_BLOCKED");
  await expect(
    t.mutation(internal.sandboxSnapshots.promote, {
      ...next,
      lease: "ff".repeat(16),
    }),
  ).rejects.toThrow("APPROVAL_STALE");
  expect(
    (await t.query(internal.sandboxSnapshots.current, { kind: "media" }))!
      .snapshotId,
  ).toBe(seed.snapshotId);
  await t.mutation(internal.sandboxSnapshots.promote, next);
  await t.mutation(internal.sandboxSnapshots.promote, next);
  expect(
    (await t.query(internal.sandboxSnapshots.current, { kind: "media" }))!
      .snapshotId,
  ).toBe(next.snapshotId);
  await expect(
    t.mutation(internal.sandboxSnapshots.promote, {
      ...next,
      snapshotId: "snap_differentsynthetic123",
    }),
  ).rejects.toThrow("APPROVAL_STALE");
  expect(
    await t.mutation(internal.sandboxSnapshots.claim, {
      kind: "media",
      lease: "ef".repeat(16),
      force: false,
    }),
  ).toBeNull();
  const body = JSON.stringify({
    purpose: "vibescroller-sandbox-credentials",
    at: Date.now(),
    nonce: "11".repeat(16),
  });
  expect(
    await t.mutation(api.sandboxBroker.consume, {
      body,
      signature: await signSandboxRequest(body, secret),
    }),
  ).toMatchObject({
    snapshots: {
      media: { snapshotId: next.snapshotId, expiresAt: next.expiresAt },
    },
  });
  vi.stubEnv("VERCEL_SANDBOX_PROJECT_ID", "prj_foreign");
  const foreign = JSON.stringify({
    purpose: "vibescroller-sandbox-credentials",
    at: Date.now(),
    nonce: "22".repeat(16),
  });
  expect(
    await t.mutation(api.sandboxBroker.consume, {
      body: foreign,
      signature: await signSandboxRequest(foreign, secret),
    }),
  ).toBe(false);
  vi.stubEnv("VERCEL_SANDBOX_PROJECT_ID", "prj_synthetic");
  const forcedLease = "ef".repeat(16);
  expect(
    await t.mutation(internal.sandboxSnapshots.claim, {
      kind: "media",
      lease: forcedLease,
      force: true,
    }),
  ).not.toBeNull();
  await t.mutation(internal.sandboxSnapshots.failed, {
    kind: "media",
    lease: forcedLease,
  });
  expect(
    (await t.query(internal.sandboxSnapshots.current, { kind: "media" }))!
      .snapshotId,
  ).toBe(next.snapshotId);
  expect(
    await t.mutation(internal.sandboxSnapshots.claim, {
      kind: "media",
      lease: "ff".repeat(16),
      force: true,
    }),
  ).toBeNull();
  const failed = (await t.query(internal.sandboxSnapshots.current, {
    kind: "media",
  }))!;
  const receipt = {
    kind: "media" as const,
    snapshotId: failed.snapshotId,
    updatedAt: failed.updatedAt,
    cleanupConfirmed: true,
  };
  await expect(
    t.mutation(internal.sandboxSnapshots.acknowledgeFailure, receipt),
  ).rejects.toThrow("APPROVAL_STALE");
  vi.stubEnv("SANDBOX_SNAPSHOT_RENEWAL_ENABLED", "false");
  await expect(
    t.mutation(internal.sandboxSnapshots.acknowledgeFailure, {
      ...receipt,
      cleanupConfirmed: false,
    }),
  ).rejects.toThrow("APPROVAL_STALE");
  await expect(
    t.mutation(internal.sandboxSnapshots.acknowledgeFailure, {
      ...receipt,
      snapshotId: "snap_wrongsynthetic123",
    }),
  ).rejects.toThrow("APPROVAL_STALE");
  await t.mutation(internal.sandboxSnapshots.acknowledgeFailure, receipt);
  expect(
    (await t.query(internal.sandboxSnapshots.current, { kind: "media" }))!
      .retryAfter,
  ).toBeUndefined();
  vi.stubEnv("SANDBOX_SNAPSHOT_RENEWAL_ENABLED", "true");
  vi.stubEnv("RESTORE_LOCK", "true");
  expect(
    await t.mutation(internal.sandboxSnapshots.claim, {
      kind: "media",
      lease: "ff".repeat(16),
      force: true,
    }),
  ).toBeNull();
});
