import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { access, limit, fail } from "./lib";
import { ensure } from "../packages/policy";
import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import { wallet } from "./product";
export async function queueDeletion(ctx: MutationCtx, key: string) {
  const old = await ctx.db
    .query("objectDeletions")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (old?.state === "deleted") return;
  if (!old)
    await ctx.db.insert("objectDeletions", {
      key,
      state: "pending",
      attempts: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  await ctx.scheduler.runAfter(0, internal.integrations.deleteObject, { key });
}
export const grant = mutation({
  args: {
    organizationId: v.id("organizations"),
    key: v.string(),
    size: v.number(),
    type: v.string(),
  },
  handler: async (ctx, a) => {
    const u = await access(ctx, a.organizationId);
    await limit(ctx, `upload:${u.actor._id}`, 10);
    const entitlement = await wallet(ctx, a.organizationId);
    const retained = await ctx.db
      .query("assets")
      .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
      .collect();
    const retainedBytes = retained
      .filter(
        (asset) => asset.state !== "deleted" && asset.expiresAt > Date.now(),
      )
      .reduce((sum, asset) => sum + asset.size, 0);
    ensure(
      Number.isSafeInteger(a.size) &&
        retainedBytes + a.size <=
          (entitlement.tier === "pro" ? 5 : 1) * 1000000000,
      "STORAGE_LIMIT",
      "Your retained storage allowance is full. Delete sources or wait for temporary uploads to expire.",
    );
    ensure(
      a.size > 0 &&
        a.size <= 250000000 &&
        ["video/mp4", "video/webm", "audio/mpeg", "audio/wav"].includes(a.type),
      "UNSUPPORTED_UPLOAD",
      "Use permitted video or audio within 250 MB.",
    );
    ensure(
      a.key.startsWith(`${a.organizationId}/`) && a.key.split("/").length === 2,
      "INVALID_INPUT",
      "Invalid object key.",
    );
    ensure(
      !(await ctx.db
        .query("assets")
        .withIndex("by_key", (q) => q.eq("key", a.key))
        .unique()),
      "UPLOAD_INVALID",
      "Upload keys cannot be reused.",
    );
    return ctx.db.insert("assets", {
      ...a,
      state: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    });
  },
});
export const complete = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    key: v.string(),
    size: v.number(),
    type: v.string(),
    etag: v.string(),
  },
  handler: async (ctx, a) => {
    const asset = await ctx.db
      .query("assets")
      .withIndex("by_key", (q) => q.eq("key", a.key))
      .unique();
    ensure(
      asset &&
        asset.organizationId === a.organizationId &&
        asset.expiresAt > Date.now() &&
        asset.size === a.size &&
        asset.type === a.type,
      "UPLOAD_INVALID",
      "Upload metadata does not match the grant.",
    );
    await ctx.db.patch(asset._id, {
      state: "complete",
      etag: a.etag,
      updatedAt: Date.now(),
    });
  },
});
export const deleteReceipt = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, a) => {
    const asset = await ctx.db
      .query("assets")
      .withIndex("by_key", (q) => q.eq("key", a.key))
      .unique();
    if (asset) await ctx.db.delete(asset._id);
    const job = await ctx.db
      .query("objectDeletions")
      .withIndex("by_key", (q) => q.eq("key", a.key))
      .unique();
    if (job)
      await ctx.db.patch(job._id, { state: "deleted", updatedAt: Date.now() });
    if (
      !(await ctx.db
        .query("webhookReceipts")
        .withIndex("by_key", (q) =>
          q.eq("provider", "object_deletion").eq("key", a.key),
        )
        .unique())
    )
      await ctx.db.insert("webhookReceipts", {
        provider: "object_deletion",
        key: a.key,
        at: Date.now(),
        state: "deleted",
      });
  },
});
export const evidence = query({
  args: { id: v.id("assets") },
  handler: async (ctx, a) => {
    const asset = await ctx.db.get(a.id);
    if (!asset || asset.state !== "complete" || asset.expiresAt < Date.now())
      fail("Evidence unavailable.");
    await access(ctx, asset.organizationId);
    if (asset.sourceId) {
      const source = await ctx.db.get(asset.sourceId);
      if (!source || source.state === "deleted") fail("Evidence unavailable.");
    }
    return { key: asset.key, type: asset.type };
  },
});
