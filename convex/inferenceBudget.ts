import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ensure } from "../packages/policy";
export const reserve = internalMutation({
  args: { key: v.string(), max: v.number() },
  handler: async (ctx, a) => {
    ensure(
      Number.isSafeInteger(a.max) && a.max > 0 && a.max <= 5000,
      "PROVIDER_LIMIT",
      "The requested analysis exceeds the reviewed free allowance. Shorten supplied content or configure a separately approved route.",
    );
    const key = `cf-free:${new Date().toISOString().slice(0, 10)}`;
    let budget = await ctx.db
      .query("operatorBudgets")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (!budget) {
      const id = await ctx.db.insert("operatorBudgets", {
        key,
        ceiling: 5000,
        reserved: 0,
        spent: 0,
        updatedAt: Date.now(),
      });
      budget = (await ctx.db.get(id))!;
    }
    ensure(
      budget.reserved + budget.spent + a.max <= budget.ceiling,
      "PROVIDER_LIMIT",
      "The reviewed daily free inference allowance is reserved or exhausted.",
    );
    const old = await ctx.db
      .query("inferenceReservations")
      .withIndex("by_key", (q) => q.eq("key", a.key))
      .unique();
    ensure(!old, "APPROVAL_STALE", "Inference reservation cannot be replayed.");
    await ctx.db.patch(budget._id, {
      reserved: budget.reserved + a.max,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("inferenceReservations", {
      key: a.key,
      budgetKey: key,
      max: a.max,
      state: "active",
      createdAt: Date.now(),
    });
  },
});
export const settle = internalMutation({
  args: { key: v.string(), neurons: v.number() },
  handler: async (ctx, a) => {
    const hold = await ctx.db
      .query("inferenceReservations")
      .withIndex("by_key", (q) => q.eq("key", a.key))
      .unique();
    if (!hold || hold.state !== "active") return;
    ensure(
      Number.isFinite(a.neurons) && a.neurons >= 0 && a.neurons <= hold.max,
      "COST_RECONCILIATION_REQUIRED",
      "Inference usage exceeds its reservation.",
    );
    const budget = await ctx.db
      .query("operatorBudgets")
      .withIndex("by_key", (q) => q.eq("key", hold.budgetKey))
      .unique();
    ensure(
      budget && budget.reserved >= hold.max,
      "LEDGER_INVALID",
      "Inference budget unavailable.",
    );
    await ctx.db.patch(budget._id, {
      reserved: budget.reserved - hold.max,
      spent: budget.spent + a.neurons,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(hold._id, { state: "settled" });
  },
});
