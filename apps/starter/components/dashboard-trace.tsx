"use client";
import { ArrowDown, Bookmark, GitBranch, GitPullRequest } from "lucide-react";
import {
  buildDashboardTrace,
  type VisualRecord,
} from "@/lib/dashboard-visuals";
export function DashboardTrace({
  sources,
  proposals,
  runs,
  onOpenSource,
  onOpenProposal,
  go,
}: {
  sources: VisualRecord[];
  proposals: VisualRecord[];
  runs: VisualRecord[];
  onOpenSource: (source: VisualRecord) => void;
  onOpenProposal: (proposal: VisualRecord) => void;
  go: (view: string) => void;
}) {
  const traces = buildDashboardTrace({ sources, proposals, runs });
  return (
    <section
      className="dashboard-trace"
      aria-labelledby="dashboard-trace-title"
    >
      <header className="row spread">
        <h3 id="dashboard-trace-title">Where your ideas went</h3>
        <button className="secondary" onClick={() => go("library")}>
          Explore library
        </button>
      </header>
      <p className="studio-coverage">
        Recorded links in loaded records · up to five proposals
      </p>
      {traces.length ? (
        <ul className="atlas-traces">
          {traces.map((trace) => (
            <li key={trace.proposal._id ?? trace.proposal.id}>
              <button onClick={() => onOpenSource(trace.source)}>
                <Bookmark size={20} aria-hidden="true" />
                <span>
                  <small>Saved post</small>
                  <strong>{trace.source.title ?? "Saved post"}</strong>
                </span>
              </button>
              <ArrowDown
                className="atlas-trace-arrow"
                size={18}
                aria-hidden="true"
              />
              <button onClick={() => onOpenProposal(trace.proposal)}>
                <GitBranch size={20} aria-hidden="true" />
                <span>
                  <small>
                    Project proposal ·{" "}
                    {trace.proposal.review?.replaceAll("_", " ") ??
                      "Decision unknown"}
                  </small>
                  <strong>{trace.proposal.title ?? "Project proposal"}</strong>
                </span>
              </button>
              {trace.runs.length > 0 && (
                <>
                  <ArrowDown
                    className="atlas-trace-arrow"
                    size={18}
                    aria-hidden="true"
                  />
                  <button onClick={() => go("runs")}>
                    <GitPullRequest size={20} aria-hidden="true" />
                    <span>
                      <small>Recorded work</small>
                      <strong>
                        {trace.runs
                          .map(
                            (run) =>
                              run.state?.replaceAll("_", " ") ??
                              "Status unavailable",
                          )
                          .join(", ")}
                      </strong>
                    </span>
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="studio-empty">
          Your saved ideas will connect to project proposals here when a
          reviewed evaluation records a link.
        </p>
      )}
      <details>
        <summary>What these links mean</summary>
        <p>
          A line records provenance. It does not grant approval or establish
          benefit. Missing work on this page means no linked run is loaded, not
          that none exists.
        </p>
      </details>
    </section>
  );
}
