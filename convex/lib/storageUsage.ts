import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

// Count stored bytes until the deletion receipt removes the object. Expiry or
// a deletion request alone does not establish that storage has been released.
export async function storageUsage(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
) {
  const existing = await ctx.db
    .query("storageUsage")
    .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
    .unique();
  if (existing) return existing;
  // One transactional initialization for legacy workspaces. Subsequent writes
  // update the total atomically, including concurrent uploads and deletions.
  const assets = await ctx.db
    .query("assets")
    .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
    .collect();
  const bytes = assets
    .filter((a) => a.state !== "deleted")
    .reduce((n, a) => n + a.size, 0);
  const id = await ctx.db.insert("storageUsage", { organizationId, bytes });
  return (await ctx.db.get(id))!;
}

export async function insertAsset(
  ctx: MutationCtx,
  asset: Omit<Doc<"assets">, "_id" | "_creationTime">,
) {
  const usage = await storageUsage(ctx, asset.organizationId);
  const id = await ctx.db.insert("assets", asset);
  if (asset.state !== "deleted")
    await ctx.db.patch(usage._id, { bytes: usage.bytes + asset.size });
  return id;
}

export async function deleteAsset(ctx: MutationCtx, asset: Doc<"assets">) {
  const usage = await storageUsage(ctx, asset.organizationId);
  await ctx.db.delete(asset._id);
  if (asset.state !== "deleted")
    await ctx.db.patch(usage._id, {
      bytes: Math.max(0, usage.bytes - asset.size),
    });
}
