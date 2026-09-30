"use node";
import { createHmac, timingSafeEqual } from "node:crypto";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
export const webhook = internalAction({
  args: { body: v.string(), signature: v.string(), delivery: v.string() },
  handler: async (ctx, a) => {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret || a.body.length > 1000000) return { status: 400 };
    const expected = `sha256=${createHmac("sha256", secret).update(a.body).digest("hex")}`;
    if (
      expected.length !== a.signature.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(a.signature))
    )
      return { status: 400 };
    await ctx.runMutation(internal.privacy.receipt, {
      provider: "github",
      key: a.delivery,
    });
    await ctx.scheduler.runAfter(0, internal.integrations.reconcilePRs, {});
    return { status: 200 };
  },
});
