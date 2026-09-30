import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.daily(
  "Clean ephemeral records",
  { hourUTC: 3, minuteUTC: 0 },
  internal.maintenance.cleanup,
);
crons.interval(
  "Reconcile subscriptions",
  { hours: 1 },
  internal.payments.reconcile,
  {},
);
crons.interval(
  "Reconcile draft PRs",
  { minutes: 15 },
  internal.integrations.reconcilePRs,
  {},
);
crons.interval(
  "Reconcile VibeScroller entitlements",
  { hours: 1 },
  internal.reconciliation.allBilling,
  {},
);
crons.interval(
  "Expire objects and apply deletion tombstones",
  { hours: 1 },
  internal.privacy.sweep,
  {},
);
export default crons;
