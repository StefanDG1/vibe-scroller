"use client";
import { summarizeDashboard, type VisualRecord } from "@/lib/dashboard-visuals";
export function DashboardVisuals({
  sources,
  proposals,
  repositories,
  runs,
  go,
  compact = false,
  children,
}: {
  sources: VisualRecord[];
  proposals: VisualRecord[];
  repositories: VisualRecord[];
  runs: VisualRecord[];
  go: (view: string) => void;
  compact?: boolean;
  children?: React.ReactNode;
}) {
  const summary = summarizeDashboard({
    sources,
    proposals,
    repositories,
    runs,
  });
  const metrics = [
    {
      label: "Posts with insights",
      value: summary.ready,
      destination: "library",
      definition: `Completed analysis among ${summary.sources} loaded, non-deleted posts.`,
    },
    {
      label: "Ideas accepted",
      value: summary.accepted,
      destination: "proposals",
      definition: `Explicit acceptance among ${summary.proposals} loaded proposals. Acceptance does not mean implementation.`,
    },
    {
      label: "Merged pull requests",
      value: compact ? null : summary.merged,
      destination: "runs",
      definition: compact
        ? "Merge details are not loaded in this compact view. Open Runs to inspect authoritative PR status."
        : `Unique GitHub PR links with a recorded merge among ${summary.runs} loaded runs. A merge does not establish benefit.`,
    },
    {
      label: "Selected projects",
      value: summary.projects,
      destination: "projects",
      definition: "Enabled repositories in the loaded project records.",
    },
  ];
  const bars = (
    rows: { id: string; label: string; count: number }[],
    total: number,
  ) => (
    <ul className="dashboard-chart-rows">
      {rows.map((r) => (
        <li key={r.id} data-state={r.id}>
          <span>{r.label}</span>
          <strong>{r.count}</strong>
          <span className="dashboard-chart-track" aria-hidden="true">
            <span
              style={{ width: `${total ? (r.count / total) * 100 : 0}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <section
      className="dashboard-visuals"
      aria-labelledby="dashboard-overview-title"
    >
      <header className="row spread">
        <h2 id="dashboard-overview-title">Your library at a glance</h2>
        <button className="secondary" onClick={() => go("library")}>
          Explore ideas and connections
        </button>
      </header>
      <p className="studio-coverage">
        Loaded records in this workspace. Open each section for more.
      </p>
      <div className="dashboard-stat-strip">
        {metrics.map((m) => (
          <div key={m.label}>
            <button onClick={() => go(m.destination)}>
              <strong>
                {m.value === null ? "Not loaded" : m.value.toLocaleString("en")}
              </strong>
              <span>{m.label}</span>
            </button>
            <details>
              <summary>What this counts</summary>
              <p>{m.definition}</p>
            </details>
          </div>
        ))}
      </div>
      {children}
      <div className="dashboard-chart-grid">
        <section aria-labelledby="dashboard-posts-title">
          <h3 id="dashboard-posts-title">From saved to understood</h3>
          <p>
            {summary.sources
              ? `${summary.sources} loaded posts, grouped by current state.`
              : "No posts are loaded in this view. Open your library or save a post."}
          </p>
          {bars(summary.states, summary.sources)}
          <button className="secondary" onClick={() => go("library")}>
            Open saved posts
          </button>
        </section>
        <section aria-labelledby="dashboard-decisions-title">
          <h3 id="dashboard-decisions-title">Your project decisions</h3>
          <p>
            {summary.proposals
              ? `${summary.proposals} loaded proposals. Unreviewed ideas stay visible.`
              : "No proposals are loaded. A saved idea can be useful before it becomes project work."}
          </p>
          {bars(summary.reviews, summary.proposals)}
          <button className="secondary" onClick={() => go("proposals")}>
            Review ideas and plans
          </button>
        </section>
      </div>
      <div className="dashboard-outcome-note">
        <strong>What actually helped?</strong>
        <p>
          Record the result of a change with its evidence. Accepted ideas,
          merged PRs and measured outcomes are separate.
        </p>
        <button className="secondary" onClick={() => go("improvements")}>
          Inspect outcomes
        </button>
      </div>
    </section>
  );
}
