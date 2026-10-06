export type DashboardItem = {
  id?: string;
  _id?: string;
  title?: string;
  state?: string;
  review?: string;
  fullName?: string;
  confirmed?: boolean;
  enabled?: boolean;
};
export type NextAction = {
  key: string;
  title: string;
  reason: string;
  action: string;
  destination:
    "source" | "proposal" | "projects" | "library" | "runs" | "capture";
  target?: DashboardItem;
  character: "welcome" | "waiting" | "ready" | "attention";
};
const identity = (item: DashboardItem) => item._id ?? item.id ?? "";
/** Deterministic, bounded ranking over already authorized current records. */
export function dashboardActions(input: {
  sources: DashboardItem[];
  proposals: DashboardItem[];
  repositories: DashboardItem[];
  runs: DashboardItem[];
}): NextAction[] {
  const result: NextAction[] = [];
  const failed = input.sources
    .slice(0, 30)
    .find((s) => ["failed", "unavailable", "blocked"].includes(s.state ?? ""));
  if (failed)
    result.push({
      key: `source:${identity(failed)}:${failed.state}`,
      title: "One saved post needs attention.",
      reason: "Open the saved post to see the available recovery options.",
      action: "Open saved post",
      destination: "source",
      target: failed,
      character: "attention",
    });
  const proposal = input.proposals
    .slice(0, 30)
    .find((p) => p.review === "unreviewed");
  if (proposal)
    result.push({
      key: `proposal:${identity(proposal)}:${proposal.review}`,
      title: "One idea is ready to review.",
      reason: "Your decision comes before any coding or publication.",
      action: "Review idea",
      destination: "proposal",
      target: proposal,
      character: "attention",
    });
  const project = input.repositories
    .slice(0, 30)
    .find((p) => p.enabled && !p.confirmed);
  if (project)
    result.push({
      key: `project:${identity(project)}:context`,
      title: "Give your project a clear direction.",
      reason: "Confirm or correct its context before matching ideas.",
      action: "Review project context",
      destination: "projects",
      character: "attention",
    });
  const run = input.runs
    .slice(0, 30)
    .find((r) =>
      ["awaiting_review", "checks_failed", "failed"].includes(r.state ?? ""),
    );
  if (run)
    result.push({
      key: `run:${identity(run)}:${run.state}`,
      title: "Your project work needs a decision.",
      reason: "Inspect its checks and current state before continuing.",
      action: "Review work",
      destination: "runs",
      character: "attention",
    });
  const ready = input.sources.slice(0, 30).find((s) => s.state === "ready");
  if (ready)
    result.push({
      key: `source:${identity(ready)}:ready`,
      title: "Your ideas are ready.",
      reason: "Read the source evidence and decide what is useful to you.",
      action: "Read insights",
      destination: "source",
      target: ready,
      character: "ready",
    });
  const pending = input.sources
    .slice(0, 30)
    .find((s) => ["queued", "processing"].includes(s.state ?? ""));
  if (pending)
    result.push({
      key: `source:${identity(pending)}:${pending.state}`,
      title:
        pending.state === "queued"
          ? "Saved. Waiting to analyze."
          : "Finding the useful ideas.",
      reason: "The saved post shows its actual processing state.",
      action: "Check saved post",
      destination: "source",
      target: pending,
      character: "waiting",
    });
  result.push({
    key: "capture",
    title: "Save something worth keeping.",
    reason: "A post today can become an idea you return to.",
    action: "Save a link",
    destination: "capture",
    character: "welcome",
  });
  return result;
}
