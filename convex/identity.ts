"use node";
import { WorkOS } from "@workos-inc/node";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
export const bootstrap = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to continue.");
    const provider = new WorkOS(process.env.WORKOS_API_KEY);
    const profile = await provider.userManagement.getUser(identity.subject);
    if (!profile.emailVerified)
      throw new Error("Verify your email address before continuing.");
    await ctx.runMutation(internal.accounts.syncUser, {
      subject: identity.subject,
      email: profile.email.toLowerCase(),
      name:
        [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
        profile.email.split("@")[0],
    });
  },
});
export const finishDeletion = internalAction({
  args: { jobId: v.id("deletionJobs") },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.runQuery(internal.maintenance.deletionJob, { jobId });
    if (!job) return;
    try {
      await new WorkOS(process.env.WORKOS_API_KEY).userManagement.deleteUser(
        job.subject,
      );
    } catch (e) {
      if ((e as { status?: number }).status !== 404) {
        await ctx.runMutation(internal.accounts.deletionFailed, { jobId });
        return;
      }
    }
    await ctx.runMutation(internal.accounts.finishDelete, { jobId });
  },
});
