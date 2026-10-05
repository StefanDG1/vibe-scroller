import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import {
  evaluationCurrent,
  referencesCurrent,
  actorCurrent,
} from "../knowledge";
export async function improvementCurrent(ctx: QueryCtx, p: Doc<"proposals">) {
  if (!p.improvementId) return true;
  const i = await ctx.db.get(p.improvementId);
  if (
    !i ||
    i.state === "deleted" ||
    i.organizationId !== p.organizationId ||
    i.proposalId !== p._id ||
    i.repositoryId !== p.repositoryId
  )
    return false;
  const e = await ctx.db.get(i.evaluationId),
    d = await ctx.db.get(i.issueDraftId);
  return (
    !!e &&
    !!d &&
    e.organizationId === i.organizationId &&
    d.organizationId === i.organizationId &&
    d.repositoryId === i.repositoryId &&
    d.hash === i.issueHash &&
    d.version === i.issueVersion &&
    (await evaluationCurrent(ctx, e)) &&
    (await referencesCurrent(ctx, i.organizationId, i.references))
  );
}
export async function runPolicyCurrent(ctx: QueryCtx, run: Doc<"runs">) {
  if (!run.automationPolicyId) return true;
  const p = await ctx.db.get(run.automationPolicyId),
    repo = await ctx.db.get(run.repositoryId);
  return (
    process.env.RESTORE_LOCK !== "true" &&
    process.env.CONTINUOUS_VERIFIED === "true" &&
    process.env.DISABLE_CONTINUOUS !== "true" &&
    !!p &&
    p.organizationId === run.organizationId &&
    p.repositoryId === run.repositoryId &&
    p.actor === run.approvedBy &&
    p.version === run.automationPolicyVersion &&
    p.mode === "routine" &&
    !p.paused &&
    p.expiresAt > Date.now() &&
    repo?.enabled === true &&
    p.selectionVersion === (repo.selectionVersion ?? 0) &&
    (await actorCurrent(ctx, p.organizationId, p.actor, ["owner", "admin"]))
  );
}
