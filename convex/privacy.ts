import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { invoiceDeadline } from "../packages/policy";
import { redactSource } from "./product";
import { queueDeletion } from "./assets";
export const receipt = internalMutation({
  args: { provider: v.string(), key: v.string() },
  handler: async (ctx, a) => {
    if (
      await ctx.db
        .query("webhookReceipts")
        .withIndex("by_key", (q) =>
          q.eq("provider", a.provider).eq("key", a.key),
        )
        .unique()
    )
      return;
    await ctx.db.insert("webhookReceipts", {
      ...a,
      at: Date.now(),
      state: "reconciled",
    });
  },
});
export const invoiceTask = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    invoiceId: v.string(),
    issuedAt: v.number(),
  },
  handler: async (ctx, a) => {
    const tasks = await ctx.db
      .query("invoiceTasks")
      .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
      .collect();
    if (tasks.some((t) => t.invoiceId === a.invoiceId)) return;
    const holidays = JSON.parse(process.env.RO_REVIEWED_HOLIDAYS_JSON ?? "[]");
    const dueAt = invoiceDeadline(
      a.issuedAt,
      holidays,
      process.env.RO_CALENDAR_REVIEWED === "true",
    );
    await ctx.db.insert("invoiceTasks", {
      organizationId: a.organizationId,
      invoiceId: a.invoiceId,
      dueAt,
      state: "pending_submission",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
export const sweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const stage of await ctx.db
      .query("mediaStages")
      .withIndex("by_updated", (q) =>
        q.lt("updatedAt", Date.now() - 7 * 86400000),
      )
      .take(100))
      await ctx.db.delete(stage._id);
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_expiry", (q) =>
        q.gt("expiresAt", 0).lt("expiresAt", Date.now()),
      )
      .take(100);
    for (const asset of assets) {
      await ctx.db.patch(asset._id, { state: "deleting" });
      await queueDeletion(ctx, asset.key);
    }
    const tombstones = await ctx.db.query("tombstones").take(1000);
    for (const tomb of tombstones) {
      const id = ctx.db.normalizeId("sources", tomb.target);
      if (!id) continue;
      const source = await ctx.db.get(id);
      if (source && source.state !== "deleted") await redactSource(ctx, id);
    }
    for (const job of await ctx.db
      .query("objectDeletions")
      .withIndex("by_state", (q) => q.eq("state", "pending"))
      .take(100)) {
      await ctx.db.patch(job._id, {
        attempts: job.attempts + 1,
        updatedAt: Date.now(),
      });
      await ctx.scheduler.runAfter(0, internal.integrations.deleteObject, {
        key: job.key,
      });
    }
    const repos = await ctx.db.query("repositories").take(1000);
    for (const repo of repos)
      if (repo.context && repo.updatedAt < Date.now() - 86400000)
        await ctx.db.patch(repo._id, { context: "" });
    const runs = await ctx.db.query("runs").take(1000);
    for (const run of runs)
      if (
        run.updatedAt < Date.now() - 14 * 86400000 &&
        ["completed", "failed", "canceled"].includes(run.state)
      )
        await ctx.db.patch(run._id, {
          events: [],
          patch: undefined,
          changes: undefined,
          report: undefined,
        });
  },
});
