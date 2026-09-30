import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { access } from "./lib";
import { wallet } from "./product";
import { pricing, ensure } from "../packages/policy";
export const catalogue = query({
  args: {},
  handler: () => ({
    pricing,
    taxMode: "pending_evidence",
    liveEnabled: false,
    sandboxEnabled:
      process.env.STRIPE_MODE !== "live" &&
      (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_") &&
      !!process.env.STRIPE_V1_WEBHOOK_SECRET &&
      [
        "STARTER_WEEKLY",
        "STARTER_MONTHLY",
        "STARTER_ANNUAL",
        "PRO_WEEKLY",
        "PRO_MONTHLY",
        "PRO_ANNUAL",
      ].every((k) => !!process.env[`STRIPE_${k}_PRICE_ID`]),
  }),
});
export const grantPeriod = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    subscription: v.string(),
    tier: v.union(v.literal("starter"), v.literal("pro")),
    interval: v.union(v.literal("weekly"), v.literal("monthly")),
    start: v.number(),
    end: v.number(),
    verifiedPayment: v.boolean(),
  },
  handler: async (ctx, a) => {
    ensure(
      a.verifiedPayment && a.end > a.start,
      "PAYMENT_REQUIRED",
      "Verified payment is required.",
    );
    const key = `${a.subscription}:${a.start}`;
    if (
      await ctx.db
        .query("billingPeriods")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique()
    )
      return;
    const w = await wallet(ctx, a.organizationId);
    const credits =
      a.interval === "weekly"
        ? pricing.tiers[a.tier].weekly_credits
        : pricing.tiers[a.tier].monthly_credits;
    ensure(
      a.start >= w.createdAt - 86400000 &&
        (w.tier === "trial" || a.end > w.periodEnd),
      "STALE_BILLING",
      "This entitlement period is stale.",
    );
    await ctx.db.insert("billingPeriods", {
      organizationId: a.organizationId,
      subscription: a.subscription,
      start: a.start,
      end: a.end,
      key,
      credits,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.insert("creditPools", {
      organizationId: a.organizationId,
      key,
      kind: "included",
      granted: credits,
      spent: 0,
      reserved: 0,
      expiresAt: a.end,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.patch(w._id, {
      tier: a.tier,
      interval: a.interval,
      granted: w.granted + credits,
      periodEnd: a.end,
      updatedAt: Date.now(),
    });
  },
});
export const preferences = mutation({
  args: {
    organizationId: v.id("organizations"),
    email: v.boolean(),
    telegram: v.boolean(),
    analytics: v.boolean(),
    legalVersion: v.string(),
  },
  handler: async (ctx, a) => {
    await access(ctx, a.organizationId, ["owner"]);
    const row = await ctx.db
      .query("preferences")
      .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
      .unique();
    if (row) await ctx.db.patch(row._id, { ...a, updatedAt: Date.now() });
    else
      await ctx.db.insert("preferences", {
        ...a,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        acceptedAt: Date.now(),
      });
  },
});
export const invoiceTasks = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, a) => {
    await access(ctx, a.organizationId, ["owner"]);
    return ctx.db
      .query("invoiceTasks")
      .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
      .collect();
  },
});
export const submitReceipt = mutation({
  args: { id: v.id("invoiceTasks"), receipt: v.string() },
  handler: async (ctx, a) => {
    const task = await ctx.db.get(a.id);
    ensure(task, "NOT_FOUND", "Invoice task unavailable.");
    await access(ctx, task.organizationId, ["owner"]);
    ensure(
      a.receipt.trim().length >= 10 && a.receipt.length < 1000,
      "EVIDENCE_REQUIRED",
      "Supply the actual submission receipt reference.",
    );
    await ctx.db.patch(a.id, {
      state: "submitted",
      receipt: a.receipt,
      updatedAt: Date.now(),
    });
  },
});

export const taxConfig = internalQuery({
  args: {},
  handler: async (ctx) => {
    const c = await ctx.db.query("taxConfigurations").first();
    return {
      domestic: (c?.domestic ?? "pending_evidence") as
        "pending_evidence" | "ro_small_business_exempt" | "ro_normal_vat",
      special317: c?.special317 ?? false,
      evidence: c?.evidence,
      effectiveAt: c?.effectiveAt,
      registrations: c?.registrations ?? [],
      countries: c?.countries ?? ["RO"],
      oss: c?.oss ?? false,
      reviewed: c?.reviewed ?? false,
    };
  },
});
export const recordAcceptance = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    termsVersion: v.string(),
    immediateService: v.boolean(),
  },
  handler: async (ctx, a) => {
    const actor = await access(ctx, a.organizationId, ["owner"]);
    await ctx.db.insert("legalAcceptances", {
      ...a,
      actor: actor.actor._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
export const refundRequest = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    invoiceId: v.string(),
    created: v.number(),
  },
  handler: async (ctx, a) => {
    await ctx.db.insert("refundRequests", {
      organizationId: a.organizationId,
      invoiceId: a.invoiceId,
      invoiceCreatedAt: a.created,
      status: "pending_review",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const grantTopup = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    paymentId: v.string(),
    credits: v.number(),
  },
  handler: async (ctx, a) => {
    ensure(
      [200, 550].includes(a.credits),
      "CATALOGUE_MISMATCH",
      "Invalid top-up credits.",
    );
    const key = `payment:${a.paymentId}`;
    if (
      await ctx.db
        .query("creditPools")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique()
    )
      return;
    const w = await wallet(ctx, a.organizationId);
    await ctx.db.insert("creditPools", {
      organizationId: a.organizationId,
      key,
      kind: "purchased",
      granted: a.credits,
      spent: 0,
      reserved: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.patch(w._id, { purchased: w.purchased + a.credits });
  },
});
export const budgetFixture = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    key: v.string(),
    max: v.number(),
  },
  handler: async (ctx, a) => {
    const { reserve } = await import("./product");
    return reserve(ctx, a.organizationId, a.key, a.max);
  },
});
export const settleUsage = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    key: v.string(),
    credits: v.number(),
  },
  handler: async (ctx, a) => {
    const { settle } = await import("./product");
    return settle(ctx, a.organizationId, a.key, a.credits);
  },
});
