"use client";
import { useEffect, useId, useRef, useState } from "react";
import { buildKnowledgeMap } from "@/lib/knowledge-map";

const labels: Record<string, string> = {
  similar: "Similar ideas",
  complementary: "Work together",
  conflicting: "Disagreement",
  useful_combination: "Useful combination",
};
export function KnowledgeCanvas({
  graph,
  organizationId,
  demo,
}: {
  graph: ReturnType<typeof buildKnowledgeMap>;
  organizationId: string;
  demo: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  function select(value: string) {
    returnFocus.current = document.activeElement as HTMLElement;
    setSelected(value);
  }
  const surface = useRef<HTMLElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    titleId = useId();
  const relation = graph.relations.find((r) => `relation:${r.id}` === selected);
  const insight = graph.insights.find((m) => `insight:${m._id}` === selected);
  const shown = relation?.members ?? (insight ? [insight] : []);
  useEffect(() => {
    const element = dialog.current;
    if (shown.length && element && !element.open) element.showModal();
    return () => {
      if (element?.open) element.close();
      returnFocus.current?.focus({ preventScroll: true });
    };
  }, [selected, shown.length]);
  const rows = Math.max(graph.insights.length, graph.relations.length, 1),
    height = rows * 112;
  const insightIndex = new Map(graph.insights.map((m, i) => [m._id, i]));
  return (
    <section aria-label="Focused connection canvas">
      <p>
        Lines join a cited connection group to its supporting ideas. They do not
        establish causation.
      </p>
      <button
        className="secondary"
        onClick={() => {
          setSelected(null);
          surface.current?.scrollTo({ top: 0, left: 0 });
        }}
      >
        Fit and reset
      </button>
      {/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- This bounded overflow region must support keyboard scrolling. */}
      <section
        tabIndex={0}
        className="knowledge-canvas-viewport"
        ref={surface}
        aria-label="Connection canvas. Scroll to inspect the bounded page; every node is also a keyboard button."
      >
        <div className="knowledge-canvas-surface" style={{ height }}>
          <svg
            viewBox={`0 0 100 ${height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            className="knowledge-canvas-lines"
          >
            {graph.relations.flatMap((r, i) =>
              r.members.map((m) => (
                <path
                  key={`${r.id}:${m._id}`}
                  d={`M 45 ${i * 112 + 48} C 50 ${i * 112 + 48}, 50 ${insightIndex.get(m._id)! * 112 + 48}, 55 ${insightIndex.get(m._id)! * 112 + 48}`}
                />
              )),
            )}
          </svg>
          {graph.relations.map((r, i) => (
            <button
              className="knowledge-canvas-node knowledge-canvas-relation"
              style={{ top: i * 112 + 8 }}
              key={r.id}
              aria-label={`Inspect ${labels[r.kind] ?? r.kind}: ${r.explanation}`}
              onClick={() => select(`relation:${r.id}`)}
            >
              <strong>{labels[r.kind] ?? r.kind.replaceAll("_", " ")}</strong>
              <span>{r.members.length} ideas</span>
            </button>
          ))}
          {graph.insights.map((m, i) => (
            <button
              className="knowledge-canvas-node knowledge-canvas-insight"
              style={{ top: i * 112 + 8 }}
              key={m._id}
              aria-label={`Inspect idea: ${m.evidence!.insight.claim}`}
              onClick={() => select(`insight:${m._id}`)}
            >
              <span>{m.evidence!.insight.claim}</span>
            </button>
          ))}
        </div>
      </section>
      {/* oxlint-enable jsx-a11y/no-noninteractive-tabindex */}
      {shown.length > 0 && (
        <dialog
          ref={dialog}
          className="knowledge-canvas-sheet"
          aria-labelledby={titleId}
          onCancel={(e) => {
            e.preventDefault();
            setSelected(null);
          }}
          onClose={() => setSelected(null)}
        >
          <header>
            <h3 id={titleId}>
              {relation
                ? (labels[relation.kind] ?? "Cited connection")
                : "Cited idea"}
            </h3>
            <button className="secondary" onClick={() => setSelected(null)}>
              Close evidence
            </button>
          </header>
          {relation && <p>{relation.explanation}</p>}
          {shown.map((m) => (
            <article key={m._id}>
              <p>{m.evidence!.insight.claim}</p>
              {demo ? (
                <p>Synthetic example. No saved source.</p>
              ) : (
                <a
                  href={`/app/${organizationId}/library/${m.evidence!.reference.sourceId}`}
                >
                  Inspect source: {m.evidence!.title}
                </a>
              )}
            </article>
          ))}
        </dialog>
      )}
    </section>
  );
}
