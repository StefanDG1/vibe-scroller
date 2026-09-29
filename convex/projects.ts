import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { access, fail, short, limit, audit, billingFor, paid } from "./lib";
import { company, isPaid } from "../packages/company-config";
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await access(ctx, organizationId);
    return ctx.db
      .query("projects")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .take(100);
  },
});
export const get = query({
  args: { organizationId: v.id("organizations"), id: v.id("projects") },
  handler: async (ctx, { organizationId, id }) => {
    await access(ctx, organizationId);
    const p = await ctx.db.get(id);
    if (!p || p.organizationId !== organizationId) fail("Project unavailable.");
    return p;
  },
});
export const save = mutation({
  args: {
    organizationId: v.id("organizations"),
    id: v.optional(v.id("projects")),
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const a = await access(ctx, args.organizationId, ["owner", "admin"]);
    await limit(ctx, `project:${a.actor._id}`);
    const name = short(args.name);
    if (args.description.length > 2000)
      fail("Description must be 2,000 characters or fewer.");
    if (args.id) {
      const old = await ctx.db.get(args.id);
      if (!old || old.organizationId !== args.organizationId)
        fail("Project unavailable.");
      await ctx.db.patch(args.id, {
        name,
        description: args.description.trim(),
        updatedAt: Date.now(),
      });
      await audit(
        ctx,
        args.organizationId,
        a.actor._id,
        "project.updated",
        args.id,
      );
      return args.id;
    }
    const rows = await ctx.db
      .query("projects")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .take(100);
    const plan = isPaid(await billingFor(ctx, args.organizationId))
      ? "pro"
      : "free";
    if (rows.length >= company.plans[plan].projects)
      fail("Project limit reached for this plan.");
    const id = await ctx.db.insert("projects", {
      organizationId: args.organizationId,
      name,
      description: args.description.trim(),
      createdBy: a.actor._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await audit(ctx, args.organizationId, a.actor._id, "project.created", id);
    return id;
  },
});
export const remove = mutation({
  args: { organizationId: v.id("organizations"), id: v.id("projects") },
  handler: async (ctx, { organizationId, id }) => {
    const a = await access(ctx, organizationId, ["owner", "admin"]);
    await limit(ctx, `project:${a.actor._id}`);
    const p = await ctx.db.get(id);
    if (!p || p.organizationId !== organizationId) fail("Project unavailable.");
    await ctx.db.delete(id);
    await audit(ctx, organizationId, a.actor._id, "project.deleted", id);
  },
});
export const report = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await access(ctx, organizationId, ["owner", "admin"]);
    await paid(ctx, organizationId);
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .take(100);
    return {
      generatedAt: Date.now(),
      count: projects.length,
      projects: projects.map((p) => ({
        name: p.name,
        description: p.description,
        updatedAt: p.updatedAt,
      })),
    };
  },
});
