import { Resend } from "@convex-dev/resend";
import { components } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
export const resend: Resend = new Resend(components.resend, {
  testMode: process.env.EMAIL_REAL_DELIVERY_ENABLED !== "true",
});
export const notify = internalMutation({
  args: { organizationId: v.id("organizations"), key: v.string() },
  handler: async (ctx, a) => {
    if (
      process.env.EMAIL_REAL_DELIVERY_ENABLED !== "true" ||
      !process.env.RESEND_API_KEY ||
      !process.env.RESEND_FROM ||
      !process.env.APP_URL
    )
      return { sent: false, reason: "Email delivery is not configured." };
    const pref = await ctx.db
      .query("preferences")
      .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
      .unique();
    const org = await ctx.db.get(a.organizationId);
    if (!pref?.email || org?.status !== "active") return { sent: false };
    const members = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
      .collect();
    for (const member of members.filter((m) => m.role === "owner")) {
      const user = await ctx.db.get(member.userId);
      if (!user || user.status !== "active") continue;
      // Generic notification only. Evidence, titles, code, and transcripts stay behind authenticated access.
      await resend.sendEmail(ctx, {
        from: process.env.RESEND_FROM,
        to: user.email,
        subject: "VibeScroller has an update",
        text: `A source or coding task needs your attention. Sign in to review it: ${process.env.APP_URL}/app/${a.organizationId}/inbox`,
        idempotencyKey: `${a.key}:${user._id}`,
      });
    }
    return { queued: true };
  },
});
