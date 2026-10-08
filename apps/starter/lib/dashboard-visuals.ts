import type { DashboardItem } from "../../../packages/knowledge/dashboard";
export type VisualRecord = DashboardItem & {
  createdAt?: number;
  rightsAttested?: boolean;
  prUrl?: string;
  prState?: string;
  mergedAt?: number;
  sourceId?: string;
  proposalId?: string;
};
export function summarizeDashboard(input: {
  sources: VisualRecord[];
  proposals: VisualRecord[];
  repositories: VisualRecord[];
  runs: VisualRecord[];
}) {
  const unique = (rows: VisualRecord[]) => [
    ...new Map(
      rows.filter((r) => r._id || r.id).map((r) => [r._id ?? r.id, r]),
    ).values(),
  ];
  const sources = unique(input.sources).filter((r) => r.state !== "deleted");
  const proposals = unique(input.proposals),
    runs = unique(input.runs);
  const states = [
    {
      id: "ready",
      label: "Insights ready",
      count: sources.filter((s) => s.state === "ready").length,
    },
    {
      id: "active",
      label: "Queued or processing",
      count: sources.filter((s) =>
        ["queued", "processing"].includes(s.state ?? ""),
      ).length,
    },
    {
      id: "attention",
      label: "Needs attention",
      count: sources.filter((s) =>
        ["failed", "unavailable", "blocked", "needs_upload"].includes(
          s.state ?? "",
        ),
      ).length,
    },
  ];
  states.push({
    id: "saved",
    label: "Saved or other state",
    count: sources.length - states.reduce((n, s) => n + s.count, 0),
  });
  const reviews = [
    "unreviewed",
    "accepted",
    "rejected",
    "deferred",
    "stale",
  ].map((id) => ({
    id,
    label:
      id === "unreviewed"
        ? "Awaiting review"
        : id[0].toUpperCase() + id.slice(1),
    count: proposals.filter((p) => p.review === id).length,
  }));
  const other = proposals.length - reviews.reduce((n, r) => n + r.count, 0);
  if (other)
    reviews.push({ id: "other", label: "Other decision", count: other });
  const merged = new Set(
    runs.flatMap((r) => {
      if (!(r.prState === "merged" || r.mergedAt) || !r.prUrl) return [];
      try {
        const u = new URL(r.prUrl);
        return u.hostname === "github.com" &&
          /^\/[^/]+\/[^/]+\/pull\/\d+\/?$/.test(u.pathname)
          ? [u.pathname.replace(/\/$/, "").toLowerCase()]
          : [];
      } catch {
        return [];
      }
    }),
  ).size;
  return {
    sources: sources.length,
    proposals: proposals.length,
    runs: runs.length,
    ready: states[0].count,
    accepted: reviews.find((r) => r.id === "accepted")!.count,
    merged,
    projects: unique(input.repositories).filter((r) => r.enabled).length,
    states,
    reviews,
  };
}
export function buildDashboardTrace(input: {
  sources: VisualRecord[];
  proposals: VisualRecord[];
  runs: VisualRecord[];
}) {
  const sources = new Map(
    input.sources
      .filter((s) => s.state !== "deleted")
      .map((s) => [s._id ?? s.id, s]),
  );
  const proposals = input.proposals
    .filter((p) => p.sourceId && sources.has(p.sourceId))
    .slice(0, 5);
  const proposalIds = new Set(proposals.map((p) => p._id ?? p.id));
  const runs = input.runs
    .filter((r) => r.proposalId && proposalIds.has(r.proposalId))
    .slice(0, 5);
  return proposals.map((p) => ({
    source: sources.get(p.sourceId!)!,
    proposal: p,
    runs: runs.filter((r) => r.proposalId === (p._id ?? p.id)),
  }));
}
