import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { user, fail, limit } from "./lib";
export const syncUser = internalMutation({
  args: { subject: v.string(), email: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", args.subject))
      .unique();
    if (existing) {
      if (existing.status !== "active")
        fail("Account deletion is in progress.");
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return ctx.db.insert("users", {
      ...args,
      status: "active",
      createdAt: Date.now(),
    });
  },
});
export const current = query({
  args: {},
  handler: async (ctx) => {
    const actor = await user(ctx);
    const rows = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", actor._id))
      .collect();
    return {
      user: { name: actor.name, email: actor.email },
      organizations: (
        await Promise.all(
          rows.map(async (m) => {
            const org = await ctx.db.get(m.organizationId);
            return org?.status === "active"
              ? { id: org._id, name: org.name, role: m.role }
              : null;
          }),
        )
      ).filter((x) => x !== null),
    };
  },
});
export const exportAccount = query({
  args: {},
  handler: async (ctx) => {
    const actor = await user(ctx);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", actor._id))
      .collect();
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      profile: {
        name: actor.name,
        email: actor.email,
        createdAt: actor.createdAt,
      },
      memberships: memberships.map((m) => ({
        organizationId: m.organizationId,
        role: m.role,
      })),
      note: "Organization content belongs to the organization. Owners can export it separately.",
    };
  },
});
export const deleteAccount = mutation({
  args: { confirmation: v.string() },
  handler: async (ctx, args) => {
    const actor = await user(ctx);
    if (args.confirmation !== actor.email)
      fail("Type your email address to confirm.");
    await limit(ctx, `delete:${actor._id}`, 3);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", actor._id))
      .collect();
    for (const m of memberships) {
      if (m.role === "owner") {
        const others = await ctx.db
          .query("memberships")
          .withIndex("by_org", (q) => q.eq("organizationId", m.organizationId))
          .collect();
        if (!others.some((x) => x._id !== m._id && x.role === "owner"))
          fail("Transfer ownership or delete your organizations first.");
      }
    }
    for (const m of memberships) await ctx.db.delete(m._id);
    await ctx.db.patch(actor._id, { status: "deleting" });
    const job = await ctx.db.insert("deletionJobs", {
      userId: actor._id,
      subject: actor.subject,
      state: "pending",
      attempts: 0,
    });
    await ctx.scheduler.runAfter(0, internal.identity.finishDeletion, {
      jobId: job,
    });
    return { status: "deleting" };
  },
});
export const finishDelete = internalMutation({
  args: { jobId: v.id("deletionJobs") },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId);
    if (!job) return;
    await ctx.db.delete(job.userId);
    await ctx.db.delete(jobId);
  },
});
export const deletionFailed = internalMutation({
  args: { jobId: v.id("deletionJobs") },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId);
    if (!job) return;
    const attempts = job.attempts + 1;
    await ctx.db.patch(jobId, {
      attempts,
      state: attempts >= 5 ? "failed" : "pending",
      error: "Identity provider deletion failed. Retry from operations.",
    });
    if (attempts < 5)
      await ctx.scheduler.runAfter(
        60000 * 2 ** attempts,
        internal.identity.finishDeletion,
        { jobId },
      );
  },
});
