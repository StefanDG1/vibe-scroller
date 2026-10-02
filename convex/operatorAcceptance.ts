import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ensure } from "../packages/policy";
import { personalAllowed } from "./lib/personalAccess";
import { wallet } from "./product";
import { audit } from "./lib";
// Deployment-operator maintenance only. This never represents a Stripe payment.
export const grantQualityReviewCredits = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    subject: v.string(),
    key: v.string(),
    credits: v.number(),
  },
  handler: async (ctx, a) => {
    const org = await ctx.db.get(a.organizationId);
    const owner = org ? await ctx.db.get(org.createdBy) : null;
    ensure(
      process.env.OWNER_QUALITY_REVIEW_CREDITS_ENABLED === "true" &&
        org?.status === "active" &&
        owner?.status === "active" &&
        owner.subject === a.subject &&
        personalAllowed(a.subject),
      "FORBIDDEN",
      "Owner acceptance grant unavailable.",
    );
    ensure(
      Number.isSafeInteger(a.credits) &&
        a.credits > 0 &&
        a.credits <= 100 &&
        /^owner-quality-review:[a-z0-9:-]{8,100}$/.test(a.key),
      "INVALID_INPUT",
      "Invalid bounded acceptance grant.",
    );
    const old = await ctx.db
      .query("creditPools")
      .withIndex("by_key", (q) => q.eq("key", a.key))
      .unique();
    if (old) {
      ensure(
        old.organizationId === a.organizationId &&
          old.granted === a.credits &&
          old.kind === "operator_quality_review",
        "INVALID_INPUT",
        "Acceptance grant key changed.",
      );
      return { granted: old.granted, duplicate: true };
    }
    const now = Date.now();
    const w = await wallet(ctx, a.organizationId);
    const id = await ctx.db.insert("creditPools", {
      organizationId: a.organizationId,
      key: a.key,
      kind: "operator_quality_review",
      granted: a.credits,
      spent: 0,
      reserved: 0,
      expiresAt: now + 7 * 86400000,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(w._id, {
      granted: w.granted + a.credits,
      updatedAt: now,
    });
    await audit(
      ctx,
      a.organizationId,
      owner._id,
      "operator.quality_review_credits_granted",
      id,
    );
    return { granted: a.credits, duplicate: false };
  },
});
