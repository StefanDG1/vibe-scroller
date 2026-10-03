"use client";
import { useEffect, useState, useEffectEvent, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { ChoiceSelect } from "./choice-select";

type Call = (operation: string, args: any) => Promise<any>;
type Props = {
  organizationId: string;
  repositories: any[];
  readOnly: boolean;
  demo: boolean;
  call: Call;
};
function download(name: string, value: string) {
  const url = URL.createObjectURL(
    new Blob([value], { type: "text/markdown;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
async function read(operation: string, args: any) {
  const response = await fetch("/api/product", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation, args }),
  });
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("application/json")
  )
    throw new Error(
      "Knowledge is unavailable. Check your session and current workspace access.",
    );
  return (await response.json()).result;
}
const synthetic = {
  _id: "demo-topic",
  name: "Review a first useful result",
  version: 1,
  pinned: false,
  state: "ready",
  explanation:
    "A populated example and a clear next action can work together. These are synthetic demonstration ideas, not verified customer outcomes.",
  covered: 2,
  sourceCount: 2,
  insightCount: 2,
  updatedAt: 0,
};
export function KnowledgeLibrary(p: Props) {
  const [topics, setTopics] = useState<any[]>(p.demo ? [synthetic] : []),
    [next, setNext] = useState<string | null>(null),
    [search, setSearch] = useState(""),
    [searchScope, setSearchScope] = useState("topic"),
    [recent, setRecent] = useState(""),
    [readiness, setReadiness] = useState(""),
    [selected, setSelected] = useState<any>(),
    [detail, setDetail] = useState<any>(),
    [cursor, setCursor] = useState<string>(),
    [policy, setPolicy] = useState<any>(),
    [ideas, setIdeas] = useState<any[]>([]),
    [ideaNext, setIdeaNext] = useState<string | null>(null),
    [issues, setIssues] = useState<any[]>([]),
    [issueNext, setIssueNext] = useState<string | null>(null),
    [project, setProject] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(!p.demo),
    [browsingLaterPages, setBrowsingLaterPages] = useState(false);
  const refreshGeneration = useRef(0),
    detailGeneration = useRef(0);
  async function refresh(append = false, topicCursor?: string) {
    if (p.demo) return;
    const generation = ++refreshGeneration.current;
    const detailAtStart = detailGeneration.current;
    try {
      const [list, policy, ideas, drafts] = await Promise.all([
        read("knowledgeList", {
          organizationId: p.organizationId,
          search: searchScope === "topic" ? search || undefined : undefined,
          sourceSearch:
            searchScope === "source" ? search || undefined : undefined,
          updatedSince: recent
            ? Date.now() - Number(recent) * 86400000
            : undefined,
          readiness: readiness || undefined,
          cursor: topicCursor,
          repositoryId: project || undefined,
        }),
        read("knowledgePolicy", { organizationId: p.organizationId }),
        read("knowledgeIdeas", {
          organizationId: p.organizationId,
          repositoryId: project || undefined,
        }),
        read("issueList", { organizationId: p.organizationId }),
      ]);
      if (generation !== refreshGeneration.current) return;
      setTopics((old) =>
        append
          ? [
              ...new Map(
                [...old, ...list.items].map((t) => [t._id, t]),
              ).values(),
            ]
          : list.items,
      );
      setNext(list.next);
      setPolicy(policy);
      setIdeas(ideas.items);
      setIdeaNext(ideas.next);
      setIssues(drafts.items);
      setIssueNext(drafts.next);
      setMessage("");
      if (selected && detailAtStart === detailGeneration.current)
        await loadDetail(selected, cursor);
    } catch (e) {
      if (generation !== refreshGeneration.current) return;
      setMessage(e instanceof Error ? e.message : "Knowledge is unavailable.");
    } finally {
      if (generation === refreshGeneration.current) setLoading(false);
    }
  }
  const poll = useEffectEvent(() => refresh());
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      if (!browsingLaterPages) void poll();
    }, 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && !browsingLaterPages)
        void poll();
    }, 15000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(timer);
    };
  }, [
    p.organizationId,
    search,
    searchScope,
    recent,
    readiness,
    project,
    browsingLaterPages,
  ]);
  async function run(operation: string, args: any) {
    setBusy(true);
    try {
      const result = await p.call(operation, args);
      await refresh();
      return result;
    } finally {
      setBusy(false);
    }
  }
  async function loadDetail(
    topic: any,
    pageCursor?: string,
    summaryCursor?: string,
  ) {
    const generation = ++detailGeneration.current;
    if (p.demo) {
      setDetail({
        topic,
        members: [],
        summaries: [
          {
            id: "demo",
            output: {
              explanation: synthetic.explanation,
              claims: [],
              relations: [
                {
                  kind: "complementary",
                  explanation:
                    "Show an example before asking the person to configure their project, then offer the next decision.",
                  references: [],
                },
              ],
              uncertainty:
                "Synthetic example. No independent usability result.",
            },
          },
        ],
        coverage: "Synthetic demonstration; two illustrative ideas.",
        next: null,
      });
      return;
    }
    setLoading(true);
    try {
      const response = await read("knowledgeDetail", {
        id: topic._id,
        cursor: pageCursor,
        summaryCursor,
      });
      if (generation === detailGeneration.current) setDetail(response);
    } catch {
      if (generation !== detailGeneration.current) return;
      setMessage("This topic is unavailable in the current workspace.");
      setSelected(undefined);
    } finally {
      if (generation === detailGeneration.current) setLoading(false);
    }
  }
  async function open(topic: any, pageCursor?: string, summaryCursor?: string) {
    setSelected(topic);
    setDetail(undefined);
    setCursor(pageCursor);
    await loadDetail(topic, pageCursor, summaryCursor);
  }
  return (
    <section className="knowledge-library" aria-label="Connected knowledge">
      <div className="panel">
        <h2>Topics</h2>
        <p>
          Connect saved ideas, inspect where they agree or disagree, and decide
          what fits a project. Your workspace keeps its own library.
        </p>
        <details>
          <summary>Automatic organization and its budget</summary>
          <p>
            Each explanation reserves up to 10 processing credits for at most 12
            insights. Existing provider and service limits still apply. You can
            pause updates; saved sources and previous explanations remain
            available. Permission to organize does not approve publication or
            coding.
          </p>
          <p>
            {policy
              ? `${policy.state.replaceAll("_", " ")} · ${policy.used} of ${policy.ceiling} credits in approved batch ceilings this month`
              : "Choose a ceiling before enabling funded automatic explanations. Existing analyses can be grouped without new media processing."}
          </p>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run("knowledgeConfigure", {
                organizationId: p.organizationId,
                enabled: f.get("enabled") === "on",
                ceiling: Number(f.get("ceiling")),
              });
            }}
          >
            <label>
              Monthly organization ceiling
              <input
                type="number"
                name="ceiling"
                min={10}
                max={200}
                step={10}
                defaultValue={policy?.ceiling ?? 50}
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={policy?.enabled ?? true}
              />
              I approve automatic organization within this ceiling
            </label>
            <button disabled={p.readOnly || busy || p.demo}>
              Save organization policy
            </button>
          </form>
        </details>
        <div className="form-grid">
          <label>
            Search {searchScope === "source" ? "source titles" : "topic titles"}
            <input
              value={search}
              onChange={(e) => (
                setBrowsingLaterPages(false),
                setSearch(e.target.value)
              )}
            />
          </label>
          <label htmlFor="knowledge-search-scope">
            Search in
            <ChoiceSelect
              id="knowledge-search-scope"
              value={searchScope}
              onValueChange={(value) => {
                setBrowsingLaterPages(false);
                setSearchScope(value);
              }}
            >
              <option value="topic">Topic titles</option>
              <option value="source">Source titles</option>
            </ChoiceSelect>
          </label>
          <label htmlFor="knowledge-recent">
            Recent updates
            <ChoiceSelect
              id="knowledge-recent"
              value={recent}
              onValueChange={(value) => {
                setBrowsingLaterPages(false);
                setRecent(value);
              }}
            >
              <option value="">All dates</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
            </ChoiceSelect>
          </label>
          <label htmlFor="knowledge-readiness">
            Readiness
            <ChoiceSelect
              id="knowledge-readiness"
              value={readiness}
              onValueChange={(value) => {
                setBrowsingLaterPages(false);
                setReadiness(value);
              }}
            >
              <option value="">All update states</option>
              <option value="ready">Ready</option>
              <option value="pending">Pending</option>
              <option value="updating">Updating</option>
              <option value="budget_paused">Budget paused</option>
              <option value="failed">Failed</option>
              <option value="unknown">Usage uncertain</option>
            </ChoiceSelect>
          </label>
          <label>
            Project applicability
            <ChoiceSelect
              value={project}
              onValueChange={(value) => {
                setBrowsingLaterPages(false);
                setProject(value);
              }}
            >
              <option value="">All projects</option>
              {p.repositories
                .filter((r) => r.enabled)
                .map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.fullName}
                  </option>
                ))}
            </ChoiceSelect>
          </label>
        </div>
        <output aria-live="polite">
          {message ||
            (loading
              ? "Loading connected knowledge…"
              : `${topics.length} topics on loaded pages. Continue for more topics.`)}
        </output>
        {!loading && !topics.length && (
          <p>
            No topics on this page. Keep saving permitted sources, complete
            analysis, or clear filters. Your individual posts remain below.
          </p>
        )}
        <div className="knowledge-cards">
          {[...topics]
            .sort((a, b) => Number(b.pinned) - Number(a.pinned))
            .map((t) => (
              <article className="panel" key={t._id}>
                <h3>
                  {t.name}
                  {t.pinned ? " · Pinned" : ""}
                </h3>
                <p>{t.explanation}</p>
                <p className="status">
                  {t.state.replaceAll("_", " ")} · {t.sourceCount ?? 0} sources
                  · {t.insightCount ?? t.covered} saved insights · {t.covered}{" "}
                  cited insights summarized
                </p>
                {!!t.conflicts && (
                  <p>
                    {t.conflicts} conflicting recommendations in the latest
                    cited explanation. Inspect the evidence before choosing an
                    approach.
                  </p>
                )}
                <p>
                  {t.updatedAt
                    ? `Updated ${new Date(t.updatedAt).toLocaleString()}`
                    : "Synthetic example"}
                </p>
                <button onClick={() => void open(t)}>
                  Inspect topic and evidence
                </button>
              </article>
            ))}
        </div>
        {next && (
          <button
            disabled={loading}
            onClick={() => {
              setBrowsingLaterPages(true);
              void refresh(true, next);
            }}
          >
            More topics
          </button>
        )}
      </div>
      {selected && detail && (
        <div className="panel" aria-label="Topic detail">
          <button
            onClick={() => {
              detailGeneration.current++;
              setSelected(undefined);
              setDetail(undefined);
            }}
          >
            Close topic
          </button>
          <h2>{detail.topic.name}</h2>
          <p>{detail.coverage}</p>
          {detail.jobState === "unknown" && (
            <p>
              Provider usage is uncertain. The cost hold remains; automatic
              retry is blocked. Ask a workspace administrator to reconcile
              provider usage.
            </p>
          )}
          {detail.jobState === "failed" && (
            <p>
              This batch failed. Saved evidence remains available. Review
              provider availability and the funding policy before requesting
              another changed-input update.
            </p>
          )}
          {detail.summaries.length === 0 && (
            <p>
              A combined explanation is pending, paused or stale. Inspect the
              surviving evidence below. No exhaustive review is claimed.
            </p>
          )}
          {detail.summaries.map((s: any) => (
            <article key={s.id}>
              <p>{s.output.explanation}</p>
              {s.output.claims.map((c: any, i: number) => (
                <p key={i}>
                  {c.text}{" "}
                  <EvidenceLinks
                    references={c.references}
                    organizationId={p.organizationId}
                  />
                </p>
              ))}
              {s.output.relations.map((r: any, i: number) => (
                <div key={i}>
                  <strong>{r.kind.replaceAll("_", " ")}</strong>
                  <p>
                    {r.explanation}{" "}
                    <EvidenceLinks
                      references={r.references}
                      organizationId={p.organizationId}
                    />
                  </p>
                </div>
              ))}
              <p>{s.output.uncertainty}</p>
            </article>
          ))}
          {detail.summaryNext && (
            <button
              onClick={() => void open(selected, cursor, detail.summaryNext)}
            >
              More explanation batches
            </button>
          )}
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run("knowledgeCorrect", {
                id: selected._id,
                version: detail.topic.version,
                name: String(f.get("name")),
                pinned: f.get("pinned") === "on",
              });
            }}
          >
            <label>
              Topic name
              <input
                name="name"
                defaultValue={detail.topic.name}
                maxLength={48}
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                name="pinned"
                defaultChecked={detail.topic.pinned}
              />
              Pin this topic
            </label>
            <button disabled={p.readOnly || busy || p.demo}>
              Save correction
            </button>
          </form>
          <details>
            <summary>Merge this topic</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void run("knowledgeCorrect", {
                  id: selected._id,
                  version: detail.topic.version,
                  mergeInto: String(f.get("destination")),
                });
              }}
            >
              <label>
                Destination topic
                <ChoiceSelect name="destination" required defaultValue="">
                  <option value="" disabled>
                    Choose a loaded topic
                  </option>
                  {topics
                    .filter((t) => t._id !== selected._id)
                    .map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                </ChoiceSelect>
              </label>
              <p>
                Manual exclusions remain in force. Later classification follows
                the merged topic.
              </p>
              <button disabled={p.readOnly || busy || p.demo}>
                Merge topics
              </button>
            </form>
          </details>
          <h3>Supporting posts and main points</h3>
          {detail.members.map((m: any) => (
            <article className="panel" key={m._id}>
              <h4>{m.evidence?.title ?? "Unavailable or excluded evidence"}</h4>
              <p>
                {m.evidence?.insight?.claim ??
                  "This insight is excluded, stale, deleted or not analyzed."}
              </p>
              {m.evidence && (
                <EvidenceLinks
                  references={[m.evidence.reference]}
                  organizationId={p.organizationId}
                />
              )}
              <button
                disabled={p.readOnly || busy || p.demo}
                onClick={() =>
                  void run("knowledgeCorrect", {
                    id: selected._id,
                    version: detail.topic.version,
                    memberId: m._id,
                    excluded: !m.excluded,
                  })
                }
              >
                {m.excluded
                  ? "Include this insight"
                  : "Exclude this connection"}
              </button>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void run("knowledgeCorrect", {
                    id: selected._id,
                    version: detail.topic.version,
                    memberId: m._id,
                    splitName: String(f.get("name")),
                  });
                }}
              >
                <label>
                  Split into a new topic
                  <input name="name" maxLength={48} required />
                </label>
                <button disabled={p.readOnly || busy || p.demo}>
                  Split and keep this decision
                </button>
              </form>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void run("knowledgeCorrect", {
                    id: selected._id,
                    version: detail.topic.version,
                    memberId: m._id,
                    destination: String(f.get("destination")),
                  });
                }}
              >
                <label>
                  Move to a loaded topic
                  <ChoiceSelect name="destination" required defaultValue="">
                    <option value="" disabled>
                      Choose topic
                    </option>
                    {topics
                      .filter((t) => t._id !== selected._id)
                      .map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name}
                        </option>
                      ))}
                  </ChoiceSelect>
                </label>
                <button disabled={p.readOnly || busy || p.demo}>
                  Move insight
                </button>
              </form>
            </article>
          ))}
          {detail.next && (
            <button onClick={() => void open(selected, detail.next)}>
              Next evidence batch
            </button>
          )}
          {cursor && (
            <button onClick={() => void open(selected)}>
              First evidence batch
            </button>
          )}
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              for (const repositoryId of f.getAll("repository"))
                await run("knowledgeEvaluate", {
                  id: selected._id,
                  repositoryId,
                  cursor,
                  maxCredits: 10,
                });
            }}
          >
            <h3>Apply this evidence batch to projects</h3>
            <p>
              Each selected project reserves up to 10 credits and gets its own
              evaluation. Other evidence batches remain omitted until you review
              them. This does not approve publication or coding.
            </p>
            {p.repositories
              .filter((r) => r.enabled && r.confirmed)
              .map((r) => (
                <label className="check" key={r._id}>
                  <input type="checkbox" name="repository" value={r._id} />
                  {r.fullName}
                </label>
              ))}
            {!p.repositories.some((r) => r.enabled && r.confirmed) && (
              <p>Select a project and confirm its business context first.</p>
            )}
            <button disabled={p.readOnly || busy || p.demo}>
              Evaluate selected projects · up to 10 credits each
            </button>
          </form>
        </div>
      )}
      <div className="panel">
        <h2>Ideas for your projects</h2>
        <p>
          These are repository-specific decisions from the loaded workspace
          knowledge. No fit and already implemented remain useful results.
        </p>
        {!ideas.length && (
          <p>
            Inspect a topic, then evaluate a current evidence batch for a
            selected project.
          </p>
        )}
        {ideas.map((e) => (
          <article className="panel" key={e._id}>
            <h3>{e.output?.title ?? "Evaluation pending"}</h3>
            <p>
              {p.repositories.find((r) => r._id === e.repositoryId)?.fullName ??
                "Unavailable project"}{" "}
              · {e.state} · {e.output?.disposition?.replaceAll("_", " ")} ·{" "}
              {e.decision}
            </p>
            <p>{e.output?.rationale}</p>
            <p>
              {e.covered} insights in this batch.{" "}
              {e.omitted
                ? "Other evidence was omitted."
                : "Only cited evidence was evaluated."}
            </p>
            <EvidenceLinks
              references={e.output?.references ?? []}
              organizationId={p.organizationId}
            />
            <div className="actions">
              {["rejected", "deferred", "accepted"].map((decision) => (
                <button
                  key={decision}
                  disabled={p.readOnly || busy || p.demo}
                  onClick={() =>
                    void run("knowledgeDecide", { id: e._id, decision })
                  }
                >
                  {decision === "rejected"
                    ? "Reject"
                    : decision === "deferred"
                      ? "Defer"
                      : "Keep idea"}
                </button>
              ))}
              <button
                disabled={p.readOnly || busy || p.demo || e.state !== "ready"}
                onClick={() =>
                  void run("issueCreate", { id: e._id, followUp: false })
                }
              >
                Draft an issue
              </button>
              <button
                disabled={p.readOnly || busy || p.demo || e.state !== "ready"}
                onClick={() =>
                  void run("issueCreate", { id: e._id, followUp: true })
                }
              >
                Review a follow-up issue
              </button>
            </div>
          </article>
        ))}
        {ideaNext && (
          <button
            onClick={async () => {
              const r = await read("knowledgeIdeas", {
                organizationId: p.organizationId,
                repositoryId: project || undefined,
                cursor: ideaNext,
              });
              setBrowsingLaterPages(true);
              setIdeas((old) => [...old, ...r.items]);
              setIdeaNext(r.next);
            }}
          >
            More project ideas
          </button>
        )}
      </div>
      <div className="panel">
        <h2>Issues</h2>
        <p>
          An issue shares exactly its reviewed text with the target repository.
          Deleting library content does not delete an external GitHub issue.
          External edits or deletion require separate authorization. Closing an
          issue does not prove implementation or benefit.
        </p>
        {!issues.length && (
          <p>
            Draft an issue from a project idea. Markdown export works even when
            Issues write permission is unavailable.
          </p>
        )}
        {issues.map((d) => (
          <IssueReview
            key={`${d._id}:${d.version}:${d.visibility ?? "unchecked"}`}
            draft={d}
            busy={busy}
            readOnly={p.readOnly}
            run={run}
          />
        ))}
        {issueNext && (
          <button
            onClick={async () => {
              const r = await read("issueList", {
                organizationId: p.organizationId,
                cursor: issueNext,
              });
              setBrowsingLaterPages(true);
              setIssues((old) => [...old, ...r.items]);
              setIssueNext(r.next);
            }}
          >
            More issues
          </button>
        )}
      </div>
    </section>
  );
}
function EvidenceLinks({
  references,
  organizationId,
}: {
  references: any[];
  organizationId: string;
}) {
  return (
    <span className="knowledge-evidence">
      {references.map((r, i) => (
        <a
          key={`${r.sourceId}:${r.insightId}:${i}`}
          href={`/app/${organizationId}/library/${r.sourceId}`}
        >
          Inspect source {i + 1}
        </a>
      ))}
    </span>
  );
}
function IssueReview({
  draft: d,
  busy,
  readOnly,
  run,
}: {
  draft: any;
  busy: boolean;
  readOnly: boolean;
  run: Call;
}) {
  const [title, setTitle] = useState(d.title),
    [body, setBody] = useState(d.body),
    [rights, setRights] = useState(false),
    [sensitive, setSensitive] = useState(d.sensitive),
    [message, setMessage] = useState("");
  const changed =
    title !== d.title || body !== d.body || sensitive !== d.sensitive;
  return (
    <article className="panel">
      <h3>{d.repository}</h3>
      <p>
        {d.state} ·{" "}
        {d.current
          ? "Current evidence"
          : "Stale or unavailable evidence: publication blocked"}
      </p>
      <p>
        {d.visibility === "public"
          ? "PUBLIC repository: anyone can read this issue. Private workspace knowledge will leave VibeScroller if included below."
          : d.visibility === "private"
            ? "PRIVATE repository: everyone with repository access can read this text. Workspace membership and repository membership can differ."
            : "Repository visibility and Issues write permission must be verified before publication."}
      </p>
      <label>
        Exact issue title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={180}
          disabled={d.state !== "draft"}
        />
      </label>
      <label>
        Exact Markdown body
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={15}
          maxLength={20000}
          disabled={d.state !== "draft"}
        />
      </label>
      <details>
        <summary>Preview exact Markdown</summary>
        <div className="knowledge-markdown">
          <ReactMarkdown skipHtml>{body}</ReactMarkdown>
        </div>
      </details>
      <p>
        Recovery marker is part of the reviewed body. Raw transcripts, private
        code, screenshots, credentials and signed storage links are excluded by
        default.
      </p>
      <label className="check">
        <input
          type="checkbox"
          checked={sensitive}
          onChange={(e) => setSensitive(e.target.checked)}
          disabled={d.state !== "draft"}
        />
        I separately choose to include only excerpts I am permitted to publish
      </label>
      <div className="actions">
        <button
          disabled={readOnly || busy || d.state !== "draft"}
          onClick={() =>
            void run("issueEdit", {
              id: d._id,
              version: d.version,
              title,
              body,
              includePermittedExcerpts: sensitive,
            })
          }
        >
          Save exact text
        </button>
        <button
          onClick={() => download("reviewed-issue.md", `# ${title}\n\n${body}`)}
        >
          Download Markdown
        </button>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(`# ${title}\n\n${body}`);
              setMessage("Markdown copied.");
            } catch {
              setMessage("Copy is unavailable. Download Markdown instead.");
            }
          }}
        >
          Copy Markdown
        </button>
        <button
          disabled={
            readOnly || busy || !d.current || changed || d.state !== "draft"
          }
          onClick={() => void run("issuePrepare", { id: d._id })}
        >
          Verify permission and visibility
        </button>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={rights}
          onChange={(e) => setRights(e.target.checked)}
        />
        I have publication rights and approve exactly this title/body for{" "}
        {d.repository} with the visibility shown above
      </label>
      <button
        className="primary"
        disabled={
          readOnly ||
          busy ||
          !rights ||
          !d.current ||
          changed ||
          !d.visibility ||
          d.state !== "draft"
        }
        onClick={() =>
          void run("issuePublish", {
            id: d._id,
            version: d.version,
            hash: d.hash,
            visibility: d.visibility,
            publicationRights: rights,
          })
        }
      >
        Publish reviewed issue
      </button>
      <output aria-live="polite">{message}</output>
      {d.attempts.map((a: any) => (
        <div key={a._id}>
          <p>
            {a.state} · {a.externalState ?? "Not checked"}
            {a.externalEdited ? " · Edited on GitHub; edits preserved" : ""}
          </p>
          {a.url && (
            <a href={a.url} target="_blank" rel="noreferrer">
              Open GitHub issue #{a.number}
            </a>
          )}
          <button
            disabled={readOnly || busy}
            onClick={() => void run("issueRefresh", { id: a._id })}
          >
            Refresh or reconcile GitHub status
          </button>
          {["unknown", "publishing", "approved"].includes(a.state) && (
            <p>
              GitHub may have created this issue. No blind retry is permitted.
            </p>
          )}
        </div>
      ))}
    </article>
  );
}
