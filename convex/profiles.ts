import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { writeAccess, fail } from "./lib";
import { ensure, containsSecret } from "../packages/policy";
import { reserve, settle } from "./product";

export const start = mutation({
  args: { id: v.id("repositories"), key: v.string(), maxCredits: v.number() },
  handler: async (ctx, a) => {
    const repo = await ctx.db.get(a.id);
    if (!repo) fail("Repository unavailable.");
    const { actor } = await writeAccess(ctx, repo.organizationId, [
      "owner",
      "admin",
    ]);
    ensure(
      repo.enabled && !!repo.contextExcerpts?.length,
      "CONTEXT_REQUIRED",
      "Refresh an enabled repository snapshot before drafting.",
    );
    ensure(
      a.maxCredits === 10 && /^[a-zA-Z0-9_-]{12,80}$/.test(a.key),
      "QUOTE_CHANGED",
      "Review the 10-credit profile quote.",
    );
    if (
      repo.profileDraft &&
      repo.profileDraftSha === repo.sha &&
      repo.profileDraftVersion === repo.profileVersion
    )
      return { repo, cached: true, key: "" };
    ensure(
      !repo.profileDraftKey,
      "SOURCE_BUSY",
      "A profile draft is already processing. An interrupted attempt requires reconciliation.",
    );
    const key = `profile:${repo._id}:${a.key}`;
    await reserve(ctx, repo.organizationId, key, 10);
    await ctx.db.patch(repo._id, {
      profileDraftKey: key,
      profileDraftActor: actor._id,
      updatedAt: Date.now(),
    });
    return { repo, cached: false, key };
  },
});

export const finish = internalMutation({
  args: {
    id: v.id("repositories"),
    organizationId: v.id("organizations"),
    key: v.string(),
    sha: v.string(),
    version: v.number(),
    profile: v.optional(v.string()),
    credits: v.number(),
  },
  handler: async (ctx, a) => {
    const repo = await ctx.db.get(a.id);
    if (
      !repo ||
      repo.organizationId !== a.organizationId ||
      repo.profileDraftKey !== a.key
    )
      return;
    ensure(
      Number.isSafeInteger(a.credits) && a.credits >= 0 && a.credits <= 10,
      "BUDGET_EXCEEDED",
      "Profile usage exceeded its approval.",
    );
    ensure(
      a.profile === undefined ||
        (a.profile.length <= 8000 && !containsSecret(a.profile)),
      "POLICY_BLOCKED",
      "Invalid profile draft.",
    );
    const actor = repo.profileDraftActor
      ? await ctx.db.get(repo.profileDraftActor)
      : null;
    const membership = actor
      ? await ctx.db
          .query("memberships")
          .withIndex("by_pair", (q) =>
            q.eq("organizationId", repo.organizationId).eq("userId", actor._id),
          )
          .unique()
      : null;
    const organization = await ctx.db.get(repo.organizationId);
    const current =
      repo.enabled &&
      repo.sha === a.sha &&
      repo.profileVersion === a.version &&
      actor?.status === "active" &&
      organization?.status === "active" &&
      membership &&
      ["owner", "admin"].includes(membership.role);
    await settle(ctx, a.organizationId, a.key, a.credits);
    await ctx.db.patch(repo._id, {
      profileDraftKey: undefined,
      profileDraftActor: undefined,
      ...(current && a.profile !== undefined
        ? {
            profileDraft: a.profile,
            profileDraftSha: a.sha,
            profileDraftVersion: a.version,
          }
        : {}),
      updatedAt: Date.now(),
    });
    return { saved: !!current && a.profile !== undefined };
  },
});
