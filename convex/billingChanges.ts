import { query, internalQuery } from "./_generated/server";
import { internalMutation } from "./lib/projectedMutations";
import { v } from "convex/values";
import { access, writeAccess } from "./lib";
import { ensure } from "../packages/policy";
const fields = {
  organizationId: v.id("organizations"),
  subscriptionId: v.string(),
  itemId: v.string(),
  oldPrice: v.string(),
  newPrice: v.string(),
  tier: v.union(v.literal("starter"), v.literal("pro")),
  interval: v.union(
    v.literal("weekly"),
    v.literal("monthly"),
    v.literal("annual"),
  ),
  prorationDate: v.number(),
  periodStart: v.number(),
  periodEnd: v.number(),
  amount: v.number(),
  currency: v.string(),
};
export const create = internalMutation({
  args: fields,
  handler: async (ctx, a) => {
    await writeAccess(ctx, a.organizationId, ["owner"]);
    ensure(
      Number.isSafeInteger(a.amount) &&
        a.currency === "eur" &&
        a.periodEnd > a.periodStart,
      "QUOTE_INVALID",
      "Invalid provider quote.",
    );
    return ctx.db.insert("billingChanges", {
      ...a,
      state: "quoted",
      expiresAt: Date.now() + 600000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
export const quote = query({
  args: { id: v.id("billingChanges") },
  handler: async (ctx, a) => {
    const q = await ctx.db.get(a.id);
    ensure(q, "NOT_FOUND", "Quote unavailable.");
    await access(ctx, q.organizationId, ["owner"]);
    return q;
  },
});
export const claim = internalMutation({
  args: { id: v.id("billingChanges") },
  handler: async (ctx, a) => {
    const q = await ctx.db.get(a.id);
    ensure(q, "NOT_FOUND", "Quote unavailable.");
    await writeAccess(ctx, q.organizationId, ["owner"]);
    ensure(
      q.state === "quoted" && q.expiresAt > Date.now(),
      "QUOTE_EXPIRED",
      "Request a fresh plan-change quote.",
    );
    await ctx.db.patch(q._id, { state: "applying", updatedAt: Date.now() });
    return q;
  },
});
export const finish = internalMutation({
  args: {
    id: v.id("billingChanges"),
    state: v.string(),
    invoiceId: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    await ctx.db.patch(a.id, {
      state: a.state,
      invoiceId: a.invoiceId,
      updatedAt: Date.now(),
    });
  },
});
export const paidUpgrade = internalQuery({
  args: {
    subscriptionId: v.string(),
    invoiceId: v.string(),
    price: v.string(),
  },
  handler: async (ctx, a) => {
    const rows = await ctx.db
      .query("billingChanges")
      .withIndex("by_subscription", (q) =>
        q.eq("subscriptionId", a.subscriptionId),
      )
      .collect();
    return (
      rows.find(
        (q) =>
          q.newPrice === a.price &&
          q.invoiceId === a.invoiceId &&
          q.state === "applied",
      ) ?? null
    );
  },
});
