import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
export const tick = internalAction({
  args: { id: v.id("libraryScans") },
  handler: async (ctx, a): Promise<void> => {
    const lease = await ctx.runMutation(internal.libraryScans.claim, a);
    if (!lease) return;
    const bound = { ...a, lease };
    try {
      const delay = await ctx.runMutation(internal.libraryScans.step, bound);
      await ctx.runMutation(internal.libraryScans.release, {
        ...bound,
        delay: delay ?? 0,
      });
      if (delay !== null)
        await ctx.scheduler.runAfter(
          Math.max(1000, delay),
          internal.libraryScanWorker.tick,
          a,
        );
    } catch (error) {
      const reason =
        error instanceof Error
          ? ([
              "COST_RECONCILIATION_REQUIRED",
              "BUDGET_EXCEEDED",
              "INSUFFICIENT_CREDITS",
              "OPERATOR_BUDGET_REACHED",
              "PROVIDER_LIMIT",
              "APPROVAL_STALE",
              "MEDIA_UNAVAILABLE",
              "UPLOAD_REQUIRED",
              "UPLOAD_INVALID",
              "SETUP_REQUIRED",
            ].find((c) => error.message.includes(c)) ?? "needs_attention")
          : "needs_attention";
      if (
        ["MEDIA_UNAVAILABLE", "UPLOAD_REQUIRED", "UPLOAD_INVALID"].includes(
          reason,
        ) &&
        (await ctx.runMutation(internal.libraryScans.skipUnavailable, bound))
      ) {
        await ctx.runMutation(internal.libraryScans.release, {
          ...bound,
          delay: 1000,
        });
        await ctx.scheduler.runAfter(1000, internal.libraryScanWorker.tick, a);
      } else
        await ctx.runMutation(internal.libraryScans.blocked, {
          ...bound,
          reason,
        });
    }
  },
});
export const recover = internalAction({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, a): Promise<void> => {
    const page = await ctx.runQuery(internal.libraryScans.page, a);
    for (const j of page.page)
      await ctx.runAction(internal.libraryScanWorker.tick, { id: j._id });
    if (!page.isDone)
      await ctx.scheduler.runAfter(0, internal.libraryScanWorker.recover, {
        cursor: page.continueCursor,
      });
  },
});
