import { query } from "./_generated/server";
import { mutation } from "./lib/projectedMutations";
import { v } from "convex/values";
import { access, audit, limit, recentAuthentication } from "./lib";
import {
  assistantClients,
  assistantIssuer,
  assistantScopes,
} from "../packages/policy/assistant";
import { ensure } from "../packages/policy";
const binding = v.object({
  sourceId: v.id("sources"),
  generation: v.number(),
  revision: v.number(),
});
export const setup = query({
  args: {
    organizationId: v.id("organizations"),
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, a) => {
    const { actor } = await access(ctx, a.organizationId);
    const grants = await ctx.db
      .query("assistantGrants")
      .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
      .take(51);
    const sources = await ctx.db
      .query("dashboardCards")
      .withIndex("by_org_kind_updated", (q) =>
        q.eq("organizationId", a.organizationId).eq("kind", "source"),
      )
      .order("desc")
      .paginate({ cursor: a.cursor ?? null, numItems: 20 });
    const context = await ctx.db
      .query("librarySetup")
      .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
      .unique();
    return {
      enabled:
        process.env.MCP_ENABLED === "true" &&
        !!assistantIssuer(process.env.MCP_AUTH_ISSUER),
      clients: assistantClients(),
      grants: grants
        .filter((g) => g.actor === actor._id)
        .map((g) => ({
          id: g._id,
          clientId: g.clientId,
          sources: g.sources,
          scopes: g.scopes,
          contextVersion: g.contextVersion,
          intakeSpace: g.intakeSpace,
          version: g.version,
          state: g.state,
          expiresAt: g.expiresAt,
        })),
      nextCursor: sources.isDone ? null : sources.continueCursor,
      sources: sources.page
        .filter((s) => s.rightsAttested && s.state !== "deleted")
        .map((s) => ({
          sourceId: s.entityId,
          title: s.title,
          generation: s.generation,
          revision: s.updatedAt,
        })),
      context: context?.confirmed
        ? {
            version: context.version,
            goal: context.goal,
            interests: context.interests,
            role: context.role,
          }
        : null,
      coverage:
        "20 current metadata entries per page; select at most 50 posts across pages. Review evidence before selecting it.",
    };
  },
});
export const save = mutation({
  args: {
    organizationId: v.id("organizations"),
    clientId: v.string(),
    sources: v.array(binding),
    scopes: v.array(v.string()),
    contextVersion: v.optional(v.number()),
    intakeSpace: v.optional(
      v.union(v.literal("personal"), v.literal("business")),
    ),
    expectedVersion: v.number(),
    expiresAt: v.number(),
    acknowledged: v.literal(true),
  },
  handler: async (ctx, a) => {
    const { actor, organization } = await access(ctx, a.organizationId, [
      "owner",
      "admin",
      "member",
    ]);
    await recentAuthentication(ctx);
    await limit(ctx, `assistant-grant:${actor._id}`, 10);
    const client = assistantClients().find((c) => c.id === a.clientId);
    ensure(
      process.env.MCP_ENABLED === "true" && client,
      "FORBIDDEN",
      "This OAuth client is not configured.",
    );
    ensure(
      a.scopes.length > 0 &&
        a.scopes.length <= assistantScopes.length &&
        new Set(a.scopes).size === a.scopes.length &&
        a.scopes.every((s) =>
          client.scopes.includes(s as (typeof assistantScopes)[number]),
        ),
      "INVALID_INPUT",
      "Choose supported explicit scopes.",
    );
    ensure(
      a.sources.length <= 50 &&
        new Set(a.sources.map((s) => s.sourceId)).size === a.sources.length &&
        (a.sources.length > 0 ||
          a.scopes.includes("links:save") ||
          a.scopes.includes("context:read")),
      "INVALID_INPUT",
      "Select a bounded source or context grant.",
    );
    ensure(
      Number.isSafeInteger(a.expiresAt) &&
        a.expiresAt > Date.now() &&
        a.expiresAt <= Date.now() + 30 * 86400000,
      "INVALID_INPUT",
      "Choose an expiry within 30 days.",
    );
    for (const ref of a.sources) {
      const source = await ctx.db.get(ref.sourceId);
      ensure(
        source &&
          source.organizationId === a.organizationId &&
          source.state !== "deleted" &&
          source.rightsAttested &&
          source.generation === ref.generation &&
          source.updatedAt === ref.revision,
        "STALE_APPROVAL",
        "A selected post changed. Review it again.",
      );
    }
    if (a.scopes.includes("context:read")) {
      const context = await ctx.db
        .query("librarySetup")
        .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
        .unique();
      ensure(
        context?.confirmed && context.version === a.contextVersion,
        "STALE_APPROVAL",
        "Review the current stated context.",
      );
    } else
      ensure(
        a.contextVersion === undefined,
        "INVALID_INPUT",
        "Context requires a separate selected scope.",
      );
    ensure(
      !a.intakeSpace ||
        (organization.privateOwnerId === actor._id &&
          a.scopes.includes("links:save")),
      "INVALID_INPUT",
      "Choose intake filing only for your private library.",
    );
    const old = await ctx.db
      .query("assistantGrants")
      .withIndex("by_pair", (q) =>
        q
          .eq("organizationId", a.organizationId)
          .eq("actor", actor._id)
          .eq("clientId", a.clientId),
      )
      .unique();
    ensure(
      a.expectedVersion === (old?.version ?? 0),
      "STALE_APPROVAL",
      "The grant changed. Reload it.",
    );
    if (!old) {
      const count = await ctx.db
        .query("assistantGrants")
        .withIndex("by_org", (q) => q.eq("organizationId", a.organizationId))
        .take(51);
      ensure(
        count.length < 50,
        "QUOTA_EXCEEDED",
        "Workspace grant limit reached.",
      );
    }
    const record = {
      organizationId: a.organizationId,
      actor: actor._id,
      clientId: a.clientId,
      sources: a.sources,
      scopes: a.scopes,
      contextVersion: a.contextVersion,
      intakeSpace: a.intakeSpace,
      version: (old?.version ?? 0) + 1,
      state: "active" as const,
      expiresAt: a.expiresAt,
      updatedAt: Date.now(),
    };
    const id = old ? old._id : await ctx.db.insert("assistantGrants", record);
    if (old) await ctx.db.patch(id, record);
    await audit(ctx, a.organizationId, actor._id, "assistant.grant.saved", id);
    return { id, version: record.version };
  },
});
export const revoke = mutation({
  args: { id: v.id("assistantGrants"), expectedVersion: v.number() },
  handler: async (ctx, a) => {
    const grant = await ctx.db.get(a.id);
    ensure(grant, "FORBIDDEN", "Grant unavailable.");
    const { actor } = await access(ctx, grant.organizationId);
    ensure(
      grant.actor === actor._id,
      "FORBIDDEN",
      "Only the grant owner can revoke it.",
    );
    ensure(
      grant.version === a.expectedVersion,
      "STALE_APPROVAL",
      "The grant changed. Reload it.",
    );
    await ctx.db.patch(grant._id, {
      state: "revoked",
      version: grant.version + 1,
      updatedAt: Date.now(),
    });
    await audit(
      ctx,
      grant.organizationId,
      actor._id,
      "assistant.grant.revoked",
      grant._id,
    );
    return { revoked: true };
  },
});
