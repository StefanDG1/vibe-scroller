import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { role } from "./schema";
import { access, user, fail, short, limit, audit, billingFor } from "./lib";
import { internal } from "./_generated/api";
export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const actor = await user(ctx);
    await limit(ctx, `org:${actor._id}`, 5);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", actor._id))
      .take(10);
    if (memberships.length >= 10)
      fail("You can belong to at most 10 organizations.");
    const id = await ctx.db.insert("organizations", {
      name: short(name),
      status: "active",
      createdBy: actor._id,
      createdAt: Date.now(),
    });
    await ctx.db.insert("memberships", {
      organizationId: id,
      userId: actor._id,
      role: "owner",
    });
    await audit(ctx, id, actor._id, "organization.created", id);
    return id;
  },
});
export const details = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const a = await access(ctx, organizationId);
    const b = await billingFor(ctx, organizationId);
    return {
      name: a.organization.name,
      role: a.membership.role,
      billing: b
        ? { status: b.status, periodEnd: b.periodEnd, verifiedAt: b.verifiedAt }
        : null,
    };
  },
});
export const rename = mutation({
  args: { organizationId: v.id("organizations"), name: v.string() },
  handler: async (ctx, { organizationId, name }) => {
    const a = await access(ctx, organizationId, ["owner", "admin"]);
    await limit(ctx, `org-edit:${a.actor._id}`);
    await ctx.db.patch(organizationId, { name: short(name) });
    await audit(
      ctx,
      organizationId,
      a.actor._id,
      "organization.renamed",
      organizationId,
    );
  },
});
export const members = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await access(ctx, organizationId, ["owner", "admin"]);
    const rows = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();
    return Promise.all(
      rows.map(async (m) => {
        const u = await ctx.db.get(m.userId);
        return {
          id: m._id,
          name: u?.name ?? "Deleted member",
          email: u?.email ?? "",
          role: m.role,
        };
      }),
    );
  },
});
export const changeMember = mutation({
  args: {
    organizationId: v.id("organizations"),
    membershipId: v.id("memberships"),
    role: v.union(role, v.literal("remove")),
  },
  handler: async (ctx, args) => {
    const a = await access(ctx, args.organizationId, ["owner"]);
    await limit(ctx, `member:${a.actor._id}`);
    const target = await ctx.db.get(args.membershipId);
    if (!target || target.organizationId !== args.organizationId)
      fail("Member unavailable.");
    if (target.role === "owner" && args.role !== "owner") {
      const rows = await ctx.db
        .query("memberships")
        .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
        .collect();
      if (!rows.some((m) => m._id !== target._id && m.role === "owner"))
        fail("Transfer ownership before removing the last owner.");
    }
    if (args.role === "remove") await ctx.db.delete(target._id);
    else await ctx.db.patch(target._id, { role: args.role });
    await audit(
      ctx,
      args.organizationId,
      a.actor._id,
      `membership.${args.role}`,
      target.userId,
    );
  },
});
export const invite = mutation({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const a = await access(ctx, args.organizationId, ["owner", "admin"]);
    await limit(ctx, `invite:${a.actor._id}`, 10);
    if (a.membership.role === "admin" && args.role !== "member")
      fail("Only an owner can invite an admin.");
    const email = args.email.trim().toLowerCase();
    if (
      email.length > 254 ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      !/^[a-f0-9]{64}$/.test(args.tokenHash)
    )
      fail("Invalid invitation.");
    const old = await ctx.db
      .query("invitations")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    for (const inv of old) {
      if (inv.expiresAt < Date.now() || inv.email === email)
        await ctx.db.delete(inv._id);
    }
    if (
      old.filter((i) => i.expiresAt >= Date.now() && i.email !== email)
        .length >= 50
    )
      fail("Too many pending invitations.");
    await ctx.db.insert("invitations", {
      ...args,
      email,
      createdBy: a.actor._id,
      expiresAt: Date.now() + 7 * 86400000,
    });
    await audit(
      ctx,
      args.organizationId,
      a.actor._id,
      "invitation.created",
      email,
    );
  },
});
export const invitations = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await access(ctx, organizationId, ["owner", "admin"]);
    const rows = await ctx.db
      .query("invitations")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();
    return rows.map(({ _id, email, role, expiresAt }) => ({
      id: _id,
      email,
      role,
      expiresAt,
    }));
  },
});
export const revokeInvite = mutation({
  args: { organizationId: v.id("organizations"), id: v.id("invitations") },
  handler: async (ctx, { organizationId, id }) => {
    const a = await access(ctx, organizationId, ["owner", "admin"]);
    const inv = await ctx.db.get(id);
    if (!inv || inv.organizationId !== organizationId)
      fail("Invitation unavailable.");
    if (a.membership.role === "admin" && inv.role === "admin")
      fail("Only owners can change admin invitations.");
    await ctx.db.delete(id);
  },
});
export const acceptInvite = mutation({
  args: { tokenHash: v.string() },
  handler: async (ctx, { tokenHash }) => {
    const actor = await user(ctx);
    await limit(ctx, `accept:${actor._id}`, 10);
    const inv = await ctx.db
      .query("invitations")
      .withIndex("by_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (!inv || inv.expiresAt <= Date.now() || inv.email !== actor.email)
      fail("Invitation unavailable for this account.");
    const org = await ctx.db.get(inv.organizationId);
    if (!org || org.status !== "active") fail("Organization unavailable.");
    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_pair", (q) =>
        q.eq("organizationId", inv.organizationId).eq("userId", actor._id),
      )
      .unique();
    if (!existing) {
      const members = await ctx.db
        .query("memberships")
        .withIndex("by_org", (q) => q.eq("organizationId", inv.organizationId))
        .take(50);
      if (members.length >= 50) fail("Organization member limit reached.");
      const mine = await ctx.db
        .query("memberships")
        .withIndex("by_user", (q) => q.eq("userId", actor._id))
        .take(10);
      if (mine.length >= 10) fail("Organization limit reached.");
      await ctx.db.insert("memberships", {
        organizationId: inv.organizationId,
        userId: actor._id,
        role: inv.role,
      });
    }
    await ctx.db.delete(inv._id);
    await audit(
      ctx,
      inv.organizationId,
      actor._id,
      "invitation.accepted",
      actor._id,
    );
    return inv.organizationId;
  },
});
export const exportData = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const a = await access(ctx, organizationId, ["owner"]);
    return {
      schemaVersion: 1,
      organization: { name: a.organization.name },
      projects: await ctx.db
        .query("projects")
        .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
        .collect(),
    };
  },
});
export const remove = mutation({
  args: { organizationId: v.id("organizations"), confirmation: v.string() },
  handler: async (ctx, { organizationId, confirmation }) => {
    const a = await access(ctx, organizationId, ["owner"]);
    if (confirmation !== a.organization.name)
      fail("Type the organization name to confirm.");
    const b = await billingFor(ctx, organizationId);
    if (b && b.status !== "canceled" && b.status !== "free")
      fail(
        "Cancel the subscription and refresh billing before deleting this organization.",
      );
    await ctx.db.patch(organizationId, { status: "deleting" });
    await ctx.scheduler.runAfter(0, internal.maintenance.purgeOrganization, {
      organizationId,
    });
    return { status: "deleting" };
  },
});
export const auditLog = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await access(ctx, organizationId, ["owner", "admin"]);
    return ctx.db
      .query("audit")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .take(50);
  },
});
