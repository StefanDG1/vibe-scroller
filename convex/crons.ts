import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.interval(
  "Recover full library scans",
  { minutes: 5 },
  internal.libraryScanWorker.recover,
  {},
);
crons.interval(
  "Advance reviewed improvements",
  { minutes: 5 },
  internal.improvementAutomation.recover,
  {},
);
for (const kind of ["media", "coding"] as const) {
  crons.interval(
    `Renew clean ${kind} tool snapshot`,
    { hours: 6 },
    internal.toolMaintenance.renew,
    { kind },
  );
}
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
crons.interval(
  "Reconcile reviewed issues",
  { minutes: 15 },
  internal.issues.reconcilePage,
  {},
);
crons.interval(
  "Recover knowledge dispatch",
  { minutes: 5 },
  internal.knowledge.recoverPage,
  {},
);
export default crons;
