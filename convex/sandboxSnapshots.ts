import { internalQuery } from "./_generated/server";
import { internalMutation } from "./lib/projectedMutations";
import { v } from "convex/values";
import { ensure } from "../packages/policy";
import { toolSnapshot } from "../packages/policy/tool-snapshots";
const kind = v.union(v.literal("media"), v.literal("coding"));
const scope = (projectId: string, teamId: string) =>
  ensure(
    projectId === process.env.VERCEL_SANDBOX_PROJECT_ID &&
      teamId === process.env.VERCEL_SANDBOX_TEAM_ID,
    "POLICY_BLOCKED",
    "Tool snapshots belong to the configured project only.",
  );
export const current = internalQuery({
  args: { kind },
  handler: (ctx, a) =>
    ctx.db
      .query("sandboxToolSnapshots")
      .withIndex("by_kind", (q) => q.eq("kind", a.kind))
      .unique(),
});
export const seed = internalMutation({
  args: {
    kind,
    snapshotId: v.string(),
    expiresAt: v.number(),
    projectId: v.string(),
    teamId: v.string(),
  },
  handler: async (ctx, a) => {
    scope(a.projectId, a.teamId);
    ensure(
      a.snapshotId ===
        process.env[
          a.kind === "media"
            ? "VERCEL_MEDIA_SNAPSHOT"
            : "VERCEL_CODING_SNAPSHOT"
        ],
      "POLICY_BLOCKED",
      "Seed only the explicitly configured clean image.",
    );
    toolSnapshot(a);
    const existing = await ctx.db
      .query("sandboxToolSnapshots")
      .withIndex("by_kind", (q) => q.eq("kind", a.kind))
      .unique();
    if (existing) return existing._id;
    return ctx.db.insert("sandboxToolSnapshots", {
      ...a,
      updatedAt: Date.now(),
    });
  },
});

