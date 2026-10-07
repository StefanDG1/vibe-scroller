import { workspaceReadable } from "./lib/workspacePrivacy";
import { internalQuery } from "./_generated/server";
import { internalMutation } from "./lib/projectedMutations";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { ensure, containsSecret, validatePaths } from "../packages/policy";
import { runnerJob } from "../packages/contracts";
import { settle } from "./product";
import { limit } from "./lib";
const credential = { credentialHash: v.string() };
async function permitted(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
) {
  const organization = await ctx.db.get(organizationId),
    actor = await ctx.db.get(userId);
  const member = await ctx.db
    .query("memberships")
    .withIndex("by_pair", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId),
    )
    .unique();
  return (
    workspaceReadable(organization, userId) &&
    actor?.status === "active" &&
    !!member &&
    ["owner", "admin", "member"].includes(member.role)
  );
}
async function device(ctx: QueryCtx, hash: string) {
  ensure(
    /^[a-f0-9]{64}$/.test(hash),
    "FORBIDDEN",
    "Invalid device credential.",
  );
  const d = await ctx.db
    .query("devices")
    .withIndex("by_credential", (q) => q.eq("credentialHash", hash))
    .unique();
  ensure(
    d?.state === "paired" && (await permitted(ctx, d.organizationId, d.owner)),
    "FORBIDDEN",
    "Device has been revoked or no longer has workspace access.",
  );
  return d;
}
async function activeRun(
  ctx: QueryCtx,
  d: Doc<"devices">,
  id: Id<"runs">,
  generation: number,
) {
  ensure(
    process.env.LOCAL_ISOLATION_VERIFIED === "true" &&
      process.env.DISABLE_LOCAL !== "true" &&
      d.capabilities.includes("windows_isolation_verified") &&
      d.isolationEvidenceHash,
    "ISOLATION_UNAVAILABLE",
    "Local execution is paused or its verified device capability was revoked.",
  );
  const r = await ctx.db.get(id);
  ensure(
    r &&
      r.organizationId === d.organizationId &&
      r.deviceId === d._id &&
      r.executor === "local" &&
      r.state === "running" &&
      r.generation === generation &&
      r.leaseUntil > Date.now() &&
      (r.runtimeExpiresAt ?? 0) > Date.now() &&
      (await permitted(ctx, r.organizationId, r.approvedBy)),
    "APPROVAL_STALE",
    "The device lease or approval is no longer valid.",
  );
  const repo = await ctx.db.get(r.repositoryId),
    proposal = await ctx.db.get(r.proposalId);
  ensure(
    repo?.enabled &&
      repo.confirmed &&
      repo.sha === r.baseSha &&
      (repo.selectionVersion ?? 0) === (r.selectionVersion ?? 0) &&
      proposal?.planHash === r.planHash &&
      proposal.version === r.version &&
      proposal.profileVersion === repo.profileVersion,
    "APPROVAL_STALE",
    "Repository or plan context changed.",
  );
  return { run: r, repo, proposal };
}
export const dispatch = internalMutation({
  args: {
    ...credential,
    operation: v.union(
      v.literal("poll"),
      v.literal("heartbeat"),
      v.literal("status"),
      v.literal("fail"),
    ),
    id: v.optional(v.id("runs")),
    generation: v.optional(v.number()),
    terminated: v.optional(v.boolean()),
  },
  handler: async (ctx, a) => {
    const d = await device(ctx, a.credentialHash);
    await limit(ctx, `runner:${d._id}`, 12);
    if (a.operation === "status")
      return {
        deviceId: d._id,
        workspaceId: d.organizationId,
        state: d.state,
        capabilities: d.capabilities,
        activeRunId: d.activeRunId ?? null,
      };
    if (a.operation === "poll") {
      await ctx.db.patch(d._id, { lastSeenAt: Date.now() });
      if (
        process.env.LOCAL_ISOLATION_VERIFIED !== "true" ||
        process.env.DISABLE_LOCAL === "true" ||
        !d.capabilities.includes("windows_isolation_verified") ||
        !d.isolationEvidenceHash
      )
        return {
          lease: null,
          blocked:
            "Verified Windows isolation and device capability are required.",
        };
      const running = d.activeRunId ? await ctx.db.get(d.activeRunId) : null;
      // An expired or canceled lease is not a confirmed stopped process.
      if (running)
        return {
          lease: null,
          reconcile: {
            id: running._id,
            generation: running.generation,
            leaseUntil: running.leaseUntil,
            state: running.state,
          },
        };
      const queued = await ctx.db
        .query("runs")
        .withIndex("by_org_state", (q) =>
          q
            .eq("organizationId", d.organizationId)
            .eq("state", "waiting_for_laptop"),
        )
        .take(20);
      for (const r of queued) {
        if (r.executor !== "local") continue;
        if (
          r.expiresAt <= Date.now() ||
          !(await permitted(ctx, r.organizationId, r.approvedBy))
        ) {
          await ctx.db.patch(r._id, {
            state: "canceled",
            generation: r.generation + 1,
            updatedAt: Date.now(),
          });
          continue;
        }
        const repo = await ctx.db.get(r.repositoryId),
          p = await ctx.db.get(r.proposalId);
        if (
          !repo?.enabled ||
          !repo.confirmed ||
          repo.sha !== r.baseSha ||
          (repo.selectionVersion ?? 0) !== (r.selectionVersion ?? 0) ||
          p?.planHash !== r.planHash ||
          p.version !== r.version ||
          p.profileVersion !== repo.profileVersion
        ) {
          await ctx.db.patch(r._id, {
            state: "canceled",
            generation: r.generation + 1,
            updatedAt: Date.now(),
            error: "Review a new approval after the context changed.",
          });
          continue;
        }
        const now = Date.now(),
          generation = r.generation + 1,
          runtimeExpiresAt = now + 1200000;
        const envelope = runnerJob.parse({
          schemaVersion: "1.0.0",
          jobId: r._id,
          workspaceId: r.organizationId,
          deviceId: d._id,
          approvalId: r._id,
          repositoryId: r.repositoryId,
          baseSha: r.baseSha,
          planHash: r.planHash,
          planArtifactId: `${r.proposalId}:${r.version}`,
          leaseGeneration: generation,
          expiresAt: Math.min(r.expiresAt, runtimeExpiresAt),
          maxRuntimeSeconds: 1200,
          maxCredits: 0,
          fundingRoute: "local_codex_subscription",
          executionPolicyId: `windows-reviewed-v1:${d.isolationEvidenceHash}`,
          networkPolicyId: "official-codex-only-v1",
          allowedPaths: r.allowedPaths,
          publicationMode: "review_required",
        });
        await ctx.db.patch(r._id, {
          deviceId: d._id,
          state: "running",
          generation,
          leaseUntil: now + 90000,
          runtimeExpiresAt,
          updatedAt: now,
        });
        await ctx.db.patch(d._id, { activeRunId: r._id });
        return {
          lease: {
            envelope,
            plan: p.plan,
            repository: { id: repo.providerId, fullName: repo.fullName },
            leaseUntil: now + 90000,
          },
        };
      }
      return { lease: null };
    }
    ensure(
      a.id && Number.isSafeInteger(a.generation),
      "INVALID_INPUT",
      "A fenced run ID and generation are required.",
    );
    if (a.operation === "fail") {
      const r = await ctx.db.get(a.id);
      ensure(
        r &&
          r.deviceId === d._id &&
          r.organizationId === d.organizationId &&
          (r.generation === a.generation ||
            (r.state === "canceled" && r.generation === a.generation! + 1)) &&
          d.activeRunId === r._id &&
          a.terminated === true &&
          ["running", "canceled"].includes(r.state),
        "APPROVAL_STALE",
        "A matching termination receipt is required.",
      );
      await settle(ctx, r.organizationId, `run:${r._id}`, 0);
      await ctx.db.patch(r._id, {
        state: "failed",
        generation: r.generation + 1,
        leaseUntil: 0,
        error:
          "The local worker stopped. Review a new bounded approval before continuing.",
        updatedAt: Date.now(),
      });
      await ctx.db.patch(d._id, { activeRunId: undefined });
      return { stopped: true };
    }
    const { run } = await activeRun(ctx, d, a.id, a.generation!);
    await ctx.db.patch(run._id, {
      leaseUntil: Math.min(Date.now() + 90000, run.runtimeExpiresAt!),
      updatedAt: Date.now(),
    });
    await ctx.db.patch(d._id, { lastSeenAt: Date.now() });
    return { leaseUntil: Math.min(Date.now() + 90000, run.runtimeExpiresAt!) };
  },
});
export const resultContext = internalQuery({
  args: { ...credential, id: v.id("runs"), generation: v.number() },
  handler: async (ctx, a) =>
    activeRun(ctx, await device(ctx, a.credentialHash), a.id, a.generation),
});
export const commitResult = internalMutation({
  args: {
    ...credential,
    id: v.id("runs"),
    generation: v.number(),
    patch: v.string(),
    report: v.string(),
    changes: v.array(
      v.object({ path: v.string(), content: v.union(v.string(), v.null()) }),
    ),
  },
  handler: async (ctx, a) => {
    const { run } = await activeRun(
      ctx,
      await device(ctx, a.credentialHash),
      a.id,
      a.generation,
    );
    validatePaths(
      a.changes.map((c) => c.path),
      run.allowedPaths,
      run.highRisk,
    );
    ensure(
      a.patch.length <= 1000000 &&
        a.report.length <= 20000 &&
        !containsSecret(a.patch) &&
        !containsSecret(a.report) &&
        a.changes.every(
          (c) =>
            c.content === null ||
            (c.content.length <= 200000 && !containsSecret(c.content)),
        ),
      "POLICY_BLOCKED",
      "Artifact is oversized or contains credential material.",
    );
    await settle(ctx, run.organizationId, `run:${run._id}`, 0);
    await ctx.db.patch(run._id, {
      patch: a.patch,
      report: a.report,
      changes: a.changes,
      state: "awaiting_review",
      leaseUntil: 0,
      updatedAt: Date.now(),
    });
    const d = await device(ctx, a.credentialHash);
    await ctx.db.patch(d._id, { activeRunId: undefined });
    return {
      state: "awaiting_review",
      currencyCost: null,
      subscriptionQuota: "not reported",
    };
  },
});
