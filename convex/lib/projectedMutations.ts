import {
  mutation as rawMutation,
  internalMutation as rawInternalMutation,
  type MutationCtx,
} from "../_generated/server";
import type { DataModel } from "../_generated/dataModel";
import { Triggers } from "convex-helpers/server/triggers";
import {
  customCtx,
  customMutation,
} from "convex-helpers/server/customFunctions";
import { queueSourceCompletion, eventsEnabled } from "./assistantEvents";
import { internal } from "../_generated/api";
import { syncDashboardCard } from "./dashboardProjection";

// Use the existing helper's atomic write triggers. Failed projection writes
// abort the underlying mutation; no eventually consistent private cache.
const triggers = new Triggers<DataModel>();
for (const table of ["sources", "repositories", "proposals", "runs"] as const)
  triggers.register(table, async (ctx, change) => {
    await syncDashboardCard(
      { ...ctx, db: ctx.innerDb },
      table,
      change.id,
      change.newDoc,
    );
  });
triggers.register("sources", async (ctx, change) => {
  if (!eventsEnabled()) return;
  if (
    !change.newDoc ||
    change.newDoc.state === "deleted" ||
    !change.newDoc.rightsAttested ||
    change.oldDoc?.generation !== change.newDoc.generation
  )
    await ctx.scheduler.runAfter(0, internal.assistantEvents.invalidate, {
      sourceId: change.id,
      cursor: null,
    });
  if (!change.newDoc) return;
  for (const id of await queueSourceCompletion(
    { ...ctx, db: ctx.innerDb },
    change.newDoc,
    change.oldDoc,
  ))
    await ctx.scheduler.runAfter(0, internal.assistantEventRuntime.deliver, {
      id,
    });
});
triggers.register("assistantGrants", async (ctx, change) => {
  if (!eventsEnabled()) return;
  if (change.oldDoc)
    await ctx.scheduler.runAfter(0, internal.assistantEvents.invalidate, {
      grantId: change.id,
      cursor: null,
    });
});
triggers.register("memberships", async (ctx, change) => {
  if (!eventsEnabled()) return;
  const organizationId = change.oldDoc?.organizationId;
  if (organizationId)
    await ctx.scheduler.runAfter(0, internal.assistantEvents.invalidate, {
      organizationId,
      cursor: null,
    });
});
triggers.register("organizations", async (ctx, change) => {
  if (!eventsEnabled()) return;
  if (!change.newDoc || change.newDoc.status !== "active")
    await ctx.scheduler.runAfter(0, internal.assistantEvents.invalidate, {
      organizationId: change.id,
      cursor: null,
    });
});
triggers.register("users", async (ctx, change) => {
  if (!eventsEnabled()) return;
  if (!change.newDoc || change.newDoc.status !== "active")
    await ctx.scheduler.runAfter(0, internal.assistantEvents.invalidate, {
      actor: change.id,
      cursor: null,
    });
});
const context = customCtx((ctx: MutationCtx) => ({
  db: triggers.wrapDB(ctx).db,
}));
export const mutation = customMutation(rawMutation, context);
export const internalMutation = customMutation(rawInternalMutation, context);
