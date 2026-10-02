import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { access } from "./lib";
import { personalAllowed } from "./lib/personalAccess";
import { freeWorkersConfigured } from "../packages/providers/workers-plan";
import { hostedMediaAllowed } from "./lib/hostedMediaAccess";
export const read = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const { actor } = await access(ctx, args.organizationId);
    return {
      preferChatGPTPlan: actor.preferChatGPTPlan ?? false,
      hostedStatus: "awaiting_commercial_access" as const,
      active: false as const,
      personalAlphaEnabled: personalAllowed(actor.subject),
      cloudAnalysisEnabled:
        process.env.DISABLE_INFERENCE !== "true" &&
        process.env.MANAGED_INFERENCE_ROUTE === "cloudflare_free" &&
        process.env.MEDIA_VERIFIED === "true" &&
        hostedMediaAllowed(actor.subject) &&
        freeWorkersConfigured(),
      linkAnalysisEnabled:
        process.env.ACQUISITION_VERIFIED === "true" &&
        process.env.MEDIA_VERIFIED === "true",
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
