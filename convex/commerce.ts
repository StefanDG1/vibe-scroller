import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { access, writeAccess } from "./lib";
import { wallet } from "./product";
import { pricing, ensure } from "../packages/policy";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
async function fundInvoice(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  poolId: Id<"creditPools">,
  invoiceId: string | undefined,
  credits: number,
) {
  if (!invoiceId) return 0;
  const key = `${poolId}:${invoiceId}`;
  const old = await ctx.db
    .query("creditFunding")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (old) return old.revoked;
  const reversal = await ctx.db
    .query("billingReversals")
    .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
    .unique();
  ensure(
    !reversal || reversal.organizationId === organizationId,
    "FORBIDDEN",
    "Invoice belongs to another workspace.",
  );
  const revoked = reversal
    ? Math.floor((credits * reversal.refunded) / reversal.total)
    : 0;
  await ctx.db.insert("creditFunding", {
    organizationId,
    poolId,
    key,
    invoiceId,
    credits,
    revoked,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return revoked;
}
export const catalogue = query({
  args: {},
  handler: () => ({
    pricing,
    taxMode: "pending_evidence",
    liveEnabled: false,
    sandboxEnabled:
      process.env.STRIPE_MODE !== "live" &&
      /^[sr]k_test_/.test(process.env.STRIPE_SECRET_KEY ?? "") &&
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
    upgradeAt: v.optional(v.number()),
    invoiceId: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    ensure(
      a.verifiedPayment && a.end > a.start,
      "PAYMENT_REQUIRED",
      "Verified payment is required.",
    );
    const key = `${a.subscription}:${a.start}`;
    const existing = await ctx.db
      .query("billingPeriods")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    const w = await wallet(ctx, a.organizationId);
    const credits =
      a.interval === "weekly"
        ? pricing.tiers[a.tier].weekly_credits
        : pricing.tiers[a.tier].monthly_credits;
    if (existing) {
      ensure(
        existing.organizationId === a.organizationId && existing.end === a.end,
        "STALE_BILLING",
        "Entitlement identity mismatch.",
      );
      const ceiling = existing.allowanceCeiling ?? existing.credits;
      if (credits > ceiling) {
        if (a.upgradeAt === undefined || !a.invoiceId) return;
        ensure(
          a.upgradeAt >= a.start && a.upgradeAt < a.end,
          "STALE_BILLING",
          "Upgrade outside its paid period.",
        );
        const delta = Math.floor(
          ((credits - ceiling) * (a.end - a.upgradeAt)) / (a.end - a.start),
        );
        const pool = await ctx.db
          .query("creditPools")
          .withIndex("by_key", (q) => q.eq("key", key))
          .unique();
        ensure(
          pool && pool.organizationId === a.organizationId,
          "LEDGER_INVALID",
          "Entitlement pool unavailable.",
        );
        const revoked = await fundInvoice(
          ctx,
          a.organizationId,
          pool._id,
          a.invoiceId,
          delta,
        );
        await ctx.db.patch(pool._id, {
          granted: pool.granted + delta,
          revoked: (pool.revoked ?? 0) + revoked,
          updatedAt: Date.now(),
        });
        await ctx.db.patch(existing._id, {
          credits: existing.credits + delta,
          allowanceCeiling: credits,
          updatedAt: Date.now(),
        });
        await ctx.db.patch(w._id, {
          tier: a.tier,
          granted: w.granted + delta - revoked,
          updatedAt: Date.now(),
        });
      }
      return;
    }
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
      allowanceCeiling: credits,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const poolId = await ctx.db.insert("creditPools", {
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
    const revoked = await fundInvoice(
      ctx,
      a.organizationId,
      poolId,
      a.invoiceId,
      credits,
    );
    if (revoked) await ctx.db.patch(poolId, { revoked });
    await ctx.db.patch(w._id, {
      tier: a.tier,
      interval: a.interval,
      granted: w.granted + credits - revoked,
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
    await writeAccess(ctx, a.organizationId, ["owner"]);
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
    await writeAccess(ctx, task.organizationId, ["owner"]);
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
    const actor = await writeAccess(ctx, a.organizationId, ["owner"]);
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
    const reversal = await ctx.db
      .query("billingReversals")
      .withIndex("by_key", (q) => q.eq("key", `refund:${a.paymentId}`))
      .unique();
    ensure(
      !reversal || reversal.organizationId === a.organizationId,
      "FORBIDDEN",
      "Payment reversal belongs to another workspace.",
    );
    const revoked = reversal
      ? Math.floor((a.credits * reversal.refunded) / reversal.total)
      : 0;
    await ctx.db.insert("creditPools", {
      organizationId: a.organizationId,
      key,
      kind: "purchased",
      revoked,
      granted: a.credits,
      spent: 0,
      reserved: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.patch(w._id, { purchased: w.purchased + a.credits - revoked });
  },
});
export const reversePayment = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    paymentId: v.string(),
    refunded: v.number(),
    total: v.number(),
    invoiceId: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    ensure(
      Number.isSafeInteger(a.refunded) &&
        Number.isSafeInteger(a.total) &&
        a.total > 0 &&
        a.refunded >= 0 &&
        a.refunded <= a.total,
      "REFUND_INVALID",
      "Invalid cumulative provider refund.",
    );
    const key = `refund:${a.paymentId}`;
    const old = await ctx.db
      .query("billingReversals")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    ensure(
      !old || old.organizationId === a.organizationId,
      "FORBIDDEN",
      "Payment belongs to another workspace.",
    );
    if (old && old.refunded >= a.refunded) return;
    if (old)
      await ctx.db.patch(old._id, {
        refunded: a.refunded,
        updatedAt: Date.now(),
      });
    else
      await ctx.db.insert("billingReversals", {
        ...a,
        key,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    if (a.invoiceId) {
      const invoiceId = a.invoiceId;
      const grants = await ctx.db
        .query("creditFunding")
        .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
        .collect();
      const w = await wallet(ctx, a.organizationId);
      let removed = 0;
      for (const grant of grants) {
        ensure(
          grant.organizationId === a.organizationId,
          "FORBIDDEN",
          "Invoice grant belongs to another workspace.",
        );
        const revoked = Math.floor((grant.credits * a.refunded) / a.total),
          delta = revoked - grant.revoked;
        if (delta <= 0) continue;
        const pool = await ctx.db.get(grant.poolId);
        if (!pool) continue;
        await ctx.db.patch(pool._id, {
          revoked: (pool.revoked ?? 0) + delta,
          updatedAt: Date.now(),
        });
        await ctx.db.patch(grant._id, { revoked, updatedAt: Date.now() });
        removed += delta;
      }
      if (removed)
        await ctx.db.patch(w._id, {
          granted: Math.max(0, w.granted - removed),
          updatedAt: Date.now(),
        });
    }
    const pool = await ctx.db
      .query("creditPools")
      .withIndex("by_key", (q) => q.eq("key", `payment:${a.paymentId}`))
      .unique();
    if (!pool) return;
    ensure(
      pool.organizationId === a.organizationId && pool.kind === "purchased",
      "FORBIDDEN",
      "Top-up belongs to another workspace.",
    );
    const revoked = Math.floor((pool.granted * a.refunded) / a.total),
      delta = revoked - (pool.revoked ?? 0);
    if (delta <= 0) return;
    await ctx.db.patch(pool._id, { revoked, updatedAt: Date.now() });
    const w = await wallet(ctx, a.organizationId);
    await ctx.db.patch(w._id, {
      purchased: Math.max(0, w.purchased - delta),
      updatedAt: Date.now(),
    });
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
export const stagingBillingEvidence = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, a) => {
    ensure(
      a.organizationId === process.env.STAGING_TEST_ORGANIZATION_ID &&
        process.env.STRIPE_MODE === "test",
      "FORBIDDEN",
      "Only the dedicated synthetic staging workspace is permitted.",
    );
    const billing = await ctx.db
      .query("billing")
      .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
      .unique();
    const pools = await ctx.db
      .query("creditPools")
      .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
      .collect();
    return {
      status: billing?.status,
      subscriptionId: billing?.subscriptionId,
      pools: pools.map((p) => ({
        key: p.key,
        granted: p.granted,
        spent: p.spent,
        reserved: p.reserved,
        revoked: p.revoked ?? 0,
        kind: p.kind,
        expiresAt: p.expiresAt,
      })),
    };
  },
});
