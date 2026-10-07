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
const context = customCtx((ctx: MutationCtx) => ({
  db: triggers.wrapDB(ctx).db,
}));
export const mutation = customMutation(rawMutation, context);
export const internalMutation = customMutation(rawInternalMutation, context);
