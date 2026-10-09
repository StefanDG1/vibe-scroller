"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, GitBranch } from "lucide-react";
import { linkedInsightProjects } from "@/lib/insight-project-links";
export function InsightProjectLinks({
  reference,
  topicId,
  organizationId,
  read,
  demo,
}: {
  reference: { sourceId: string; insightId: string };
  topicId: string;
  organizationId: string;
  read: () => Promise<any>;
  demo: boolean;
}) {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [topicId, reference.sourceId, reference.insightId],
  );
  async function load() {
    const ticket = ++generation.current;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const next = demo
        ? {
            items:
              reference.insightId === "idea-0"
                ? [
                    {
                      id: "synthetic-evaluation",
                      current: true,
                      sources: [
                        {
                          id: reference.sourceId,
                          insights: [reference.insightId],
                        },
                      ],
                      repository: "Synthetic Demo Planner",
                      disposition: "relevant",
                      decision: "unreviewed",
                      steps: [
                        {
                          id: "synthetic-proposal",
                          title: "Preview a useful result before setup",
                          state: "draft",
                        },
                      ],
                    },
                  ]
                : [],
            next: null,
          }
        : await read();
      if (ticket === generation.current) setResult(next);
    } catch {
      if (ticket === generation.current)
        setError("Connections unavailable. Close and reopen to retry.");
    } finally {
      if (ticket === generation.current) setLoading(false);
    }
  }
  return (
    <details
      className="atlas-insight-links"
      onToggle={(event) => {
        if (event.currentTarget.open) void load();
        else {
          generation.current++;
          setResult(null);
          setLoading(false);
        }
      }}
    >
      <summary>Project connections</summary>
      {loading && <output>Checking current permitted links…</output>}
      {error && <p role="alert">{error}</p>}
      {result && demo && (
        <p className="explore-meta">
          Illustrative connection only. No project was evaluated.
        </p>
      )}
      {result && (
        <>
          {linkedInsightProjects(reference, result.items).map(
            (evaluation: any) => (
              <div className="atlas-insight-destination" key={evaluation.id}>
                <ArrowDown size={18} aria-hidden="true" />
                <a
                  href={
                    demo
                      ? "/demo?view=projects"
                      : `/app/${organizationId}/projects`
                  }
                >
                  <GitBranch size={18} aria-hidden="true" />
                  <strong>{evaluation.repository}</strong>
                </a>
                <span>
                  {evaluation.disposition?.replaceAll("_", " ") ??
                    "Assessment not completed"}{" "}
                  · {evaluation.decision.replaceAll("_", " ")}
                </span>
                {evaluation.steps.map((step: any) => (
                  <span key={step.id}>
                    {step.title} · {step.state.replaceAll("_", " ")}
                  </span>
                ))}
              </div>
            ),
          )}
          {!linkedInsightProjects(reference, result.items).length && (
            <p>No current project link in this evaluation page.</p>
          )}
          {result.next && (
            <a
              href={
                demo ? "/demo?view=projects" : `/app/${organizationId}/projects`
              }
            >
              More evaluations exist; review them in Projects.
            </a>
          )}
        </>
      )}
    </details>
  );
}
