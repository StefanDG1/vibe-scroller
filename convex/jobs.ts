import { internal } from "./_generated/api";
import { workflow } from "./workflows";
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import { access, fail, writeAccess } from "./lib";
import { ensure, validatePaths, containsSecret } from "../packages/policy";
import { reserve, settle, digest, wallet } from "./product";
const org = { organizationId: v.id("organizations") };
async function approvalActive(
  ctx: import("./_generated/server").QueryCtx,
  run: import("./_generated/dataModel").Doc<"runs">,
) {
  const organization = await ctx.db.get(run.organizationId);
  const actor = await ctx.db.get(run.approvedBy);
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_pair", (q) =>
      q.eq("organizationId", run.organizationId).eq("userId", run.approvedBy),
    )
    .unique();
  return (
    organization?.status === "active" &&
    actor?.status === "active" &&
    !!membership &&
    ["owner", "admin", "member"].includes(membership.role)
  );
}

export const authorizeOwner = query({
  args: org,
  handler: (ctx, a) => access(ctx, a.organizationId, ["owner", "admin"]),
});
export const saveRepository = internalMutation({
  args: {
    ...org,
    installationId: v.number(),
    providerId: v.number(),
    fullName: v.string(),
    sha: v.string(),
    branch: v.string(),
    manifest: v.array(v.string()),
    context: v.string(),
    contextFiles: v.optional(v.array(v.string())),
  },
  handler: async (ctx, a) => {
    const old = await ctx.db
      .query("repositories")
      .withIndex("by_provider", (q) =>
        q.eq("organizationId", a.organizationId).eq("providerId", a.providerId),
      )
      .unique();
    if (old) {
      await ctx.db.patch(old._id, { ...a, updatedAt: Date.now() });
      return old._id;
    }
    const entitlement = await wallet(ctx, a.organizationId);
    const connected = await ctx.db
      .query("repositories")
      .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
      .collect();
    ensure(
      connected.filter((repo) => repo.enabled).length <
        (entitlement.tier === "pro" ? 15 : 3),
      "REPOSITORY_LIMIT",
      "Your repository allowance is full. Disconnect a repository before adding another.",
    );
    return ctx.db.insert("repositories", {
      ...a,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      enabled: true,
      profile:
        "Describe purpose, audience, goals, constraints and non-goals before matching.",
      profileVersion: 1,
      confirmed: false,
      status: "connected",
    });
  },
});
export const secret = internalQuery({
  args: { ...org, provider: v.string() },
  handler: (ctx, a) =>
    ctx.db
      .query("connections")
      .withIndex("by_provider", (q) =>
        q.eq("organizationId", a.organizationId).eq("provider", a.provider),
      )
      .unique(),
});
export const storeSecret = internalMutation({
  args: {
    ...org,
    provider: v.string(),
    ciphertext: v.string(),
    keyVersion: v.string(),
  },
  handler: async (ctx, a) => {
    const old = await ctx.db
      .query("connections")
      .withIndex("by_provider", (q) =>
        q.eq("organizationId", a.organizationId).eq("provider", a.provider),
      )
      .unique();
    if (old)
      await ctx.db.patch(old._id, {
        ...a,
        status: "connected",
        updatedAt: Date.now(),
      });
    else
      await ctx.db.insert("connections", {
        ...a,
        status: "connected",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
  },
});
export const connections = query({
  args: org,
  handler: async (ctx, a) => {
    await access(ctx, a.organizationId);
    const rows = await ctx.db
      .query("connections")
      .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
      .collect();
    return rows.map(({ provider, status, updatedAt }) => ({
      provider,
      status,
      updatedAt,
    }));
  },
});
export const revoke = mutation({
  args: { ...org, provider: v.string() },
  handler: async (ctx, a) => {
    await writeAccess(ctx, a.organizationId, ["owner"]);
    const rows = await ctx.db
      .query("connections")
      .withIndex("by_provider", (q) =>
        q.eq("organizationId", a.organizationId).eq("provider", a.provider),
      )
      .collect();
    for (const row of rows) await ctx.db.delete(row._id);
    const runs = await ctx.db
      .query("runs")
      .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
      .collect();
    for (const r of runs)
      if (!["completed", "canceled"].includes(r.state)) {
        await ctx.db.patch(r._id, {
          state: "canceled",
          generation: r.generation + 1,
        }); /* Preserve outstanding usage reservation until worker teardown is reconciled. */
      }
    if (a.provider === "github") {
      const repos = await ctx.db
        .query("repositories")
        .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
        .collect();
      for (const repo of repos)
        await ctx.db.patch(repo._id, {
          enabled: false,
          status: "revoked",
          context: "",
          manifest: [],
        });
    }
  },
});
export const reserveMatch = mutation({
  args: {
    id: v.id("sources"),
    repositoryId: v.id("repositories"),
    maxCredits: v.number(),
  },
  handler: async (ctx, a) => {
    const source = await ctx.db.get(a.id),
      repo = await ctx.db.get(a.repositoryId);
    if (
      !source ||
      source.state !== "ready" ||
      !repo ||
      source.organizationId !== repo.organizationId
    )
      fail("Matching context unavailable.");
    await writeAccess(ctx, source.organizationId);
    ensure(
      repo.enabled && repo.confirmed,
      "CONTEXT_REQUIRED",
      "Confirm an enabled repository's business profile first.",
    );
    ensure(
      a.maxCredits === 10,
      "QUOTE_CHANGED",
      "Review the current 10-credit quote.",
    );
    const semanticKey = `match:${source._id}:${source.generation}:${repo._id}:${repo.sha}:${repo.profileVersion}`;
    const old = await ctx.db
      .query("matchingJobs")
      .withIndex("by_key", (q) => q.eq("key", semanticKey))
      .unique();
    if (old?.proposalId)
      return {
        source,
        repo,
        key: old.reservationKey,
        semanticKey,
        cached: true,
      };
    ensure(
      old?.state !== "pending",
      "SOURCE_BUSY",
      "A matching job is already processing this context.",
    );
    const attempt = (old?.attempt ?? 0) + 1;
    ensure(
      attempt <= 3,
      "RETRY_LIMIT",
      "Matching reached its bounded retry limit. Review provider and repository context.",
    );
    const key = `${semanticKey}:attempt:${attempt}`;
    await reserve(ctx, source.organizationId, key, 10);
    if (old)
      await ctx.db.patch(old._id, {
        state: "pending",
        attempt,
        reservationKey: key,
        updatedAt: Date.now(),
      });
    else
      await ctx.db.insert("matchingJobs", {
        organizationId: source.organizationId,
        key: semanticKey,
        sourceId: source._id,
        repositoryId: repo._id,
        state: "pending",
        attempt,
        reservationKey: key,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    return { source, repo, key, semanticKey, cached: false };
  },
});
export const finishMatch = internalMutation({
  args: {
    ...org,
    key: v.string(),
    credits: v.number(),
    semanticKey: v.optional(v.string()),
    proposalId: v.optional(v.id("proposals")),
  },
  handler: async (ctx, a) => {
    await settle(ctx, a.organizationId, a.key, a.credits);
    if (a.semanticKey) {
      const job = await ctx.db
        .query("matchingJobs")
        .withIndex("by_key", (q) => q.eq("key", a.semanticKey!))
        .unique();
      if (job && job.reservationKey === a.key)
        await ctx.db.patch(job._id, {
          state: (a.proposalId ?? job.proposalId) ? "completed" : "failed",
          proposalId: a.proposalId ?? job.proposalId,
          updatedAt: Date.now(),
        });
    }
  },
});
export const approve = mutation({
  args: {
    id: v.id("proposals"),
    version: v.number(),
    planHash: v.string(),
    baseSha: v.string(),
    executor: v.string(),
    fundingRoute: v.string(),
    maxCredits: v.number(),
    allowedPaths: v.array(v.string()),
    highRisk: v.boolean(),
  },
  handler: async (ctx, a) => {
    const p = await ctx.db.get(a.id);
    if (!p) fail("Proposal unavailable.");
    const actor = await writeAccess(ctx, p.organizationId);
    const repo = await ctx.db.get(p.repositoryId);
    ensure(
      repo &&
        repo.enabled &&
        repo.confirmed &&
        repo.sha === a.baseSha &&
        p.baseSha === a.baseSha &&
        repo.profileVersion === p.profileVersion,
      "BASE_CHANGED",
      "Refresh and review the repository context.",
    );
    ensure(
      p.review === "accepted" &&
        p.plan &&
        p.version === a.version &&
        p.planHash === a.planHash,
      "APPROVAL_STALE",
      "Review the current plan version.",
    );
    ensure(
      ["local", "cloud"].includes(a.executor),
      "INVALID_INPUT",
      "Choose an executor.",
    );
    ensure(
      a.executor === "local"
        ? a.fundingRoute === "local_codex_subscription"
        : a.fundingRoute === "managed_api",
      "FUNDING_REQUIRED",
      "Choose an explicit funding route.",
    );
    ensure(
      a.executor !== "cloud" || process.env.CLOUD_VERIFIED === "true",
      "ISOLATION_UNAVAILABLE",
      "Cloud execution is waiting for its isolation and billing verification.",
    );
    ensure(
      a.executor !== "local" || process.env.LOCAL_ISOLATION_VERIFIED === "true",
      "ISOLATION_UNAVAILABLE",
      "Local execution is waiting for its Windows isolation verification.",
    );
    ensure(
      process.env[
        a.executor === "cloud" ? "DISABLE_CLOUD" : "DISABLE_LOCAL"
      ] !== "true",
      "POLICY_BLOCKED",
      "Execution is paused.",
    );
    const planPaths = p.plan.files.map((f: any) => f.path);
    ensure(
      JSON.stringify(planPaths) === JSON.stringify(a.allowedPaths),
      "APPROVAL_STALE",
      "Permitted files differ from the plan.",
    );
    validatePaths(a.allowedPaths, a.allowedPaths, a.highRisk);
    ensure(
      a.executor !== "local" || a.maxCredits === 0,
      "QUOTE_CHANGED",
      "Local subscription execution has no invented platform inference cost.",
    );
    const now = Date.now();
    const runId = await ctx.db.insert("runs", {
      organizationId: p.organizationId,
      createdAt: now,
      updatedAt: now,
      proposalId: p._id,
      repositoryId: p.repositoryId,
      approvedBy: actor.actor._id,
      planHash: a.planHash,
      baseSha: a.baseSha,
      version: a.version,
      executor: a.executor,
      fundingRoute: a.fundingRoute,
      maxCredits: a.maxCredits,
      allowedPaths: a.allowedPaths,
      highRisk: a.highRisk,
      state: a.executor === "local" ? "waiting_for_laptop" : "queued",
      generation: 1,
      expiresAt: now + 86400000,
      leaseUntil: 0,
      events: ["Exact plan and execution budget approved."],
    });
    await reserve(ctx, p.organizationId, `run:${runId}`, a.maxCredits);
    if (a.executor === "cloud")
      await workflow.start(ctx, internal.workflows.coding, {
        id: runId,
        generation: 1,
      });
    return runId;
  },
});
export const run = query({
  args: { id: v.id("runs") },
  handler: async (ctx, a) => {
    const r = await ctx.db.get(a.id);
    if (!r) fail("Run unavailable.");
    await access(ctx, r.organizationId);
    return {
      ...r,
      repo: await ctx.db.get(r.repositoryId),
      proposal: await ctx.db.get(r.proposalId),
    };
  },
});
export const cancel = mutation({
  args: { id: v.id("runs") },
  handler: async (ctx, a) => {
    const r = await ctx.db.get(a.id);
    if (!r) fail("Run unavailable.");
    await writeAccess(ctx, r.organizationId);
    ensure(
      !["publishing", "completed"].includes(r.state),
      "PUBLICATION_IN_PROGRESS",
      "Reconcile publication before cancellation.",
    );
    await ctx.db.patch(r._id, {
      state: "canceled",
      generation: r.generation + 1,
      events: [
        ...r.events,
        "Cancellation requested; stale results are rejected.",
      ],
      updatedAt: Date.now(),
    }); /* Funding stays reserved until worker termination and usage are reconciled. */
  },
});
export const authorizePublication = mutation({
  args: {
    id: v.id("runs"),
    generation: v.number(),
    patchDigest: v.string(),
    reviewNote: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const r = await ctx.db.get(a.id);
    if (!r) fail("Run unavailable.");
    await writeAccess(ctx, r.organizationId);
    ensure(
      await approvalActive(ctx, r),
      "FORBIDDEN",
      "The original execution approval is no longer authorized. Review a new plan approval.",
    );
    ensure(
      process.env.DISABLE_PUBLICATION !== "true",
      "POLICY_BLOCKED",
      "Publication is paused.",
    );
    ensure(
      ["awaiting_review", "publishing"].includes(r.state) &&
        r.generation === a.generation &&
        r.patch &&
        r.changes,
      "APPROVAL_STALE",
      "Review the current patch.",
    );
    ensure(
      (await digest(r.patch)) === a.patchDigest,
      "APPROVAL_STALE",
      "Patch changed after review.",
    );
    const p = await ctx.db.get(r.proposalId),
      repo = await ctx.db.get(r.repositoryId);
    ensure(
      p &&
        repo &&
        repo.enabled &&
        p.planHash === r.planHash &&
        repo.sha === r.baseSha,
      "BASE_CHANGED",
      "Approval context changed.",
    );
    validatePaths(
      r.changes.map((f: any) => f.path),
      r.allowedPaths,
      r.highRisk,
    );
    ensure(
      !containsSecret(r.patch),
      "POLICY_BLOCKED",
      "Patch contains a credential.",
    );
    ensure(
      !a.reviewNote ||
        (a.reviewNote.length <= 2000 && !containsSecret(a.reviewNote)),
      "POLICY_BLOCKED",
      "Publication notes must be bounded and contain no credentials.",
    );
    const report = a.reviewNote
      ? `${r.report ?? ""}\n\nReviewer publication note: ${a.reviewNote}`
      : r.report;
    await ctx.db.patch(r._id, {
      state: "publishing",
      report,
      updatedAt: Date.now(),
    });
    return {
      ...r,
      repo,
      title: p.plan?.scope?.startsWith("Synthetic staging")
        ? `Synthetic staging: ${p.title}`.slice(0, 160)
        : p.title,
      report,
      changes: r.changes as { path: string; content: string | null }[],
    };
  },
});
export const recordPR = internalMutation({
  args: {
    id: v.id("runs"),
    generation: v.number(),
    number: v.number(),
    url: v.string(),
    state: v.string(),
    mergedAt: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const r = await ctx.db.get(a.id);
    if (!r || r.generation !== a.generation || r.state !== "publishing") return;
    await ctx.db.patch(a.id, {
      state: "completed",
      prNumber: a.number,
      prUrl: a.url,
      prState: a.state,
      mergedAt: a.mergedAt,
      observedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
export const projectPR = internalMutation({
  args: {
    id: v.id("runs"),
    state: v.string(),
    mergedAt: v.optional(v.string()),
    observedAt: v.number(),
  },
  handler: async (ctx, a) => {
    const r = await ctx.db.get(a.id);
    if (!r || !r.prNumber || (r.observedAt ?? 0) > a.observedAt) return;
    await ctx.db.patch(a.id, {
      prState: a.state,
      mergedAt: a.mergedAt ?? r.mergedAt,
      observedAt: a.observedAt,
    });
  },
});
export const prRuns = internalQuery({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const rows = await ctx.db
      .query("runs")
      .withIndex("by_state", (q) => q.eq("state", "completed"))
      .paginate({ cursor: a.cursor ?? null, numItems: 50 });
    const out = [];
    for (const r of rows.page) {
      const repo = await ctx.db.get(r.repositoryId);
      if (repo && r.prNumber) out.push({ ...r, repo });
    }
    return {
      page: out,
      isDone: rows.isDone,
      continueCursor: rows.continueCursor,
    };
  },
});
export const prRun = internalQuery({
  args: { id: v.id("runs") },
  handler: async (ctx, a) => {
    const run = await ctx.db.get(a.id);
    if (!run?.prNumber) return null;
    const repo = await ctx.db.get(run.repositoryId);
    return repo ? { ...run, repo } : null;
  },
});
export const runFailure = internalMutation({
  args: { id: v.id("runs"), generation: v.number(), error: v.string() },
  handler: async (ctx, a) => {
    const r = await ctx.db.get(a.id);
    if (r && r.generation === a.generation)
      await ctx.db.patch(a.id, { error: a.error, updatedAt: Date.now() });
  },
});
// Every page rechecks ownership. Small pages bound Convex's read/response budget.
export const exportPage = query({
  args: {
    ...org,
    section: v.union(
      v.literal("sources"),
      v.literal("proposals"),
      v.literal("feedback"),
    ),
    cursor: v.union(v.string(), v.null()),
    asOf: v.number(),
  },
  handler: async (ctx, a) => {
    await access(ctx, a.organizationId, ["owner"]);
    ensure(
      Number.isSafeInteger(a.asOf) && a.asOf <= Date.now(),
      "INVALID_INPUT",
      "Invalid export timestamp.",
    );
    const rows = await ctx.db
      .query(a.section)
      .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
      .paginate({ cursor: a.cursor, numItems: 5 });
    // Preserve useful evidence metadata without exposing storage bearer capabilities.
    const redact = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(redact);
      if (value && typeof value === "object")
        return Object.fromEntries(
          Object.entries(value)
            .filter(
              ([key]) =>
                !["objectKey", "ciphertext", "signedUrl"].includes(key),
            )
            .map(([key, item]) => [key, redact(item)]),
        );
      return value;
    };
    return {
      page: rows.page
        .filter(
          (row) =>
            Math.floor(row._creationTime) <= a.asOf &&
            !("state" in row && row.state === "deleted"),
        )
        .map(redact),
      isDone: rows.isDone,
      continueCursor: rows.continueCursor,
    };
  },
});

export const workerRun = internalQuery({
  args: { id: v.id("runs") },
  handler: async (ctx, a) => {
    const run = await ctx.db.get(a.id);
    if (!run) return null;
    if (!(await approvalActive(ctx, run))) return null;
    return run;
  },
});
export const claimCloud = internalMutation({
  args: { id: v.id("runs") },
  handler: async (ctx, a) => {
    const r = await ctx.db.get(a.id);
    if (
      !r ||
      r.state !== "queued" ||
      r.executor !== "cloud" ||
      r.expiresAt < Date.now() ||
      process.env.CLOUD_VERIFIED !== "true" ||
      process.env.DISABLE_CLOUD === "true"
    )
      return null;
    const p = await ctx.db.get(r.proposalId),
      repo = await ctx.db.get(r.repositoryId);
    ensure(
      p?.planHash === r.planHash && repo?.sha === r.baseSha && repo.enabled,
      "APPROVAL_STALE",
      "Execution context changed.",
    );
    ensure(
      await approvalActive(ctx, r),
      "FORBIDDEN",
      "The approving member no longer has execution permission.",
    );
    const computeReserve = Math.min(
      Number(process.env.CLOUD_COMPUTE_RESERVE_CREDITS ?? "10000"),
      Math.floor(r.maxCredits - 1),
    );
    const rate = Number(process.env.E2B_CREDITS_PER_SECOND ?? "1");
    ensure(
      Number.isFinite(rate) &&
        rate > 0 &&
        Number.isSafeInteger(computeReserve) &&
        computeReserve >= Math.ceil(30 * rate) &&
        computeReserve < r.maxCredits,
      "INSUFFICIENT_CREDITS",
      "Review a quote that covers the full bounded compute reservation.",
    );
    const maxSeconds = Math.min(1200, Math.floor(computeReserve / rate));
    await ctx.db.patch(r._id, {
      state: "running",
      leaseUntil: Date.now() + maxSeconds * 1000,
      updatedAt: Date.now(),
    });
    return { ...r, repo, plan: p.plan, computeReserve, maxSeconds };
  },
});
export const sandboxStarted = internalMutation({
  args: { id: v.id("runs"), generation: v.number(), sandboxId: v.string() },
  handler: async (ctx, a) => {
    const r = await ctx.db.get(a.id);
    if (r && r.generation === a.generation)
      await ctx.db.patch(a.id, {
        events: [...r.events, `Isolated sandbox started: ${a.sandboxId}`],
        updatedAt: Date.now(),
      });
  },
});
export const completeCloud = internalMutation({
  args: {
    id: v.id("runs"),
    generation: v.number(),
    patch: v.string(),
    changes: v.any(),
    report: v.string(),
    credits: v.number(),
  },
  handler: async (ctx, a) => {
    const r = await ctx.db.get(a.id);
    if (
      !r ||
      r.generation !== a.generation ||
      r.state !== "running" ||
      r.leaseUntil < Date.now()
    )
      return;
    ensure(
      await approvalActive(ctx, r),
      "FORBIDDEN",
      "The original execution approval is no longer authorized.",
    );
    ensure(
      a.credits <= r.maxCredits,
      "BUDGET_EXCEEDED",
      "Measured usage exceeds approval; operator reconciliation required.",
    );
    validatePaths(
      a.changes.map((f: any) => f.path),
      r.allowedPaths,
      r.highRisk,
    );
    ensure(
      !containsSecret(a.patch) && !containsSecret(a.report),
      "POLICY_BLOCKED",
      "Artifact contains credential material.",
    );
    await settle(ctx, r.organizationId, `run:${r._id}`, a.credits);
    await ctx.db.patch(a.id, {
      patch: a.patch,
      changes: a.changes,
      report: a.report,
      state: "awaiting_review",
      updatedAt: Date.now(),
    });
  },
});
export const failCloud = internalMutation({
  args: {
    id: v.id("runs"),
    generation: v.number(),
    credits: v.number(),
    error: v.string(),
  },
  handler: async (ctx, a) => {
    const r = await ctx.db.get(a.id);
    if (!r) return;
    /* Leave reservation active until exact residual compute cost is reconciled. */ if (
      r.generation === a.generation
    )
      await ctx.db.patch(a.id, {
        state: "failed",
        error: a.error,
        updatedAt: Date.now(),
      });
  },
});
// Operator-only staging support adjustment. Customer permissions cannot call this.
export const waiveStagingFailure = internalMutation({
  args: { id: v.id("runs"), reason: v.string() },
  handler: async (ctx, a) => {
    const run = await ctx.db.get(a.id);
    ensure(
      run &&
        run.state === "failed" &&
        run.organizationId === process.env.STAGING_TEST_ORGANIZATION_ID &&
        !run.prNumber,
      "FORBIDDEN",
      "Only the configured failed staging test is eligible.",
    );
    ensure(
      a.reason.length >= 20 &&
        a.reason.length <= 1000 &&
        !containsSecret(a.reason),
      "INVALID_INPUT",
      "Record a bounded support reason.",
    );
    const key = `run:${run._id}`;
    const reservation = await ctx.db
      .query("reservations")
      .withIndex("by_key", (q) =>
        q.eq("organizationId", run.organizationId).eq("key", key),
      )
      .unique();
    if (!reservation || reservation.state !== "active") return;
    // Keep operator cost capacity reserved until provider reconciliation.
    await ctx.db.patch(reservation._id, { operatorKeys: [] });
    await settle(ctx, run.organizationId, key, 0);
    await ctx.db.patch(reservation._id, {
      operatorKeys: reservation.operatorKeys,
    });
    await ctx.db.insert("costEntries", {
      organizationId: run.organizationId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      key: `operator-unreconciled:${key}`,
      credits: 0,
      provider: "staging_support_adjustment",
      units: reservation.max,
      unitType: "reserved_service_credit_ceiling",
      costCeilingEur: reservation.max * 0.01,
      costStatus: "unreconciled_operator_hold",
    });
    await ctx.db.patch(run._id, {
      events: [
        ...run.events,
        `Staging service charge waived: ${a.reason}. Operator cost reservation remains held.`,
      ],
      updatedAt: Date.now(),
    });
  },
});

export const enqueuePR = internalMutation({
  args: {
    delivery: v.string(),
    installationId: v.number(),
    repositoryId: v.number(),
    prNumber: v.number(),
  },
  handler: async (ctx, a) => {
    const seen = await ctx.db
      .query("webhookReceipts")
      .withIndex("by_key", (q) =>
        q.eq("provider", "github").eq("key", a.delivery),
      )
      .unique();
    if (seen) return;
    const repos = await ctx.db
      .query("repositories")
      .withIndex("by_github", (q) =>
        q
          .eq("installationId", a.installationId)
          .eq("providerId", a.repositoryId),
      )
      .collect();
    for (const repo of repos) {
      for (const run of await ctx.db
        .query("runs")
        .withIndex("by_pr", (q) =>
          q.eq("repositoryId", repo._id).eq("prNumber", a.prNumber),
        )
        .collect()) {
        await ctx.scheduler.runAfter(0, internal.integrations.reconcilePRRun, {
          id: run._id,
        });
      }
    }
    await ctx.db.insert("webhookReceipts", {
      provider: "github",
      key: a.delivery,
      at: Date.now(),
      state: "queued",
    });
  },
});
