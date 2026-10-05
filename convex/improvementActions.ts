"use node";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { ensure, sensitivePath } from "../packages/policy";
export const refresh = action({
  args: { id: v.id("runs") },
  handler: async (ctx, a): Promise<void> => {
    await ctx.runQuery(api.jobs.run, a);
    await ctx.runAction(api.integrations.refreshPR, a);
    await ctx.runAction(internal.improvementAutomation.deployment, a);
  },
});
export const start = action({
  args: {
    issueId: v.id("issueDrafts"),
    goal: v.string(),
    maxCredits: v.number(),
  },
  handler: async (ctx, a): Promise<string> => {
    ensure(
      a.maxCredits === 10,
      "QUOTE_CHANGED",
      "Review the current planning quote.",
    );
    const id = await ctx.runMutation(api.improvements.create, {
      issueId: a.issueId,
      goal: a.goal,
    });
    const c = await ctx.runQuery(api.improvements.context, { id });
    await ctx.runAction(api.integrations.draftPlan, {
      id: c.proposal._id,
      version: c.proposal.version,
      maxCredits: a.maxCredits,
    });
    return id;
  },
});
export const execute = action({
  args: {
    id: v.id("improvements"),
    version: v.number(),
    maxCredits: v.number(),
    approveProtected: v.boolean(),
  },
  handler: async (ctx, a): Promise<string> => {
    let c = await ctx.runQuery(api.improvements.context, { id: a.id });
    ensure(
      c.improvement.version === a.version,
      "APPROVAL_STALE",
      "Review the current improvement.",
    );
    if (!c.proposal.plan) {
      ensure(
        c.proposal.planDraft &&
          c.proposal.planDraftVersion === c.proposal.version,
        "CONTEXT_REQUIRED",
        "Wait for the implementation plan.",
      );
      await ctx.runMutation(api.product.editPlan, {
        id: c.proposal._id,
        version: c.proposal.version,
        plan: c.proposal.planDraft,
      });
      c = await ctx.runQuery(api.improvements.context, { id: a.id });
    }
    const paths = c.proposal.plan.files.map((f: any) => f.path),
      highRisk = paths.some(sensitivePath);
    ensure(
      !highRisk || a.approveProtected,
      "POLICY_BLOCKED",
      "This plan changes protected areas and needs owner review.",
    );
    return ctx.runMutation(api.jobs.approve, {
      id: c.proposal._id,
      version: c.proposal.version,
      planHash: c.proposal.planHash!,
      baseSha: c.proposal.baseSha,
      executor: "cloud",
      fundingRoute: "managed_api",
      maxCredits: a.maxCredits,
      allowedPaths: paths,
      highRisk,
    });
  },
});
