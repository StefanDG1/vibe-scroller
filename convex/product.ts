import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import { access, fail, limit, audit } from "./lib";
import { productLimits } from "./limitsV1";
import { internal } from "./_generated/api";
import { safeSourceUrl, ensure, containsSecret } from "../packages/policy";
import {
  insightOutput,
  proposalOutput,
  planInput,
} from "../packages/contracts";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { queueDeletion } from "./assets";
const org = { organizationId: v.id("organizations") };
export async function wallet(ctx: MutationCtx, id: Id<"organizations">) {
  let w = await ctx.db
    .query("wallets")
    .withIndex("by_org", (q) => q.eq("organizationId", id))
    .unique();
  if (!w) {
    const now = Date.now();
    const organization = await ctx.db.get(id);
    ensure(organization, "FORBIDDEN", "Workspace unavailable.");
    const owner = await ctx.db.get(organization.createdBy);
    ensure(
      owner?.status === "active",
      "FORBIDDEN",
      "Verified owner unavailable.",
    );
    const identityHash = await digest(
      `verified-trial:${owner.email.trim().toLowerCase()}`,
    );
    const claim = await ctx.db
      .query("trialClaims")
      .withIndex("by_identity", (q) => q.eq("identityHash", identityHash))
      .unique();
    const granted = claim ? 0 : 30;
    if (!claim)
      await ctx.db.insert("trialClaims", {
        identityHash,
        organizationId: id,
        createdAt: now,
      });
    const key = await ctx.db.insert("wallets", {
      organizationId: id,
      createdAt: now,
      updatedAt: now,
      granted,
      purchased: 0,
      spent: 0,
      reserved: 0,
      periodEnd: now + 30 * 86400000,
      tier: "trial",
      interval: "trial",
    });
    w = (await ctx.db.get(key))!;
  }
  return w;
}
export async function reserve(
  ctx: MutationCtx,
  id: Id<"organizations">,
  key: string,
  max: number,
) {
  ensure(
    Number.isSafeInteger(max) && max >= 0 && max <= 10000,
    "INVALID_BUDGET",
    "Invalid quote.",
  );
  const old = await ctx.db
    .query("reservations")
    .withIndex("by_key", (q) => q.eq("organizationId", id).eq("key", key))
    .unique();
  if (old) {
    ensure(
      old.state === "active",
      "APPROVAL_STALE",
      "This reservation is no longer active.",
    );
    return old._id;
  }
  const w = await wallet(ctx, id);
  const billing = await ctx.db
    .query("billing")
    .withIndex("by_org", (q) => q.eq("organizationId", id))
    .unique();
  ensure(
    !billing ||
      !["past_due", "unpaid", "incomplete", "paused"].includes(billing.status),
    "PAYMENT_REQUIRED",
    "New funded work is paused until the unresolved payment failure is resolved. Your library remains available.",
  );
  const month = new Date().toISOString().slice(0, 7);
  const operatorKeys = [
    `all:${month}`,
    ...(w.tier === "trial" ? [`trial:${month}`] : []),
  ];
  for (const budgetKey of operatorKeys) {
    let budget = await ctx.db
      .query("operatorBudgets")
      .withIndex("by_key", (q) => q.eq("key", budgetKey))
      .unique();
    if (!budget) {
      const budgetId = await ctx.db.insert("operatorBudgets", {
        key: budgetKey,
        ceiling: budgetKey.startsWith("trial:") ? 200 : 1000,
        reserved: 0,
        spent: 0,
        updatedAt: Date.now(),
      });
      budget = (await ctx.db.get(budgetId))!;
    }
    ensure(
      budget.spent + budget.reserved + max <= budget.ceiling,
      "OPERATOR_BUDGET_REACHED",
      "Processing is paused at the operator's monthly cost ceiling.",
    );
    await ctx.db.patch(budget._id, {
      reserved: budget.reserved + max,
      updatedAt: Date.now(),
    });
  }
  let pools = await ctx.db
    .query("creditPools")
    .withIndex("by_org", (q) => q.eq("organizationId", id))
    .collect();
  if (!pools.length && w.tier === "trial") {
    const poolId = await ctx.db.insert("creditPools", {
      organizationId: id,
      key: `trial:${id}`,
      kind: "included",
      granted: w.granted,
      spent: 0,
      reserved: 0,
      expiresAt: w.periodEnd,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    pools = [(await ctx.db.get(poolId))!];
  }
  const valid = pools
    .filter((p) => p.expiresAt === undefined || p.expiresAt > Date.now())
    .sort((a, b) => (a.expiresAt ?? Infinity) - (b.expiresAt ?? Infinity));
  ensure(
    valid.reduce((n, p) => n + p.granted - p.spent - p.reserved, 0) >= max,
    "INSUFFICIENT_CREDITS",
    "There are not enough unexpired available credits.",
  );
  let remaining = max;
  const allocations: { poolId: Id<"creditPools">; credits: number }[] = [];
  for (const pool of valid) {
    const take = Math.min(remaining, pool.granted - pool.spent - pool.reserved);
    if (take > 0) {
      allocations.push({ poolId: pool._id, credits: take });
      await ctx.db.patch(pool._id, {
        reserved: pool.reserved + take,
        updatedAt: Date.now(),
      });
      remaining -= take;
    }
    if (!remaining) break;
  }
  await ctx.db.patch(w._id, {
    reserved: w.reserved + max,
    updatedAt: Date.now(),
  });
  return ctx.db.insert("reservations", {
    organizationId: id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    key,
    max,
    settled: 0,
    state: "active",
    expiresAt: Date.now() + 86400000,
    allocations,
    operatorKeys,
  });
}
export async function settle(
  ctx: MutationCtx,
  id: Id<"organizations">,
  key: string,
  credits: number,
) {
  const x = await ctx.db
    .query("reservations")
    .withIndex("by_key", (q) => q.eq("organizationId", id).eq("key", key))
    .unique();
  if (!x || x.state !== "active") return;
  ensure(
    Number.isSafeInteger(credits) && credits >= 0 && credits <= x.max,
    "BUDGET_EXCEEDED",
    "Settlement exceeds the reservation.",
  );
  let remaining = credits;
  for (const allocation of x.allocations ?? []) {
    const pool = await ctx.db.get(allocation.poolId);
    ensure(
      pool && pool.organizationId === id && pool.reserved >= allocation.credits,
      "LEDGER_INVALID",
      "Credit-pool ownership or reservation mismatch.",
    );
    const debit = Math.min(remaining, allocation.credits);
    await ctx.db.patch(pool._id, {
      reserved: pool.reserved - allocation.credits,
      spent: pool.spent + debit,
      updatedAt: Date.now(),
    });
    remaining -= debit;
  }
  ensure(
    remaining === 0,
    "LEDGER_INVALID",
    "Settlement is not backed by allocated credits.",
  );
  const w = await wallet(ctx, id);
  for (const budgetKey of x.operatorKeys ?? []) {
    const budget = await ctx.db
      .query("operatorBudgets")
      .withIndex("by_key", (q) => q.eq("key", budgetKey))
      .unique();
    ensure(
      budget && budget.reserved >= x.max,
      "LEDGER_INVALID",
      "Operator reservation is invalid.",
    );
    await ctx.db.patch(budget._id, {
      reserved: budget.reserved - x.max,
      spent: budget.spent + credits,
      updatedAt: Date.now(),
    });
  }
  await ctx.db.patch(w._id, {
    reserved: w.reserved - x.max,
    spent: w.spent + credits,
    updatedAt: Date.now(),
  });
  await ctx.db.patch(x._id, {
    state: "settled",
    settled: credits,
    updatedAt: Date.now(),
  });
  await ctx.db.insert("costEntries", {
    organizationId: id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    key,
    credits,
    provider: "credit_settlement",
    units: credits,
    unitType: "service_credits",
    costCeilingEur: credits * 0.01,
    costStatus: credits === 0 ? "verified_zero" : "ceiling_only",
    ...(credits === 0 ? { eur: 0 } : {}),
  });
}
export const library = query({
  args: {
    ...org,
    search: v.optional(v.string()),
    state: v.optional(v.string()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    await access(ctx, a.organizationId);
    ensure(
      !a.search || a.search.length <= 200,
      "INVALID_INPUT",
      "Search is too long.",
    );
    const sourceState = [
      "saved",
      "needs_upload",
      "queued",
      "processing",
      "ready",
      "failed",
    ].includes(a.state ?? "")
      ? a.state
      : undefined;
    const disposition = [
      "no_fit",
      "already_implemented",
      "unsupported_claim",
      "needs_context",
    ].includes(a.state ?? "")
      ? a.state
      : undefined;
    ensure(
      !a.state || sourceState || disposition,
      "INVALID_INPUT",
      "Invalid source filter.",
    );
    const query = a.search?.trim()
      ? ctx.db
          .query("sources")
          .withSearchIndex("source_search", (q) => {
            const tenant = q
              .search("searchable", a.search!.trim())
              .eq("organizationId", a.organizationId);
            return sourceState
              ? tenant.eq("state", sourceState as any)
              : tenant;
          })
          .filter((q) => q.neq(q.field("state"), "deleted"))
      : ctx.db
          .query("sources")
          .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
          .order("desc")
          .filter((q) =>
            sourceState
              ? q.eq(q.field("state"), sourceState)
              : q.neq(q.field("state"), "deleted"),
          );
    const result = await query.paginate({
      numItems: 30,
      cursor: a.cursor ?? null,
    });
    const page = [];
    for (const source of result.page) {
      if (
        !disposition ||
        (
          await ctx.db
            .query("proposals")
            .withIndex("by_source", (q) => q.eq("sourceId", source._id))
            .collect()
        ).some((proposal) => proposal.detail.disposition === disposition)
      )
        page.push(source);
    }
    return {
      items: page.map(
        ({
          text: _text,
          analysis,
          objectKey: _objectKey,
          searchable: _searchable,
          ...source
        }) => ({
          ...source,
          mainPoints:
            analysis?.insights?.slice(0, 3).map((i: any) => i.title) ?? [],
        }),
      ),
      next: result.isDone ? null : result.continueCursor,
      total: result.isDone && !a.cursor ? page.length : null,
    };
  },
});
export const backfillSearch = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const result = await ctx.db
      .query("sources")
      .paginate({ numItems: 20, cursor: a.cursor ?? null });
    for (const source of result.page)
      await ctx.db.patch(source._id, {
        searchable:
          source.state === "deleted"
            ? ""
            : [source.title, source.summary, source.text, ...source.tags]
                .filter(Boolean)
                .join(" "),
      });
    if (!result.isDone)
      await ctx.scheduler.runAfter(0, internal.product.backfillSearch, {
        cursor: result.continueCursor,
      });
  },
});
export const detail = query({
  args: { id: v.id("sources") },
  handler: async (ctx, { id }) => {
    const s = await ctx.db.get(id);
    if (!s || s.state === "deleted") fail("Source unavailable.");
    await access(ctx, s.organizationId);
    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_source", (q) => q.eq("sourceId", id))
      .collect();
    return { ...s, objectKey: undefined, proposals };
  },
});
export const overview = query({
  args: org,
  handler: async (ctx, a) => {
    await access(ctx, a.organizationId);
    const [sources, proposals, runs, feedback, notifications, w] =
      await Promise.all([
        ctx.db
          .query("sources")
          .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
          .take(1000),
        ctx.db
          .query("proposals")
          .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
          .take(1000),
        ctx.db
          .query("runs")
          .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
          .take(1000),
        ctx.db
          .query("feedback")
          .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
          .take(1000),
        ctx.db
          .query("notifications")
          .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
          .order("desc")
          .take(30),
        ctx.db
          .query("wallets")
          .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
          .unique(),
      ]);
    return {
      processed: sources.filter((s) => s.state === "ready").length,
      accepted: proposals.filter((p) => p.review === "accepted").length,
      merged: new Set(runs.filter((r) => r.mergedAt).map((r) => r.prUrl)).size,
      measured: feedback.filter((f) => f.benefit !== "not_measured").length,
      pending: proposals.filter((p) => p.review === "unreviewed").length,
      runs,
      notifications,
      wallet: w,
    };
  },
});
export const capture = mutation({
  args: {
    ...org,
    key: v.string(),
    kind: v.string(),
    url: v.optional(v.string()),
    title: v.string(),
    text: v.optional(v.string()),
    objectKey: v.optional(v.string()),
    rightsAttested: v.boolean(),
  },
  handler: async (ctx, a) => {
    const actor = await access(ctx, a.organizationId, [
      "owner",
      "admin",
      "member",
    ]);
    ensure(
      process.env.DISABLE_CAPTURE !== "true",
      "POLICY_BLOCKED",
      "Capture is paused.",
    );
    await productLimits.limit(ctx, "capture", {
      key: actor.actor._id,
      throws: true,
    });
    ensure(
      a.rightsAttested,
      "RIGHTS_REQUIRED",
      "Confirm that you may submit this content.",
    );
    ensure(
      ["url", "text", "upload"].includes(a.kind) &&
        a.title.length > 0 &&
        a.title.length <= 160 &&
        a.key.length >= 8 &&
        a.key.length <= 100,
      "INVALID_INPUT",
      "Invalid capture input.",
    );
    const old = await ctx.db
      .query("sources")
      .withIndex("by_key", (q) =>
        q.eq("organizationId", a.organizationId).eq("key", a.key),
      )
      .unique();
    if (old && old.state !== "deleted") return old._id;
    let canonical =
      a.kind === "url"
        ? safeSourceUrl(a.url ?? "")
        : a.kind === "text"
          ? `text:${await digest(a.text ?? "")}`
          : `object:${a.objectKey}`;
    ensure(
      !a.text || (a.text.length <= 60000 && !containsSecret(a.text)),
      "POLICY_BLOCKED",
      "Supplied text is too large or contains a credential.",
    );
    ensure(
      a.kind !== "text" || !!a.text,
      "INVALID_INPUT",
      "Supply a transcript.",
    );
    ensure(
      a.kind !== "upload" ||
        (!!a.objectKey && a.objectKey.startsWith(`${a.organizationId}/`)),
      "FORBIDDEN",
      "Upload unavailable.",
    );
    if (a.kind === "upload") {
      const asset = await ctx.db
        .query("assets")
        .withIndex("by_key", (q) => q.eq("key", a.objectKey!))
        .unique();
      ensure(
        asset &&
          asset.organizationId === a.organizationId &&
          asset.state === "complete" &&
          asset.expiresAt !== undefined &&
          asset.expiresAt > Date.now(),
        "UPLOAD_INVALID",
        "Complete a verified upload first.",
      );
    }
    const dup = await ctx.db
      .query("sources")
      .withIndex("by_canonical", (q) =>
        q.eq("organizationId", a.organizationId).eq("canonical", canonical),
      )
      .unique();
    if (dup && dup.state !== "deleted") return dup._id;
    const w = await wallet(ctx, a.organizationId);
    const rows = await ctx.db
      .query("sources")
      .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
      .take(w.tier === "trial" ? 4 : 10001);
    ensure(
      (w.tier !== "trial" || w.granted > 0) &&
        (w.tier === "trial"
          ? rows.length
          : rows.filter((s) => s.state !== "deleted").length) <
          (w.tier === "trial" ? 3 : w.tier === "pro" ? 10000 : 1000),
      "QUOTA_EXCEEDED",
      "Source allowance reached.",
    );
    const now = Date.now();
    const id = await ctx.db.insert("sources", {
      ...a,
      canonical,
      searchable: [a.title, a.text].filter(Boolean).join(" "),
      state: a.kind === "url" ? "needs_upload" : "saved",
      coverage: a.kind === "text" ? "caption_only" : "metadata_only",
      tags: [],
      generation: 0,
      createdAt: now,
      updatedAt: now,
    });
    if (a.kind === "upload") {
      const asset = await ctx.db
        .query("assets")
        .withIndex("by_key", (q) => q.eq("key", a.objectKey!))
        .unique();
      if (asset)
        await ctx.db.patch(asset._id, { sourceId: id, updatedAt: now });
    }
    await audit(ctx, a.organizationId, actor.actor._id, "source.captured", id);
    return id;
  },
});
export async function digest(text: string) {
  const b = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(b), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
}
export const processSource = mutation({
  args: { id: v.id("sources"), maxCredits: v.number() },
  handler: async (ctx, a) => {
    const s = await ctx.db.get(a.id);
    if (!s || s.state === "deleted") fail("Source unavailable.");
    await access(ctx, s.organizationId, ["owner", "admin", "member"]);
    ensure(
      a.maxCredits === 10,
      "QUOTE_CHANGED",
      "Review the current 10-credit maximum.",
    );
    ensure(
      process.env.DISABLE_INFERENCE !== "true",
      "POLICY_BLOCKED",
      "Analysis is paused.",
    );
    ensure(
      s.state !== "needs_upload",
      "UPLOAD_REQUIRED",
      "Upload permitted media or supply a transcript.",
    );
    if (s.state === "ready" || s.state === "processing" || s.state === "queued")
      return;
    await reserve(
      ctx,
      s.organizationId,
      `source:${s._id}:${s.generation + 1}`,
      10,
    );
    await ctx.db.patch(s._id, {
      state: "queued",
      generation: s.generation + 1,
      error: undefined,
    });
    await ctx.scheduler.runAfter(
      0,
      s.kind === "upload"
        ? internal.media.analyze
        : internal.integrations.analyze,
      { id: s._id, generation: s.generation + 1 },
    );
  },
});
export const workerSource = internalQuery({
  args: { id: v.id("sources") },
  handler: (ctx, a) => ctx.db.get(a.id),
});
export const commitAnalysis = internalMutation({
  args: {
    id: v.id("sources"),
    generation: v.number(),
    output: v.optional(v.any()),
    error: v.optional(v.string()),
    credits: v.number(),
    retainReservation: v.optional(v.boolean()),
  },
  handler: async (ctx, a) => {
    const s = await ctx.db.get(a.id);
    if (!s || s.state === "deleted" || s.generation !== a.generation) return;
    let analysis: any;
    if (a.output) {
      analysis = insightOutput.parse(a.output);
      ensure(
        analysis.sourceId === s._id &&
          analysis.processingRunId === `${s._id}:${a.generation}`,
        "INVALID_EVIDENCE",
        "Wrong source reference.",
      );
      ensure(
        s.kind === "text"
          ? analysis.coverage === "caption_only"
          : s.kind === "upload" && analysis.coverage === s.mediaCoverage,
        "INVALID_EVIDENCE",
        "Analysis coverage does not match verified processing.",
      );
      const permitted = new Set(
        (s.mediaEvidence ?? []).map((e) =>
          JSON.stringify([e.kind, e.id, e.startMs, e.endMs]),
        ),
      );
      for (const i of analysis.insights)
        for (const e of i.evidence)
          ensure(
            s.kind === "text"
              ? e.id === "supplied_text" &&
                  e.kind === "user_note" &&
                  e.startMs === null &&
                  e.endMs === null
              : permitted.has(
                  JSON.stringify([e.kind, e.id, e.startMs, e.endMs]),
                ),
            "INVALID_EVIDENCE",
            "Unverified evidence reference.",
          );
    }
    if (!a.retainReservation)
      await settle(
        ctx,
        s.organizationId,
        `source:${s._id}:${a.generation}`,
        a.credits,
      );
    await ctx.db.patch(s._id, {
      state: analysis ? "ready" : "failed",
      analysis,
      summary: analysis?.summary,
      searchable: [s.title, analysis?.summary, s.text, ...s.tags]
        .filter(Boolean)
        .join(" "),
      coverage: analysis?.coverage ?? s.coverage,
      error: a.error,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("notifications", {
      organizationId: s.organizationId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      key: `source:${s._id}:${a.generation}`,
      message: analysis
        ? "A source summary is ready."
        : "A source needs attention.",
      read: false,
    });
    await ctx.scheduler.runAfter(0, internal.email.notify, {
      organizationId: s.organizationId,
      key: `source:${s._id}:${a.generation}`,
    });
  },
});
export const editSource = mutation({
  args: {
    id: v.id("sources"),
    summary: v.string(),
    tags: v.array(v.string()),
    correctedText: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const s = await ctx.db.get(a.id);
    if (!s || s.state === "deleted") fail("Source unavailable.");
    const actor = await access(ctx, s.organizationId);
    ensure(
      a.summary.length <= 1500 &&
        a.tags.length <= 20 &&
        a.tags.every((t) => t.length <= 40) &&
        (a.correctedText === undefined ||
          (a.correctedText.trim().length > 0 &&
            a.correctedText.length <= 100000)),
      "INVALID_INPUT",
      "Too much text.",
    );
    const corrected =
      a.correctedText !== undefined && a.correctedText !== s.text;
    if (corrected) {
      ensure(
        !["queued", "processing"].includes(s.state),
        "SOURCE_BUSY",
        "Wait for analysis to stop before correcting its input.",
      );
      const proposals = await ctx.db
        .query("proposals")
        .withIndex("by_source", (q) => q.eq("sourceId", s._id))
        .collect();
      const ids = new Set(proposals.map((p) => p._id));
      for (const run of await ctx.db
        .query("runs")
        .withIndex("by_org", (q) => q.eq("organizationId", s.organizationId))
        .collect()) {
        if (ids.has(run.proposalId) && !run.prNumber)
          await ctx.db.patch(run._id, {
            state: "canceled",
            generation: run.generation + 1,
            patch: undefined,
            changes: undefined,
            updatedAt: Date.now(),
          });
      }
      for (const proposal of proposals)
        await ctx.db.patch(proposal._id, {
          review: "superseded",
          planHash: undefined,
          updatedAt: Date.now(),
        });
    }
    await ctx.db.patch(s._id, {
      summary: a.summary,
      searchable: [s.title, a.summary, a.correctedText ?? s.text, ...a.tags]
        .filter(Boolean)
        .join(" "),
      tags: a.tags,
      ...(corrected
        ? {
            text: a.correctedText,
            originalText: s.originalText ?? s.text,
            correctionAuthor: actor.actor._id,
            kind: "text",
            state: "saved",
            coverage: "caption_only",
            analysis: undefined,
            mediaCoverage: undefined,
            mediaEvidence: undefined,
            generation: s.generation + 1,
            error: undefined,
          }
        : {}),
      updatedAt: Date.now(),
    });
  },
});
export const attachSource = mutation({
  args: {
    id: v.id("sources"),
    text: v.optional(v.string()),
    objectKey: v.optional(v.string()),
    rightsAttested: v.boolean(),
  },
  handler: async (ctx, a) => {
    const s = await ctx.db.get(a.id);
    ensure(s && s.state !== "deleted", "FORBIDDEN", "Source unavailable.");
    const { actor } = await access(ctx, s.organizationId);
    await limit(ctx, `source-attach:${actor._id}`, 10);
    ensure(
      a.rightsAttested && !!a.text !== !!a.objectKey,
      "RIGHTS_REQUIRED",
      "Provide one permitted transcript or verified upload and attest source rights.",
    );
    ensure(
      !["queued", "processing"].includes(s.state),
      "SOURCE_BUSY",
      "Wait for current processing to stop before replacing source input.",
    );
    if (a.text)
      ensure(
        a.text.length <= 120000 && !containsSecret(a.text),
        "INVALID_INPUT",
        "Transcript exceeds its bound or contains credentials.",
      );
    if (a.objectKey) {
      const asset = await ctx.db
        .query("assets")
        .withIndex("by_key", (q) => q.eq("key", a.objectKey!))
        .unique();
      ensure(
        asset &&
          asset.organizationId === s.organizationId &&
          asset.state === "complete" &&
          asset.expiresAt !== undefined &&
          asset.expiresAt > Date.now() &&
          (!asset.sourceId || asset.sourceId === s._id),
        "UPLOAD_INVALID",
        "Upload unavailable.",
      );
      await ctx.db.patch(asset._id, { sourceId: s._id, updatedAt: Date.now() });
    }
    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_source", (q) => q.eq("sourceId", s._id))
      .collect();
    const proposalIds = new Set(proposals.map((p) => p._id));
    for (const run of await ctx.db
      .query("runs")
      .withIndex("by_org", (q) => q.eq("organizationId", s.organizationId))
      .collect())
      if (proposalIds.has(run.proposalId) && !run.prNumber)
        await ctx.db.patch(run._id, {
          state: "canceled",
          generation: run.generation + 1,
          patch: undefined,
          changes: undefined,
          updatedAt: Date.now(),
        });
    for (const p of proposals) await ctx.db.delete(p._id);
    if (s.objectKey && s.objectKey !== a.objectKey)
      await queueDeletion(ctx, s.objectKey);
    await ctx.db.patch(s._id, {
      kind: a.text ? "text" : "upload",
      text: a.text,
      objectKey: a.objectKey,
      state: "saved",
      coverage: a.text ? "caption_only" : "metadata_only",
      summary: undefined,
      analysis: undefined,
      searchable: [s.title, a.text, ...s.tags].filter(Boolean).join(" "),
      error: undefined,
      generation: s.generation + 1,
      updatedAt: Date.now(),
    });
  },
});
export const deleteSource = mutation({
  args: { id: v.id("sources") },
  handler: async (ctx, { id }) => {
    const s = await ctx.db.get(id);
    if (!s) return;
    await access(ctx, s.organizationId);
    await redactSource(ctx, id);
  },
});
export async function redactSource(ctx: MutationCtx, id: Id<"sources">) {
  const s = await ctx.db.get(id);
  if (!s) return;
  if (
    !(await ctx.db
      .query("tombstones")
      .withIndex("by_target", (q) => q.eq("target", id))
      .first())
  )
    await ctx.db.insert("tombstones", {
      organizationId: s.organizationId,
      target: id,
      at: Date.now(),
    });
  const proposals = await ctx.db
    .query("proposals")
    .withIndex("by_source", (q) => q.eq("sourceId", id))
    .collect();
  for (const p of proposals) await ctx.db.delete(p._id);
  const runs = await ctx.db
    .query("runs")
    .withIndex("by_org", (q) => q.eq("organizationId", s.organizationId))
    .collect();
  const related = new Set(proposals.map((p) => p._id));
  for (const run of runs)
    if (related.has(run.proposalId))
      await ctx.db.patch(run._id, {
        generation: run.generation + 1,
        state: run.prNumber ? "completed" : "canceled",
        patch: undefined,
        changes: undefined,
        report: undefined,
        events: [],
        updatedAt: Date.now(),
      });
  await ctx.db.patch(id, {
    state: "deleted",
    canonical: `deleted:${id}`,
    key: `deleted:${id}`,
    title: "Deleted source",
    searchable: "",
    summary: undefined,
    text: undefined,
    analysis: undefined,
    mediaEvidence: undefined,
    mediaCoverage: undefined,
    originalText: undefined,
    correctionAuthor: undefined,
    url: undefined,
    tags: [],
    generation: s.generation + 1,
    updatedAt: Date.now(),
  });
  for (const asset of await ctx.db
    .query("assets")
    .withIndex("by_org", (q) => q.eq("organizationId", s.organizationId))
    .collect())
    if (asset.sourceId === id) await queueDeletion(ctx, asset.key);
  if (s.objectKey) await queueDeletion(ctx, s.objectKey);
}
export const repositories = query({
  args: org,
  handler: async (ctx, a) => {
    await access(ctx, a.organizationId);
    return ctx.db
      .query("repositories")
      .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
      .collect();
  },
});
export const saveProfile = mutation({
  args: {
    id: v.id("repositories"),
    profile: v.string(),
    confirmed: v.boolean(),
    enabled: v.boolean(),
  },
  handler: async (ctx, a) => {
    const repo = await ctx.db.get(a.id);
    if (!repo) fail("Repository unavailable.");
    await access(ctx, repo.organizationId, ["owner", "admin"]);
    ensure(a.profile.length <= 8000, "INVALID_INPUT", "Profile too long.");
    await ctx.db.patch(a.id, {
      profile: a.profile,
      confirmed: a.confirmed,
      enabled: a.enabled,
      profileVersion: repo.profileVersion + 1,
      updatedAt: Date.now(),
    });
    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_org", (q) => q.eq("organizationId", repo.organizationId))
      .take(1000);
    for (const p of proposals)
      if (p.repositoryId === repo._id)
        await ctx.db.patch(p._id, {
          review: "needs_context",
          planHash: undefined,
        });
  },
});
export const proposals = query({
  args: org,
  handler: async (ctx, a) => {
    await access(ctx, a.organizationId);
    return ctx.db
      .query("proposals")
      .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
      .order("desc")
      .take(100);
  },
});
export const proposal = query({
  args: { id: v.id("proposals") },
  handler: async (ctx, a) => {
    const p = await ctx.db.get(a.id);
    if (!p) fail("Proposal unavailable.");
    await access(ctx, p.organizationId);
    return { ...p, repo: await ctx.db.get(p.repositoryId) };
  },
});
export const decide = mutation({
  args: {
    id: v.id("proposals"),
    version: v.number(),
    decision: v.string(),
    note: v.string(),
    disposition: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const p = await ctx.db.get(a.id);
    if (!p) fail("Proposal unavailable.");
    const u = await access(ctx, p.organizationId);
    ensure(
      p.version === a.version,
      "APPROVAL_STALE",
      "Review the current proposal version.",
    );
    ensure(
      ["accepted", "rejected", "deferred"].includes(a.decision),
      "INVALID_INPUT",
      "Choose a decision.",
    );
    const disposition = a.disposition ?? p.disposition;
    ensure(
      [
        "relevant",
        "no_fit",
        "already_implemented",
        "unsupported_claim",
        "needs_context",
        "defer",
      ].includes(disposition),
      "INVALID_INPUT",
      "Choose a supported assessment.",
    );
    const changed = disposition !== p.disposition;
    ensure(
      !changed ||
        (a.note.trim().length >= 20 &&
          a.note.length <= 2000 &&
          !containsSecret(a.note)),
      "EVIDENCE_REQUIRED",
      "Explain the evidence for changing this assessment.",
    );
    ensure(
      a.decision !== "accepted" || disposition === "relevant",
      "CONTEXT_REQUIRED",
      "A no-fit or uncertain assessment needs an explicit, explained reviewer correction before accepting a coding proposal.",
    );
    await ctx.db.patch(p._id, {
      review: a.decision,
      disposition,
      ...(changed
        ? {
            reviewerCorrection: {
              from: p.detail.disposition,
              to: disposition,
              reason: a.note.trim(),
              actor: u.actor._id,
              at: Date.now(),
            },
            version: p.version + 1,
            planHash: undefined,
          }
        : {}),
      updatedAt: Date.now(),
    });
    await ctx.db.insert("feedback", {
      organizationId: p.organizationId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      actor: u.actor._id,
      target: p._id,
      action: a.decision,
      note: a.note.slice(0, 2000),
      benefit: "not_measured",
    });
  },
});
export const editPlan = mutation({
  args: { id: v.id("proposals"), version: v.number(), plan: v.any() },
  handler: async (ctx, a) => {
    const p = await ctx.db.get(a.id);
    if (!p) fail("Proposal unavailable.");
    await access(ctx, p.organizationId);
    ensure(
      p.version === a.version && p.review === "accepted",
      "APPROVAL_STALE",
      "Accept and review the current proposal.",
    );
    const plan = planInput.parse(a.plan);
    const repo = await ctx.db.get(p.repositoryId);
    if (!repo) fail("Repository unavailable.");
    for (const f of plan.files)
      ensure(
        f.isNew || repo.manifest.includes(f.path),
        "INVALID_EVIDENCE",
        "Existing file is absent from the snapshot.",
      );
    await ctx.db.patch(p._id, {
      plan,
      planHash: await digest(JSON.stringify(plan)),
      version: p.version + 1,
      updatedAt: Date.now(),
    });
  },
});
export const addProposal = internalMutation({
  args: {
    sourceId: v.id("sources"),
    repositoryId: v.id("repositories"),
    detail: v.any(),
    matchKey: v.optional(v.string()),
    sourceGeneration: v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    const s = await ctx.db.get(a.sourceId),
      r = await ctx.db.get(a.repositoryId);
    const matchingJob = a.matchKey
      ? await ctx.db
          .query("matchingJobs")
          .withIndex("by_key", (q) => q.eq("key", a.matchKey!))
          .unique()
      : null;
    if (matchingJob?.proposalId) return matchingJob.proposalId;
    if (
      !s ||
      s.state === "deleted" ||
      !r ||
      s.organizationId !== r.organizationId ||
      !r.enabled
    )
      return;
    ensure(
      a.sourceGeneration === undefined || s.generation === a.sourceGeneration,
      "APPROVAL_STALE",
      "Source context changed during matching.",
    );
    const d: any = proposalOutput.parse(a.detail);
    ensure(
      d.baseSha === r.sha &&
        d.repositoryId === r._id &&
        d.profileVersion === r.profileVersion,
      "BASE_CHANGED",
      "Matching context changed.",
    );
    for (const e of d.repositoryEvidence)
      ensure(
        r.manifest.includes(e.path),
        "INVALID_EVIDENCE",
        "Invented repository evidence.",
      );
    const insights = s.analysis?.insights ?? [];
    const insightIds = new Set(insights.map((i: any) => i.id));
    const evidenceKey = (e: any) =>
      JSON.stringify([e.kind, e.id, e.startMs, e.endMs]);
    const evidence = new Set(
      insights.flatMap((i: any) => i.evidence.map(evidenceKey)),
    );
    ensure(
      d.insightIds.every((id: string) => insightIds.has(id)),
      "INVALID_EVIDENCE",
      "Invented insight reference.",
    );
    ensure(
      d.sourceEvidence.every((e: any) => evidence.has(evidenceKey(e))),
      "INVALID_EVIDENCE",
      "Invented source evidence.",
    );
    const now = Date.now();
    const proposalId = await ctx.db.insert("proposals", {
      organizationId: s.organizationId,
      createdAt: now,
      updatedAt: now,
      sourceId: s._id,
      repositoryId: r._id,
      baseSha: r.sha,
      profileVersion: r.profileVersion,
      disposition: d.disposition,
      title: d.title,
      detail: d,
      review: "unreviewed",
      version: 1,
    });
    if (matchingJob)
      await ctx.db.patch(matchingJob._id, {
        proposalId,
        state: "completed",
        updatedAt: Date.now(),
      });
    return proposalId;
  },
});
export const feedback = mutation({
  args: {
    ...org,
    target: v.string(),
    action: v.string(),
    note: v.string(),
    benefit: v.string(),
  },
  handler: async (ctx, a) => {
    const u = await access(ctx, a.organizationId);
    ensure(
      ["not_measured", "positive", "negative", "inconclusive"].includes(
        a.benefit,
      ),
      "INVALID_INPUT",
      "Choose an observed outcome.",
    );
    if (a.benefit !== "not_measured")
      ensure(
        a.note.trim().length > 0,
        "EVIDENCE_REQUIRED",
        "Describe the measurement and evidence.",
      );
    return ctx.db.insert("feedback", {
      ...a,
      note: a.note.slice(0, 4000),
      actor: u.actor._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
export const usage = query({
  args: org,
  handler: async (ctx, a) => {
    await access(ctx, a.organizationId);
    return {
      pools: await ctx.db
        .query("creditPools")
        .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
        .collect(),
      wallet: await ctx.db
        .query("wallets")
        .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
        .unique(),
      reservations: await ctx.db
        .query("reservations")
        .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
        .order("desc")
        .take(100),
      entries: await ctx.db
        .query("costEntries")
        .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
        .order("desc")
        .take(100),
    };
  },
});

export const stageMedia = internalMutation({
  args: {
    id: v.id("sources"),
    generation: v.number(),
    transcript: v.string(),
    coverage: v.string(),
    evidence: v.array(
      v.object({
        kind: v.string(),
        id: v.string(),
        startMs: v.number(),
        endMs: v.number(),
      }),
    ),
  },
  handler: async (ctx, a) => {
    const source = await ctx.db.get(a.id);
    if (
      !source ||
      source.state === "deleted" ||
      source.generation !== a.generation
    )
      return false;
    ensure(
      a.transcript.length <= 60000 &&
        !containsSecret(a.transcript) &&
        ["full_sampled", "audio_only", "visual_only"].includes(a.coverage) &&
        a.evidence.length <= 224,
      "INVALID_EVIDENCE",
      "Invalid media evidence.",
    );
    for (const e of a.evidence) {
      ensure(
        ["frame", "transcript"].includes(e.kind) &&
          Number.isSafeInteger(e.startMs) &&
          Number.isSafeInteger(e.endMs) &&
          e.startMs >= 0 &&
          e.endMs >= e.startMs &&
          e.endMs <= 600000,
        "INVALID_EVIDENCE",
        "Invalid evidence timing.",
      );
      if (e.kind === "frame") {
        const id = ctx.db.normalizeId("assets", e.id),
          asset = id ? await ctx.db.get(id) : null;
        ensure(
          asset?.sourceId === source._id &&
            asset.organizationId === source.organizationId &&
            asset.state === "complete" &&
            asset.kind === "evidence",
          "INVALID_EVIDENCE",
          "Frame evidence is unavailable.",
        );
      }
    }
    await ctx.db.patch(source._id, {
      text: a.transcript,
      mediaCoverage: a.coverage,
      mediaEvidence: a.evidence,
      updatedAt: Date.now(),
    });
    return true;
  },
});
