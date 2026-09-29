import { query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { access, billingFor, fail, limit } from "./lib";
export const authorize = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const a = await access(ctx, organizationId, ["owner"]);
    return {
      name: a.organization.name,
      email: a.actor.email,
      mode: process.env.STRIPE_MODE === "live" ? "live" : "test",
      configured: Boolean(
        process.env.STRIPE_PRO_PRICE_ID &&
        process.env.STRIPE_WEBHOOK_SECRET &&
        new RegExp(`^[sr]k_${process.env.STRIPE_MODE ?? "test"}_`).test(
          process.env.STRIPE_SECRET_KEY ?? "",
        ) &&
        ["test", "live"].includes(process.env.STRIPE_MODE ?? "test"),
      ),
      billing: await billingFor(ctx, organizationId),
    };
  },
});
export const throttle = internalMutation({
  args: { organizationId: v.id("organizations") },
  handler: (ctx, { organizationId }) =>
    limit(ctx, `billing:${organizationId}`, 10),
});
export const attach = internalMutation({
  args: { organizationId: v.id("organizations"), customerId: v.string() },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org || org.status !== "active") fail("Organization unavailable.");
    const old = await billingFor(ctx, args.organizationId);
    if (old) return old.customerId;
    await ctx.db.insert("billing", {
      ...args,
      status: "free",
      periodEnd: 0,
      verifiedAt: Date.now(),
      revision: 0,
    });
    return args.customerId;
  },
});
export const reserveCheckout = internalMutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const row = await billingFor(ctx, organizationId);
    if (!row) fail("Billing account unavailable.");
    if (
      row.checkoutKey &&
      row.checkoutExpires &&
      row.checkoutExpires > Date.now()
    )
      return { key: row.checkoutKey, expires: row.checkoutExpires };
    const expires = Date.now() + 31 * 60000;
    const key = `checkout:${organizationId}:${Date.now()}`;
    await ctx.db.patch(row._id, { checkoutKey: key, checkoutExpires: expires });
    return { key, expires };
  },
});
export const reserveRefresh = internalMutation({
  args: { customerId: v.string() },
  handler: async (ctx, { customerId }) => {
    const row = await ctx.db
      .query("billing")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .unique();
    if (!row) return null;
    const revision = row.revision + 1;
    await ctx.db.patch(row._id, { revision });
    return { organizationId: row.organizationId, revision };
  },
});
export const apply = internalMutation({
  args: {
    customerId: v.string(),
    subscriptionId: v.optional(v.string()),
    status: v.string(),
    periodEnd: v.number(),
    revision: v.number(),
    eventId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (
      args.eventId &&
      (await ctx.db
        .query("events")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId!))
        .unique())
    )
      return;
    const row = await ctx.db
      .query("billing")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .unique();
    if (!row) fail("Billing account unavailable.");
    if (args.revision >= (row.appliedRevision ?? 0))
      await ctx.db.patch(row._id, {
        subscriptionId: args.subscriptionId,
        status: args.status,
        periodEnd: args.periodEnd,
        verifiedAt: Date.now(),
        appliedRevision: args.revision,
      });
    if (args.eventId)
      await ctx.db.insert("events", {
        eventId: args.eventId,
        processedAt: Date.now(),
      });
  },
});
export const customers = internalQuery({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: (ctx, { cursor }) =>
    ctx.db.query("billing").paginate({ cursor, numItems: 50 }),
});
