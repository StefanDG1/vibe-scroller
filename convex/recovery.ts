import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { ensure } from "../packages/policy";
import { redactSource } from "./product";
import { rememberDeletion, subjectHash } from "./lib/deletionMarkers";
const entry = v.object({
  kind: v.union(
    v.literal("source"),
    v.literal("workspace"),
    v.literal("account"),
  ),
  target: v.string(),
  organizationId: v.optional(v.string()),
  subjectHash: v.optional(v.string()),
  at: v.number(),
});
// Only deployment administrators can call these internal endpoints. Never expose them in product routes.
export const markerPage = internalQuery({
  args: {
    section: v.union(v.literal("tombstones"), v.literal("deletionMarkers")),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, a) => {
    const rows = await ctx.db
      .query(a.section)
      .paginate({ cursor: a.cursor, numItems: 100 });
    return {
      ...rows,
      page: rows.page.map((row) =>
        "kind" in row
          ? {
              kind: row.kind,
              target: row.target,
              subjectHash: row.subjectHash,
              at: row.at,
            }
          : {
              kind: "source" as const,
              target: row.target,
              organizationId: row.organizationId,
              at: row.at,
            },
      ),
    };
  },
});
export const applyMarkers = internalMutation({
  args: { entries: v.array(entry) },
  handler: async (ctx, a) => {
    ensure(
      process.env.RESTORE_LOCK === "true",
      "POLICY_BLOCKED",
      "Apply deletion records only to a locked isolated restore deployment.",
    );
    ensure(
      a.entries.length <= 10 &&
        a.entries.every(
          (e) => Number.isSafeInteger(e.at) && e.at > 0 && e.at <= Date.now(),
        ),
      "INVALID_INPUT",
      "Invalid bounded restore manifest.",
    );
    for (const marker of a.entries) {
      if (marker.kind === "source") {
        const id = ctx.db.normalizeId("sources", marker.target),
          organizationId =
            marker.organizationId &&
            ctx.db.normalizeId("organizations", marker.organizationId);
        ensure(
          id && organizationId,
          "INVALID_INPUT",
          "Invalid source deletion identifier.",
        );
        const source = await ctx.db.get(id);
        ensure(
          !source || source.organizationId === organizationId,
          "FORBIDDEN",
          "Deletion marker belongs to another workspace.",
        );
        if (source) await redactSource(ctx, id);
        else if (
          !(await ctx.db
            .query("tombstones")
            .withIndex("by_target", (q) => q.eq("target", id))
            .first())
        )
          await ctx.db.insert("tombstones", {
            target: id,
            organizationId,
            at: marker.at,
          });
      } else if (marker.kind === "workspace") {
        const id = ctx.db.normalizeId("organizations", marker.target);
        ensure(id, "INVALID_INPUT", "Invalid workspace deletion identifier.");
        await rememberDeletion(ctx, "workspace", id, undefined, marker.at);
        const organization = await ctx.db.get(id);
        if (organization) {
          await ctx.db.patch(id, { status: "deleting" });
          await ctx.scheduler.runAfter(
            0,
            internal.maintenance.purgeOrganization,
            { organizationId: id },
          );
        }
      } else {
        const id = ctx.db.normalizeId("users", marker.target);
        ensure(
          id && marker.subjectHash && /^[a-f0-9]{64}$/.test(marker.subjectHash),
          "INVALID_INPUT",
          "Invalid account deletion marker.",
        );
        const actor = await ctx.db.get(id);
        ensure(
          !actor || (await subjectHash(actor.subject)) === marker.subjectHash,
          "FORBIDDEN",
          "Account marker identity mismatch.",
        );
        await rememberDeletion(
          ctx,
          "account",
          id,
          marker.subjectHash,
          marker.at,
        );
        if (actor) {
          for (const membership of await ctx.db
            .query("memberships")
            .withIndex("by_user", (q) => q.eq("userId", id))
            .collect())
            await ctx.db.delete(membership._id);
          await ctx.db.delete(id);
        }
      }
    }
    return { applied: a.entries.length };
  },
});

export const quarantinePage = internalMutation({
  args: {
    section: v.union(
      v.literal("connections"),
      v.literal("devices"),
      v.literal("githubLinks"),
      v.literal("githubBindings"),
      v.literal("runs"),
      v.literal("repositories"),
    ),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, a) => {
    ensure(
      process.env.RESTORE_LOCK === "true",
      "POLICY_BLOCKED",
      "Recovery quarantine requires a locked deployment.",
    );
    const page = await ctx.db
      .query(a.section)
      .paginate({ cursor: a.cursor, numItems: 25 });
    for (const row of page.page) {
      if ("fundingRoute" in row) {
        if (!["completed", "failed", "canceled"].includes(row.state))
          await ctx.db.patch(row._id, {
            state: "canceled",
            generation: row.generation + 1,
            updatedAt: Date.now(),
            events: [
              ...row.events,
              "Backup recovery canceled unpublished execution. Reconcile outstanding usage before a new approval.",
            ],
          });
      } else if ("fullName" in row)
        await ctx.db.patch(row._id, {
          enabled: false,
          status: "reconnect_required",
          context: "",
          contextExcerpts: [],
          contextTree: "",
          contextFiles: [],
          manifestEntries: [],
          snapshotSummary: undefined,
          snapshotDelta: undefined,
        });
      else await ctx.db.delete(row._id);
    }
    return {
      isDone: page.isDone,
      continueCursor: page.continueCursor,
      visited: page.page.length,
    };
  },
});
export const readiness = internalQuery({
  args: {},
  handler: async (ctx) => {
    const deleting = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("status"), "deleting"))
      .first();
    const credentials = await ctx.db.query("connections").first();
    const device = await ctx.db.query("devices").first();
    const activeRun = await ctx.db
      .query("runs")
      .filter((q) =>
        q.and(
          q.neq(q.field("state"), "completed"),
          q.neq(q.field("state"), "failed"),
          q.neq(q.field("state"), "canceled"),
        ),
      )
      .first();
    return {
      locked: process.env.RESTORE_LOCK === "true",
      quarantineComplete: !deleting && !credentials && !device && !activeRun,
      limitations:
        "Does not establish manifest freshness, restored backup integrity, external media deletion or production readiness.",
    };
  },
});
