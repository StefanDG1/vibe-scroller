import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { isPaid } from "../packages/company-config";
export function fail(message: string): never {
  throw new ConvexError(message);
}
export async function user(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return fail("Sign in to continue.");
  const row = await ctx.db
    .query("users")
    .withIndex("by_subject", (q) => q.eq("subject", identity.subject))
    .unique();
  if (!row || row.status !== "active")
    return fail("Account unavailable. Complete account setup first.");
  return row;
}
export async function access(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  roles?: string[],
) {
  const actor = await user(ctx);
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_pair", (q) =>
      q.eq("organizationId", organizationId).eq("userId", actor._id),
    )
    .unique();
  const organization = await ctx.db.get(organizationId);
  if (!membership || !organization || organization.status !== "active")
    return fail("Organization unavailable.");
  if (roles && !roles.includes(membership.role))
    return fail("You do not have permission for this action.");
  return { actor, membership, organization };
}
export const billingFor = (ctx: QueryCtx, id: Id<"organizations">) =>
  ctx.db
    .query("billing")
    .withIndex("by_org", (q) => q.eq("organizationId", id))
    .unique();
export async function paid(ctx: QueryCtx, id: Id<"organizations">) {
  if (!isPaid(await billingFor(ctx, id)))
    fail("This action requires an active Pro subscription.");
}
export async function limit(ctx: MutationCtx, key: string, max = 30) {
  const now = Date.now(),
    window = Math.floor(now / 60000);
  const row = await ctx.db
    .query("limits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (row?.window === window && row.count >= max)
    fail("Too many requests. Try again in a minute.");
  if (row)
    await ctx.db.patch(row._id, {
      window,
      count: row.window === window ? row.count + 1 : 1,
    });
  else await ctx.db.insert("limits", { key, window, count: 1 });
}
export async function audit(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  actorId: Id<"users">,
  action: string,
  target: string,
) {
  await ctx.db.insert("audit", {
    organizationId,
    actorId,
    action,
    target,
    at: Date.now(),
  });
}
export function short(value: string, max = 80) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max)
    fail(`Use between 1 and ${max} characters.`);
  return trimmed;
}
