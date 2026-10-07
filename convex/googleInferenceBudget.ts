import { internalMutation, mutation } from "./lib/projectedMutations";
import { v } from "convex/values";
import { ensure } from "../packages/policy";
import { googleConfigured } from "../packages/providers/google-inference";
import { verifyInference } from "../packages/policy/inference-broker";
const budgetKey = "google-eu-pilot-2026-10-03";
// Non-resetting, immutable EUR 10 pilot ceiling. Credits do not make usage free.
const ceiling = 10_000_000;
export const reserve = internalMutation({
  args: { key: v.string(), max: v.number(), payloadDigest: v.string() },
  handler: async (ctx, a) => {
    ensure(
      googleConfigured(),
      "SETUP_REQUIRED",
      "The reviewed Google inference route is unavailable.",
    );
    ensure(
      Number.isSafeInteger(a.max) &&
        a.max > 0 &&
        a.max <= 100000 &&
        /^[a-f0-9]{64}$/.test(a.payloadDigest),
      "INVALID_BUDGET",
      "A bounded inference reservation is required.",
    );
    ensure(
      !(await ctx.db
        .query("inferenceReservations")
        .withIndex("by_key", (q) => q.eq("key", a.key))
        .unique()),
      "APPROVAL_STALE",
      "Inference reservation cannot be replayed.",
    );
    let budget = await ctx.db
      .query("operatorBudgets")
      .withIndex("by_key", (q) => q.eq("key", budgetKey))
      .unique();
    if (!budget) {
      const id = await ctx.db.insert("operatorBudgets", {
        key: budgetKey,
        ceiling,
        reserved: 0,
        spent: 0,
        updatedAt: Date.now(),
      });
      budget = (await ctx.db.get(id))!;
    }
    ensure(
      budget.ceiling === ceiling &&
        budget.reserved + budget.spent + a.max <= ceiling,
      "PROVIDER_LIMIT",
      "The reviewed hosted inference budget is reserved or exhausted.",
    );
    await ctx.db.patch(budget._id, {
      reserved: budget.reserved + a.max,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("inferenceReservations", {
      key: a.key,
      budgetKey,
      max: a.max,
      payloadDigest: a.payloadDigest,
      state: "active",
      createdAt: Date.now(),
    });
  },
});
// The authenticated broker can consume only an existing internal reservation.
// A signed request alone cannot create spending permission or customer access.
export const consume = mutation({
  args: { envelope: v.string(), signature: v.string() },
  handler: async (ctx, a) => {
    if (!googleConfigured()) return false;
    const request = await verifyInference(
      a.envelope,
      a.signature,
      process.env.GOOGLE_INFERENCE_BRIDGE_SECRET ?? "",
    );
    if (!request) return false;
    const hold = await ctx.db
      .query("inferenceReservations")
      .withIndex("by_key", (q) => q.eq("key", request.key))
      .unique();
    if (
      !hold ||
      hold.budgetKey !== budgetKey ||
      hold.state !== "active" ||
      hold.brokerConsumedAt !== undefined ||
      hold.max !== request.maxMicros ||
      hold.payloadDigest !== request.payloadDigest ||
      hold.createdAt < Date.now() - 60000
    )
      return false;
    await ctx.db.patch(hold._id, { brokerConsumedAt: Date.now() });
    return true;
  },
});
export const settle = internalMutation({
  args: { key: v.string(), micros: v.number() },
  handler: async (ctx, a) => {
    const hold = await ctx.db
      .query("inferenceReservations")
      .withIndex("by_key", (q) => q.eq("key", a.key))
      .unique();
    if (!hold || hold.state !== "active") return;
    ensure(
      hold.budgetKey === budgetKey &&
        hold.brokerConsumedAt !== undefined &&
        Number.isSafeInteger(a.micros) &&
        a.micros >= 0 &&
        a.micros <= hold.max,
      "COST_RECONCILIATION_REQUIRED",
      "Inference usage does not match its consumed reservation.",
    );
    const budget = await ctx.db
      .query("operatorBudgets")
      .withIndex("by_key", (q) => q.eq("key", budgetKey))
      .unique();
    ensure(
      budget && budget.reserved >= hold.max,
      "LEDGER_INVALID",
      "Inference budget is unavailable.",
    );
    await ctx.db.patch(budget._id, {
      reserved: budget.reserved - hold.max,
      spent: budget.spent + a.micros,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(hold._id, { state: "settled", settledMicros: a.micros });
  },
});
