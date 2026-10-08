"use client";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { buildKnowledgeMap } from "@/lib/knowledge-map";
import { layoutKnowledgeNetwork } from "@/lib/knowledge-layout";

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
  const [zoom, setZoom] = useState(1);
  const [availableWidth, setAvailableWidth] = useState(760);
  const layout = useMemo(
    () => layoutKnowledgeNetwork(graph, availableWidth),
    [graph, availableWidth],
  );
  const drag = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
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
    const element = surface.current;
    if (!element) return;
    const measure = () => setAvailableWidth(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const element = dialog.current;
    if (shown.length && element && !element.open) element.showModal();
    return () => {
      if (element?.open) element.close();
      returnFocus.current?.focus({ preventScroll: true });
    };
  }, [selected, shown.length]);
  const points = new Map(layout.nodes.map((n) => [n.id, n]));
  const fit = () => {
    setZoom(1);
    surface.current?.scrollTo({ top: 0, left: 0 });
  };
  return (
    <section aria-label="Focused connection canvas">
      <p>
        Explore how ideas connect. Larger circles have more cited links on this
        page, not higher quality. Lines join a connection group to its cited
        ideas.
      </p>
      <div className="visual-map-toolbar" aria-label="Network controls">
        <button
          className="secondary"
          disabled={zoom <= 0.65}
          onClick={() => setZoom((z) => Math.max(0.65, z - 0.15))}
        >
          Zoom out
        </button>
        <output aria-label="Network zoom">{Math.round(zoom * 100)}%</output>
        <button
          className="secondary"
          disabled={zoom >= 1.6}
          onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}
        >
          Zoom in
        </button>
        <button
          className="secondary"
          onClick={() => {
            setSelected(null);
            fit();
          }}
        >
          Reset view
        </button>
      </div>
      <ul className="visual-map-legend" aria-label="Network legend">
        <li data-kind="idea">Cited idea</li>
        {[...new Set(graph.relations.map((r) => r.kind))].map((kind) => (
          <li key={kind} data-kind={kind}>
            {labels[kind] ?? kind.replaceAll("_", " ")}
            {kind === "conflicting" ? " (dashed links)" : ""}
          </li>
        ))}
      </ul>
      <p className="explore-coverage">
        Swipe or scroll to explore. Drag the background with a mouse, or use Tab
        to reach every node. The readable list shows full claims.
      </p>
      {/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- This bounded overflow region must support keyboard scrolling. */}
      <section
        tabIndex={0}
        className="knowledge-canvas-viewport visual-network-viewport"
        ref={surface}
        aria-label="Idea network. Scroll or drag the background to pan. Tab to each idea or connection, then Enter to inspect evidence."
        onPointerDown={(e) => {
          if (
            e.pointerType !== "mouse" ||
            (e.target as HTMLElement).closest("button")
          )
            return;
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            left: e.currentTarget.scrollLeft,
            top: e.currentTarget.scrollTop,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const start = drag.current;
          if (start) {
            e.currentTarget.scrollLeft = start.left + start.x - e.clientX;
            e.currentTarget.scrollTop = start.top + start.y - e.clientY;
          }
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
      >
        <div
          className="visual-network-frame"
          style={{ width: layout.width * zoom, height: layout.height * zoom }}
        >
          <div
            className="visual-network-surface"
            style={
              {
                width: layout.width,
                height: layout.height,
                transform: `scale(${zoom})`,
                "--network-label-scale": Math.min(1, zoom),
              } as CSSProperties
            }
          >
            <svg
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              aria-hidden="true"
              className="knowledge-canvas-lines"
            >
              {layout.edges.map((e) => {
                const a = points.get(e.from)!,
                  b = points.get(e.to)!;
                return (
                  <path
                    key={`${e.from}:${e.to}`}
                    data-kind={e.kind}
                    d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`}
                  />
                );
              })}
            </svg>
            {graph.relations.map((r) => {
              const node = points.get(`relation:${r.id}`)!;
              return (
                <button
                  className="visual-network-node visual-network-group"
                  data-kind={r.kind}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: node.radius * 2,
                    height: node.radius * 2,
                  }}
                  key={r.id}
                  aria-label={`Inspect ${labels[r.kind] ?? r.kind}: ${r.explanation}`}
                  onClick={() => select(`relation:${r.id}`)}
                >
                  <strong>
                    {r.kind === "useful_combination"
                      ? "Combine ideas"
                      : (labels[r.kind] ?? r.kind.replaceAll("_", " "))}
                  </strong>
                  <span>{r.members.length} ideas</span>
                </button>
              );
            })}
            {graph.insights.map((m) => {
              const node = points.get(`insight:${m._id}`)!;
              return (
                <button
                  className="visual-network-node visual-network-idea"
                  data-kind="idea"
                  style={{
                    left: node.x,
                    top: node.y,
                    width: node.radius * 2,
                    height: node.radius * 2,
                  }}
                  key={m._id}
                  aria-label={`Inspect idea: ${m.evidence!.insight.claim}`}
                  onClick={() => select(`insight:${m._id}`)}
                >
                  <span>{m.evidence!.insight.claim}</span>
                </button>
              );
            })}
          </div>
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
