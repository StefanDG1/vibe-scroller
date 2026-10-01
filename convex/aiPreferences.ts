import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { access } from "./lib";
import { personalAllowed } from "./lib/personalAccess";
export const read = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const { actor } = await access(ctx, args.organizationId);
    return {
      preferChatGPTPlan: actor.preferChatGPTPlan ?? false,
      hostedStatus: "awaiting_commercial_access" as const,
      active: false as const,
      personalAlphaEnabled: personalAllowed(actor.subject),
    };
  },
});
export const save = mutation({
  args: {
    organizationId: v.id("organizations"),
    preferChatGPTPlan: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { actor } = await access(ctx, args.organizationId);
    await ctx.db.patch(actor._id, {
      preferChatGPTPlan: args.preferChatGPTPlan,
    });
    // This is a personal preference, not provider consent or execution approval.
    return { preferChatGPTPlan: args.preferChatGPTPlan, active: false };
  },
});
