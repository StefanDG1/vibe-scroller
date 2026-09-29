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
export default crons;
