import {
  mutation,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { access, limit } from "./lib";
import { digest } from "./product";
import { ensure } from "../packages/policy";
const org = { organizationId: v.id("organizations") };
export const begin = mutation({
  args: org,
  handler: async (ctx, a) => {
    const { actor } = await access(ctx, a.organizationId, ["owner", "admin"]);
    await limit(ctx, `github-link:${actor._id}`, 5);
    const state = crypto.randomUUID() + crypto.randomUUID();
    await ctx.db.insert("githubLinks", {
      ...a,
      actor: actor._id,
      stateHash: await digest(state),
      expiresAt: Date.now() + 600000,
      consumed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return state;
  },
});
export const consume = internalMutation({
  args: { ...org, state: v.string(), actor: v.id("users") },
  handler: async (ctx, a) => {
    const hash = await digest(a.state);
    const link = await ctx.db
      .query("githubLinks")
      .withIndex("by_state", (q) => q.eq("stateHash", hash))
      .unique();
    ensure(
      link &&
        !link.consumed &&
        link.expiresAt > Date.now() &&
        link.actor === a.actor &&
        link.organizationId === a.organizationId,
      "FORBIDDEN",
      "GitHub link expired or already used.",
    );
    await ctx.db.patch(link._id, { consumed: true, updatedAt: Date.now() });
  },
});
export const save = internalMutation({
  args: {
    ...org,
    githubUserId: v.number(),
    installations: v.array(
      v.object({
        installationId: v.number(),
        repositories: v.array(
          v.object({ id: v.number(), fullName: v.string() }),
        ),
      }),
    ),
  },
  handler: async (ctx, a) => {
    for (const row of await ctx.db
      .query("githubBindings")
      .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
      .collect())
      await ctx.db.delete(row._id);
    for (const i of a.installations)
      await ctx.db.insert("githubBindings", {
        organizationId: a.organizationId,
        githubUserId: a.githubUserId,
        ...i,
        status: "connected",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
  },
});
export const binding = internalQuery({
  args: {
    ...org,
    installationId: v.number(),
    providerId: v.number(),
    fullName: v.string(),
  },
  handler: async (ctx, a) => {
    const rows = await ctx.db
      .query("githubBindings")
      .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
      .collect();
    ensure(
      rows.some(
        (r) =>
          r.status === "connected" &&
          r.installationId === a.installationId &&
          r.repositories.some(
            (repo) => repo.id === a.providerId && repo.fullName === a.fullName,
          ),
      ),
      "FORBIDDEN",
      "Link GitHub and choose a repository authorized for this workspace.",
    );
    const credential = await ctx.db
      .query("connections")
      .withIndex("by_provider", (q) =>
        q.eq("organizationId", a.organizationId).eq("provider", "github"),
      )
      .unique();
    ensure(
      credential?.status === "connected",
      "FORBIDDEN",
      "Reconnect GitHub before using this repository.",
    );
    return credential;
  },
});
export const choices = query({
  args: org,
  handler: async (ctx, a) => {
    await access(ctx, a.organizationId);
    return (
      await ctx.db
        .query("githubBindings")
        .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
        .collect()
    )
      .filter((r) => r.status === "connected")
      .flatMap((r) =>
        r.repositories.map((repo) => ({
          ...repo,
          installationId: r.installationId,
        })),
      );
  },
});