// Explicit operator tool updates are distinct from automatic clone renewal.
// The gate names the exact independently tested candidate, never a customer VM.
export const replaceVerifiedCoding = internalMutation({
  args: {
    previousSnapshotId: v.string(),
    previousUpdatedAt: v.number(),
    snapshotId: v.string(),
    expiresAt: v.number(),
    projectId: v.string(),
    teamId: v.string(),
  },
  handler: async (ctx, a) => {
    scope(a.projectId, a.teamId);
    ensure(
      process.env.SANDBOX_TOOL_REPLACEMENT_ENABLED === "true" &&
        process.env.SANDBOX_SNAPSHOT_RENEWAL_ENABLED !== "true" &&
        process.env.DISABLE_CLOUD === "true" &&
        process.env.RESTORE_LOCK !== "true" &&
        process.env.VERCEL_CODING_REPLACEMENT_SNAPSHOT === a.snapshotId,
      "POLICY_BLOCKED",
      "Pause dispatch and renewal; configure the exact independently verified clean candidate.",
    );
    toolSnapshot(a);
    ensure(
      a.expiresAt > Date.now() + 5 * 86400000 &&
        a.expiresAt <= Date.now() + 7 * 86400000 + 300000,
      "POLICY_BLOCKED",
      "The candidate needs its observed bounded provider expiry.",
    );
    for (const state of ["queued", "running", "publishing"]) {
      const active = await ctx.db
        .query("runs")
        .withIndex("by_state", (q) => q.eq("state", state))
        .filter((q) => q.eq(q.field("executor"), "cloud"))
        .first();
      ensure(
        !active,
        "POLICY_BLOCKED",
        "Finish or cancel active cloud work before changing its tool profile.",
      );
    }
    const item = await ctx.db
      .query("sandboxToolSnapshots")
      .withIndex("by_kind", (q) => q.eq("kind", "coding"))
      .unique();
    ensure(
      item &&
        item.snapshotId === a.previousSnapshotId &&
        item.updatedAt === a.previousUpdatedAt &&
        !item.lease &&
        a.snapshotId !== item.snapshotId,
      "APPROVAL_STALE",
      "The verified coding image changed or maintenance is active.",
    );
    await ctx.db.patch(item._id, {
      snapshotId: a.snapshotId,
      parentSnapshotId: item.snapshotId,
      expiresAt: a.expiresAt,
      updatedAt: Date.now(),
      lastError: undefined,
      retryAfter: undefined,
    });
  },
});
export const claim = internalMutation({
  args: { kind, lease: v.string(), force: v.boolean() },
  handler: async (ctx, a) => {
    if (
      process.env.SANDBOX_SNAPSHOT_RENEWAL_ENABLED !== "true" ||
      process.env.RESTORE_LOCK === "true"
    )
      return null;
    const item = await ctx.db
      .query("sandboxToolSnapshots")
      .withIndex("by_kind", (q) => q.eq("kind", a.kind))
      .unique();
    if (!item) return null;
    scope(item.projectId, item.teamId);
    const now = Date.now();
    if (
      (item.leaseUntil ?? 0) > now ||
      (item.retryAfter ?? 0) > now ||
      (!a.force && item.expiresAt > now + 36 * 3600000)
    )
      return null;
    toolSnapshot(item, now);
    ensure(
      /^[a-f0-9]{32}$/.test(a.lease),
      "INVALID_INPUT",
      "Invalid maintenance lease.",
    );
    await ctx.db.patch(item._id, {
      lease: a.lease,
      leaseUntil: now + 300000,
      retryAfter: now + 6 * 3600000,
    });
    return item;
  },
});
export const promote = internalMutation({
  args: {
    kind,
    lease: v.string(),
    parentSnapshotId: v.string(),
    snapshotId: v.string(),
    expiresAt: v.number(),
    computeSeconds: v.number(),
    teardownConfirmed: v.boolean(),
  },
  handler: async (ctx, a) => {
    const item = await ctx.db
      .query("sandboxToolSnapshots")
      .withIndex("by_kind", (q) => q.eq("kind", a.kind))
      .unique();
    if (
      item &&
      item.snapshotId === a.snapshotId &&
      item.parentSnapshotId === a.parentSnapshotId &&
      item.expiresAt === a.expiresAt &&
      a.teardownConfirmed
    ) {
      scope(item.projectId, item.teamId);
      return;
    }
    ensure(
      item &&
        item.lease === a.lease &&
        item.leaseUntil! > Date.now() &&
        item.snapshotId === a.parentSnapshotId,
      "APPROVAL_STALE",
      "Maintenance lease changed.",
    );
    scope(item.projectId, item.teamId);
    toolSnapshot(a);
    ensure(
      process.env.SANDBOX_SNAPSHOT_RENEWAL_ENABLED === "true" &&
        process.env.RESTORE_LOCK !== "true" &&
        a.teardownConfirmed &&
        a.snapshotId !== a.parentSnapshotId &&
        a.expiresAt >= Date.now() + 5 * 86400000 &&
        a.expiresAt <= Date.now() + 7 * 86400000 + 300000 &&
        Number.isFinite(a.computeSeconds) &&
        a.computeSeconds > 0 &&
        a.computeSeconds <= 120,
      "POLICY_BLOCKED",
      "A bounded verified clean clone and teardown receipt are required.",
    );
    await ctx.db.patch(item._id, {
      snapshotId: a.snapshotId,
      parentSnapshotId: a.parentSnapshotId,
      expiresAt: a.expiresAt,
      computeSeconds: a.computeSeconds,
      updatedAt: Date.now(),
      lease: undefined,
      leaseUntil: undefined,
      retryAfter: undefined,
      lastError: undefined,
    });
  },
});
export const failed = internalMutation({
  args: { kind, lease: v.string() },
  handler: async (ctx, a) => {
    const item = await ctx.db
      .query("sandboxToolSnapshots")
      .withIndex("by_kind", (q) => q.eq("kind", a.kind))
      .unique();
    if (item?.lease === a.lease)
      await ctx.db.patch(item._id, {
        lease: undefined,
        leaseUntil: undefined,
        lastError:
          "Clean image renewal failed; the previous verified image was retained.",
        updatedAt: Date.now(),
      });
  },
});

// Operator recovery only, after independently checking provider cleanup.
// Cron and force-renewal do not bypass the retry budget. The exact failed
// record must still be selected and renewal must be disabled while recovering.
export const acknowledgeFailure = internalMutation({
  args: {
    kind,
    snapshotId: v.string(),
    updatedAt: v.number(),
    cleanupConfirmed: v.boolean(),
  },
  handler: async (ctx, a) => {
    const item = await ctx.db
      .query("sandboxToolSnapshots")
      .withIndex("by_kind", (q) => q.eq("kind", a.kind))
      .unique();
    ensure(
      item &&
        item.snapshotId === a.snapshotId &&
        item.updatedAt === a.updatedAt &&
        item.lastError &&
        !item.lease &&
        a.cleanupConfirmed &&
        process.env.SANDBOX_SNAPSHOT_RENEWAL_ENABLED !== "true" &&
        process.env.RESTORE_LOCK !== "true",
      "APPROVAL_STALE",
      "Verify the exact failed maintenance attempt and its cleanup first.",
    );
    scope(item.projectId, item.teamId);
    await ctx.db.patch(item._id, {
      retryAfter: undefined,
      updatedAt: Date.now(),
    });
  },
});
