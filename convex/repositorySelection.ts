import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { writeAccess, limit } from "./lib";
import { ensure } from "../packages/policy";
import { wallet } from "./product";
import { actorCurrent } from "./knowledge";
const choice = v.object({
  installationId: v.number(),
  providerId: v.number(),
  fullName: v.string(),
});
export const save = mutation({
  args: {
    organizationId: v.id("organizations"),
    choices: v.array(choice),
    draftContext: v.boolean(),
    maxCredits: v.number(),
  },
  handler: async (ctx, a) => {
    const { actor } = await writeAccess(ctx, a.organizationId, [
      "owner",
      "admin",
    ]);
    await limit(ctx, `repo-selection:${a.organizationId}`, 10);
    const entitlement = await wallet(ctx, a.organizationId);
    ensure(
      a.choices.length <= (entitlement.tier === "pro" ? 15 : 3) &&
        new Set(a.choices.map((r) => r.providerId)).size === a.choices.length,
      "REPOSITORY_LIMIT",
      "Choose repositories within the existing allowance.",
    );
    const bindings = await ctx.db
      .query("githubBindings")
      .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
      .collect();
    const connection = await ctx.db
      .query("connections")
      .withIndex("by_provider", (q) =>
        q.eq("organizationId", a.organizationId).eq("provider", "github"),
      )
      .unique();
    ensure(
      connection?.status === "connected",
      "FORBIDDEN",
      "Reconnect GitHub first.",
    );
    for (const c of a.choices)
      ensure(
        bindings.some(
          (b) =>
            b.status === "connected" &&
            b.installationId === c.installationId &&
            b.repositories.some(
              (r) => r.id === c.providerId && r.fullName === c.fullName,
            ),
        ),
        "FORBIDDEN",
        "Choose only currently authorized identities.",
      );
    const old = await ctx.db
      .query("repositories")
      .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
      .collect();
    const draftCount = a.draftContext
      ? a.choices.filter(
          (c) => !old.find((r) => r.providerId === c.providerId)?.confirmed,
        ).length
      : 0;
    ensure(
      a.maxCredits === draftCount * 10,
      "QUOTE_CHANGED",
      "Review the snapshot/context batch quote. Confirmed profiles are preserved.",
    );
    const result = [];
    for (const r of old)
      if (!a.choices.some((c) => c.providerId === r.providerId)) {
        await ctx.db.patch(r._id, {
          enabled: false,
          selectionVersion: (r.selectionVersion ?? 0) + 1,
          updatedAt: Date.now(),
        });
        await ctx.scheduler.runAfter(
          0,
          internal.repositorySelection.invalidate,
          { repositoryId: r._id, cursor: null },
        );
      }
    for (const c of a.choices) {
      const previous = old.find((r) => r.providerId === c.providerId);
      const selectionVersion = (previous?.selectionVersion ?? 0) + 1;
      let id;
      if (previous) {
        id = previous._id;
        await ctx.db.patch(id, {
          ...c,
          enabled: true,
          selectionVersion,
          status: "preparing",
          updatedAt: Date.now(),
        });
      } else
        id = await ctx.db.insert("repositories", {
          ...c,
          organizationId: a.organizationId,
          selectionVersion,
          enabled: true,
          status: "preparing",
          sha: "",
          branch: "",
          profile:
            "purpose: unknown\n\naudience: unknown\n\nstage: unknown\n\ngoals: unknown\n\nbusinessModel: unknown\n\nconstraints: unknown\n\nnonGoals: unknown",
          profileVersion: 1,
          confirmed: false,
          manifest: [],
          context: "",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      result.push({
        id,
        ...c,
        selectionVersion,
        draftContext: a.draftContext && !previous?.confirmed,
        actor: actor._id,
      });
    }
    return result;
  },
});
import { internalMutation } from "./_generated/server";
export const preparationState = internalMutation({
  args: {
    id: v.id("repositories"),
    actor: v.id("users"),
    version: v.number(),
    state: v.union(
      v.literal("drafting_context"),
      v.literal("connected"),
      v.literal("needs_attention"),
    ),
  },
  handler: async (ctx, a) => {
    if (process.env.RESTORE_LOCK === "true") return;
    const repo = await ctx.db.get(a.id);
    if (
      !repo?.enabled ||
      repo.selectionVersion !== a.version ||
      !(await actorCurrent(ctx, repo.organizationId, a.actor, [
        "owner",
        "admin",
      ]))
    )
      return;
    await ctx.db.patch(repo._id, { status: a.state, updatedAt: Date.now() });
  },
});
export const invalidate = internalMutation({
  args: {
    repositoryId: v.id("repositories"),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, a) => {
    if (process.env.RESTORE_LOCK === "true") return;
    const repo = await ctx.db.get(a.repositoryId);
    if (!repo) return;
    const page = await ctx.db
      .query("proposals")
      .withIndex("by_org", (q) => q.eq("organizationId", repo.organizationId))
      .paginate({ cursor: a.cursor, numItems: 50 });
    for (const p of page.page)
      if (p.repositoryId === repo._id)
        await ctx.db.patch(p._id, {
          review: "needs_context",
          planHash: undefined,
        });
    if (!page.isDone)
      await ctx.scheduler.runAfter(0, internal.repositorySelection.invalidate, {
        ...a,
        cursor: page.continueCursor,
      });
  },
});
