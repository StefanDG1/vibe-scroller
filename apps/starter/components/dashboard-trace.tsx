"use client";
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
          Open knowledge maps
        </button>
      </header>
      <p className="studio-coverage">
        Recorded links from loaded posts to their project proposals and runs. Up
        to five proposals are shown. A line records provenance, not approval or
        a useful outcome.
      </p>
      {traces.length ? (
        <>
          {/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Keyboard scrolling is an alternative to touch panning. */}
          <div
            className="dashboard-trace-viewport"
            tabIndex={0}
            aria-label="Source to project diagram. Scroll across or use the readable links below."
          >
            <div
              className="dashboard-trace-surface"
              style={{ height: 60 + traces.length * 150 }}
            >
              <div className="dashboard-trace-headings" aria-hidden="true">
                <span>Saved post</span>
                <span>Project idea</span>
                <span>Recorded work</span>
              </div>
              <svg
                aria-hidden="true"
                viewBox={`0 0 900 ${60 + traces.length * 150}`}
              >
                {traces.map((t, i) => (
                  <g key={t.proposal._id ?? t.proposal.id}>
                    <path d={`M 230 ${110 + i * 150} H 340`} />
                    {t.runs.length > 0 && (
                      <path d={`M 560 ${110 + i * 150} H 670`} />
                    )}
                  </g>
                ))}
              </svg>
              {traces.map((t, i) => (
                <div key={t.proposal._id ?? t.proposal.id}>
                  <button
                    data-stage="source"
                    style={{ left: 20, top: 64 + i * 150 }}
                    onClick={() => onOpenSource(t.source)}
                  >
                    <strong>{t.source.title ?? "Saved post"}</strong>
                    <span>
                      {t.source.state?.replaceAll("_", " ") ?? "Saved"}
                    </span>
                  </button>
                  <button
                    data-stage="proposal"
                    style={{ left: 340, top: 64 + i * 150 }}
                    onClick={() => onOpenProposal(t.proposal)}
                  >
                    <strong>{t.proposal.title ?? "Project idea"}</strong>
                    <span>
                      {t.proposal.review?.replaceAll("_", " ") ??
                        "Decision unknown"}
                    </span>
                  </button>
                  {t.runs.length ? (
                    <button
                      data-stage="run"
                      style={{ left: 670, top: 64 + i * 150 }}
                      onClick={() => go("runs")}
                    >
                      <strong>
                        {t.runs.length}{" "}
                        {t.runs.length === 1 ? "linked run" : "linked runs"}
                      </strong>
                      <span>
                        {t.runs
                          .map(
                            (r) =>
                              r.state?.replaceAll("_", " ") ??
                              "Status unavailable",
                          )
                          .join(", ")}
                      </span>
                    </button>
                  ) : (
                    <p
                      className="dashboard-trace-unknown"
                      style={{ top: 80 + i * 150 }}
                    >
                      No run loaded for this idea
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* oxlint-enable jsx-a11y/no-noninteractive-tabindex */}
          <details className="dashboard-trace-readable">
            <summary>Read source-to-project links</summary>
            <ul>
              {traces.map((t) => (
                <li key={t.proposal._id ?? t.proposal.id}>
                  <button
                    className="secondary"
                    onClick={() => onOpenSource(t.source)}
                  >
                    {t.source.title ?? "Saved post"}
                  </button>
                  <span>supports</span>
                  <button
                    className="secondary"
                    onClick={() => onOpenProposal(t.proposal)}
                  >
                    {t.proposal.title ?? "Project idea"}
                  </button>
                  <span>{t.runs.length} linked runs in loaded records</span>
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : (
        <p className="studio-empty">
          No source-to-project links are available in the loaded records.
          Explore your topic network, or review an idea against a selected
          project.
        </p>
      )}
    </section>
  );
}
