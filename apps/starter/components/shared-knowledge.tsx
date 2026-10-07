"use client";
import { useRef, useState } from "react";
export function SharedKnowledge({
  organizationId,
  initial,
  initialDetail,
  initialError,
}: {
  organizationId: string;
  initial?: { items: any[]; next: string | null };
  initialDetail?: any;
  initialError?: string;
}) {
  const [items, setItems] = useState(initial?.items ?? []),
    [next, setNext] = useState(initial?.next ?? null),
    [detail, setDetail] = useState<any>(initialDetail),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(initialError ?? "");
  const request = useRef(0);
  async function read(operation: string, args: any) {
    const response = await fetch("/api/product", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation, args }),
    });
    if (
      !response.ok ||
      response.redirected ||
      !response.headers.get("content-type")?.includes("application/json")
    )
      throw new Error(
        "Shared knowledge is unavailable or changed. Reload to check current access.",
      );
    return (await response.json()).result;
  }
  async function page() {
    const generation = ++request.current;
    setBusy(true);
    setError("");
    setDetail(undefined);
    try {
      const value = await read("sharedKnowledge", {
        organizationId,
        cursor: next,
      });
      if (generation === request.current) {
        setItems(value.items);
        setNext(value.next);
      }
    } catch (e) {
      if (generation === request.current) {
        setItems([]);
        setNext(null);
        setError(
          e instanceof Error ? e.message : "Shared knowledge unavailable.",
        );
      }
    } finally {
      if (generation === request.current) setBusy(false);
    }
  }
  return (
    <section className="panel private-library-setup">
      <h2>Knowledge shared with this workspace</h2>
      <p>
        Explicit source versions shared by their private owner. A correction,
        deletion, expired grant or revoked permission can make them unavailable.
        Your workspace's own library stays separate.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {busy && <output>Checking current access...</output>}
      {!busy && !error && !items.length && (
        <p className="fine">No current shared sources on this page.</p>
      )}
      <ul className="private-space-list">
        {items.map((item) => (
          <li key={`${item.grantId}:${item.sourceId}`}>
            <a
              href={`/app/${organizationId}/shared?grant=${encodeURIComponent(item.grantId)}&source=${encodeURIComponent(item.sourceId)}`}
            >
              {item.title}
            </a>
            <span className="fine">
              {item.state === "ready" ? "Cited analysis" : "Saved title"}
            </span>
          </li>
        ))}
      </ul>
      {next && (
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => {
            void page();
          }}
        >
          Next sharing grant
        </button>
      )}
      {detail && (
        <section aria-label="Shared source analysis">
          <h3>{detail.title}</h3>
          <p className="fine">
            Source generation {detail.generation}; grant version{" "}
            {detail.grantVersion}. Coverage:{" "}
            {detail.coverage.replaceAll("_", " ")}.
          </p>
          {detail.insights.length ? (
            <ul>
              {detail.insights.map((insight: any) => (
                <li key={insight.id}>
                  <h4>{insight.title}</h4>
                  <p>{insight.claim}</p>
                  <p className="fine">
                    Exact insight {insight.id}. Source revision{" "}
                    {insight.reference.revision}.{" "}
                    {insight.evidence
                      .map((e: any) =>
                        e.startMs !== undefined
                          ? `${e.kind}: ${(e.startMs / 1000).toFixed(1)}s`
                          : e.kind,
                      )
                      .join("; ")}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No cited analysis in this shared source version.</p>
          )}
          <button
            className="button secondary"
            onClick={() => setDetail(undefined)}
          >
            Close source
          </button>
        </section>
      )}
    </section>
  );
}
