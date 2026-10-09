"use client";
import { useEffect, useState } from "react";
import { GitBranch, ArrowRight } from "lucide-react";
export function KnowledgePreview({
  organizationId,
  demo,
  onOpen,
}: {
  organizationId: string;
  demo: boolean;
  onOpen: () => void;
}) {
  const [page, setPage] = useState<{
    organizationId: string;
    items: { id: string; name: string; ideas: number }[];
  } | null>(null);
  const topics = page?.organizationId === organizationId ? page.items : null;
  const [unavailableOrganization, setUnavailable] = useState<string | null>(
    null,
  );
  const unavailable = unavailableOrganization === organizationId;
  useEffect(() => {
    if (demo) return;
    let current = true;
    let flight = false;
    let lastRead = 0;
    const abort = new AbortController();
    async function refresh() {
      if (document.hidden || flight || Date.now() - lastRead < 2000) return;
      flight = true;
      lastRead = Date.now();
      try {
        const response = await fetch("/api/product", {
          method: "POST",
          signal: abort.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operation: "exploreTopics",
            args: { organizationId },
          }),
        });
        if (!response.ok) throw Error("Unavailable");
        const body = await response.json();
        if (current) {
          setPage({ organizationId, items: body.result.items.slice(0, 3) });
          setUnavailable(null);
        }
      } catch {
        if (current) {
          setPage(null);
          setUnavailable(organizationId);
        }
      } finally {
        flight = false;
      }
    }
    void refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      current = false;
      abort.abort();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [organizationId, demo]);
  const shown = demo
    ? [{ id: "synthetic", name: "A useful first result", ideas: 6 }]
    : topics;
  return (
    <section
      className="atlas-home-knowledge"
      aria-labelledby="home-knowledge-title"
    >
      <header className="row spread">
        <h3 id="home-knowledge-title">Your knowledge, connected</h3>
        <button onClick={onOpen}>
          Open library <ArrowRight size={16} aria-hidden="true" />
        </button>
      </header>
      <ul>
        {shown?.map((topic) => (
          <li key={topic.id}>
            <button onClick={onOpen}>
              <GitBranch size={20} aria-hidden="true" />
              <strong>{topic.name}</strong>
              <span>{topic.ideas} current insights on this page</span>
            </button>
          </li>
        ))}
      </ul>
      {unavailable && (
        <p>
          Knowledge preview unavailable. Open Library to check your session.
        </p>
      )}
      {!unavailable && shown?.length === 0 && (
        <p>Your analyzed ideas will appear here after filing.</p>
      )}
      {!demo && !topics && !unavailable && (
        <output>Loading permitted topics…</output>
      )}
    </section>
  );
}
