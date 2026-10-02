import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ensure, containsSecret } from "../packages/policy";
import { writeAccess, fail } from "./lib";
import { reserve, settle, digest } from "./product";
import { selectionCurrent } from "../packages/repositories/selection";
import { selectedInsights } from "../packages/insights/scope";
const candidate = v.object({
  repositoryId: v.id("repositories"),
  reason: v.string(),
});
export const start = mutation({
  args: {
    id: v.id("sources"),
    insightId: v.optional(v.string()),
    insightIds: v.optional(v.array(v.string())),
    maxCredits: v.number(),
    key: v.string(),
  },
  handler: async (ctx, a) => {
    const source = await ctx.db.get(a.id);
    if (!source) fail("Source unavailable.");
    const { actor } = await writeAccess(ctx, source.organizationId);
    const insights = selectedInsights(
      source.analysis?.insights ?? [],
      a.insightIds ?? (a.insightId ? [a.insightId] : undefined),
    );
    const insight = insights[0];
    ensure(
      source.state === "ready" && insight,
      "CONTEXT_REQUIRED",
      "Choose an existing supported main point.",
    );
    ensure(
      a.maxCredits === 10 && /^[a-zA-Z0-9_-]{12,80}$/.test(a.key),
      "QUOTE_CHANGED",
      "Review the 10-credit repository selection quote.",
    );
    const repositories = (
      await ctx.db
        .query("repositories")
        .withIndex("by_org", (q) =>
          q.eq("organizationId", source.organizationId),
        )
        .collect()
    )
      .filter((repo) => repo.enabled && repo.confirmed)
      .sort((x, y) => x._id.localeCompare(y._id));
    ensure(
      repositories.length <= 15,
      "REPOSITORY_LIMIT",
      "Review a bounded repository selection.",
    );
    const bases = repositories.map((repo) => ({
      repositoryId: repo._id,
      sha: repo.sha,
      profileVersion: repo.profileVersion,
    }));
    const semanticKey = await digest(
      JSON.stringify({
        source: source._id,
        generation: source.generation,
        insights,
        bases,
        version: "semantic-profile-selection-v2",
      }),
    );
    if (
      source.repositorySelection?.key === semanticKey &&
      selectionCurrent(source.repositorySelection, source, repositories)
    )
      return {
        cached: true,
        source,
        insight,
        insights,
        repositories,
        bases,
        semanticKey,
        key: "",
      };
    ensure(
      !source.selectionPendingKey,
      "SOURCE_BUSY",
      "Repository selection is already pending; an interrupted request requires reconciliation.",
    );
    const key = `selection:${source._id}:${a.key}`;
    await reserve(ctx, source.organizationId, key, 10);
    await ctx.db.patch(source._id, {
      selectionPendingKey: key,
      selectionActor: actor._id,
    });
    return {
      cached: false,
      source,
      insight,
      insights,
      repositories,
      bases,
      semanticKey,
      key,
    };
  },
});
export const finish = internalMutation({
  args: {
    id: v.id("sources"),
    key: v.string(),
    semanticKey: v.string(),
    generation: v.number(),
    insightId: v.optional(v.string()),
    insightIds: v.optional(v.array(v.string())),
    bases: v.array(
      v.object({
        repositoryId: v.id("repositories"),
        sha: v.string(),
        profileVersion: v.number(),
      }),
    ),
    candidates: v.optional(v.array(candidate)),
    noFitReason: v.optional(v.string()),
    credits: v.number(),
  },
  handler: async (ctx, a) => {
    const source = await ctx.db.get(a.id);
    if (!source || source.selectionPendingKey !== a.key) return;
    ensure(
      Number.isSafeInteger(a.credits) && a.credits >= 0 && a.credits <= 10,
      "BUDGET_EXCEEDED",
      "Selection usage exceeded its quote.",
    );
    ensure(
      !a.candidates ||
        (a.candidates.length <= 5 &&
          new Set(a.candidates.map((item) => item.repositoryId)).size ===
            a.candidates.length &&
          a.candidates.every(
            (item) =>
              a.bases.some((base) => base.repositoryId === item.repositoryId) &&
              item.reason.length > 0 &&
              item.reason.length <= 500 &&
              !containsSecret(item.reason),
          )),
      "INVALID_EVIDENCE",
      "Invalid repository shortlist.",
    );
    ensure(
      a.noFitReason === undefined ||
        (a.noFitReason.length <= 500 && !containsSecret(a.noFitReason)),
      "INVALID_EVIDENCE",
      "Invalid selection explanation.",
    );
    ensure(
      a.candidates === undefined ||
        a.candidates.length > 0 ||
        !!a.noFitReason?.trim(),
      "INVALID_EVIDENCE",
      "An empty shortlist needs an honest explanation.",
    );
    const actor =
      source.selectionActor && (await ctx.db.get(source.selectionActor));
    const membership =
      actor &&
      (await ctx.db
        .query("memberships")
        .withIndex("by_pair", (q) =>
          q.eq("organizationId", source.organizationId).eq("userId", actor._id),
        )
        .unique());
    const organization = await ctx.db.get(source.organizationId);
    const repositories = await ctx.db
      .query("repositories")
      .withIndex("by_org", (q) => q.eq("organizationId", source.organizationId))
      .collect();
    const selection = {
      key: a.semanticKey,
      generation: a.generation,
      insightId: a.insightId,
      insightIds: a.insightIds ?? (a.insightId ? [a.insightId] : undefined),
      bases: a.bases,
      candidates: a.candidates ?? [],
      noFitReason: a.noFitReason ?? "",
    };
    const valid =
      source.state === "ready" &&
      actor?.status === "active" &&
      organization?.status === "active" &&
      membership &&
      ["owner", "admin", "member"].includes(membership.role) &&
      selectionCurrent(selection, source, repositories);
    await settle(ctx, source.organizationId, a.key, a.credits);
    await ctx.db.patch(source._id, {
      selectionPendingKey: undefined,
      selectionActor: undefined,
      ...(valid && a.candidates ? { repositorySelection: selection } : {}),
    });
  },
});
