"use client";
import { useState } from "react";
import { GitBranch, Lightbulb, Link2, ChevronDown } from "lucide-react";
import { buildKnowledgeMap } from "@/lib/knowledge-map";
import { KnowledgeCanvas } from "./knowledge-canvas";

const labels: Record<string, string> = {
  similar: "Similar ideas",
  complementary: "Work together",
  conflicting: "Disagreement",
  useful_combination: "Useful combination",
  useful_connection: "Useful connection",
};
export function KnowledgeMap({
  detail,
  organizationId,
  demo = false,
}: {
  detail: any;
  organizationId: string;
  demo?: boolean;
}) {
  const [relationOffset, setRelationOffset] = useState(0);
  const graph = buildKnowledgeMap(
    detail.members,
    detail.summaries,
    relationOffset,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState("canvas");
  const evidence = (shown: typeof graph.insights, explanation?: string) => (
    <section
      className="knowledge-map-inspector"
      aria-label="Selected node evidence"
      aria-live="polite"
    >
      {explanation && <p>{explanation}</p>}
      {shown.map((m) => (
        <div key={m._id}>
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
        </div>
      ))}
    </section>
  );
  const leaf = (m: (typeof graph.insights)[number]) => (
    <li key={m._id}>
      <button
        type="button"
        className="knowledge-map-leaf"
        aria-pressed={selected === `insight:${m._id}`}
        aria-expanded={selected === `insight:${m._id}`}
        onClick={() =>
          setSelected(
            selected === `insight:${m._id}` ? null : `insight:${m._id}`,
          )
        }
      >
        <Lightbulb size={16} aria-hidden="true" />
        <span>
          <span className="knowledge-map-claim">
            {m.evidence!.insight.claim}
          </span>
          <span className="knowledge-map-source">{m.evidence!.title}</span>
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {selected === `insight:${m._id}` && evidence([m])}
    </li>
  );
  return (
    <section className="knowledge-map" aria-label="Topic connection map">
      <div className="knowledge-map-root">
        <GitBranch size={22} aria-hidden="true" />
        <strong>{graph.insights.length} ideas</strong>
        <span>
          {graph.relations.length}{" "}
          {graph.relations.length === 1 ? "connection" : "connections"}
        </span>
      </div>
      <p className="knowledge-map-caption">
        Select a connection or idea to see its evidence.
      </p>
      <fieldset
        className="knowledge-map-toggle"
        aria-label="Connection representation"
      >
        <button aria-pressed={view === "text"} onClick={() => setView("text")}>
          Readable list
        </button>
        <button
          aria-pressed={view === "canvas"}
          onClick={() => setView("canvas")}
        >
          Network map
        </button>
      </fieldset>
      {view === "canvas" && graph.insights.length > 0 && (
        <KnowledgeCanvas
          graph={graph}
          organizationId={organizationId}
          demo={demo}
        />
      )}
      {graph.omittedRelations > 0 && (
        <p>
          {graph.omittedRelations} other cited groups are outside this 40-node
          view. Use the group pages below to inspect them.
        </p>
      )}
      {graph.insights.length === 0 ? (
        <p>
          No current evidence on this page. Include an excluded idea or open
          another evidence page to inspect its connections.
        </p>
      ) : (
        <ul className="knowledge-map-branches" hidden={view === "canvas"}>
          {graph.relations.map((r) => (
            <li className="knowledge-map-branch" key={r.id}>
              <button
                type="button"
                className="knowledge-map-connection"
                data-kind={r.kind}
                aria-pressed={selected === `relation:${r.id}`}
                aria-expanded={selected === `relation:${r.id}`}
                onClick={() =>
                  setSelected(
                    selected === `relation:${r.id}` ? null : `relation:${r.id}`,
                  )
                }
              >
                <Link2 size={18} aria-hidden="true" />
                <span>{labels[r.kind] ?? r.kind.replaceAll("_", " ")}</span>
                <span className="knowledge-map-count">
                  {r.members.length} ideas
                </span>
              </button>
              {selected === `relation:${r.id}` &&
                evidence(r.members, r.explanation)}
              <ul className="knowledge-map-leaves">{r.members.map(leaf)}</ul>
            </li>
          ))}
          {graph.other.length > 0 && (
            <li className="knowledge-map-branch">
              <div className="knowledge-map-unconnected">
                {graph.relations.length
                  ? "Other ideas in this topic"
                  : "Ideas in this topic"}
              </div>
              <ul className="knowledge-map-leaves">{graph.other.map(leaf)}</ul>
            </li>
          )}
        </ul>
      )}
      {graph.insights.length > 0 && graph.relations.length === 0 && (
        <p>
          No current explained connections on this page. Topic membership alone
          does not mean the ideas agree.
        </p>
      )}
      {graph.nextRelations !== null && (
        <button
          onClick={() => {
            setSelected(null);
            setRelationOffset(graph.nextRelations!);
          }}
        >
          Next cited groups
        </button>
      )}
      {relationOffset > 0 && (
        <button
          className="secondary"
          onClick={() => {
            setSelected(null);
            setRelationOffset(0);
          }}
        >
          First cited groups
        </button>
      )}
      {detail.next && (
        <p>
          More evidence is available. Use “Next evidence page” below to see the
          next part of this topic.
        </p>
      )}
    </section>
  );
}
