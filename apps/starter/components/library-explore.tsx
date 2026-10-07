"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, GitBranch, ArrowRight, Lightbulb } from "lucide-react";
import { KnowledgeMap } from "./knowledge-map";
import { ChoiceSelect } from "./choice-select";
import { usePolling } from "@/lib/use-polling";
import { buildTopicTree, type TopicNode } from "@/lib/topic-tree";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";

type View = "tree" | "connections" | "journey" | "overview" | "helped";
const views: [View, string][] = [
  ["tree", "Topic tree"],
  ["connections", "Connections"],
  ["journey", "Idea journey"],
  ["overview", "Topic overview"],
  ["helped", "What helped"],
];
const scopeNames: Record<string, string> = {
  personal: "Personal",
  business: "Business",
  connected: "Connected spaces",
  workspace: "Workspace",
};
const fixture = {
  items: [
    {
      id: "demo-topic",
      name: "A useful first result",
      ideas: 2,
      posts: 2,
      moreEvidence: false,
      pinned: false,
    },
  ],
  next: null,
  scope: "workspace",
  scopes: ["workspace"],
  coverage:
    "Synthetic demonstration. Two illustrative ideas; no saved customer data or measured benefit.",
};
const fixtureDetail = {
  topic: {
    _id: "demo-topic",
    name: "A useful first result",
    version: 1,
    layoutVersion: 0,
    aliases: [],
  } satisfies Omit<
    NonNullable<
      FunctionReturnType<typeof api.knowledgeExplore.detail>["topic"]
    >,
    "_id"
  > & { _id: string },
  members: [
    "Show a populated example before asking for project setup.",
    "Offer one clear next decision after the first result.",
  ].map((claim, i) => ({
    _id: `demo-${i}`,
    evidence: {
      title: `Synthetic example ${i + 1}`,
      reference: {
        sourceId: `demo-${i}`,
        generation: 1,
        revision: 1,
        insightId: `idea-${i}`,
      },
      insight: { claim },
    },
  })),
  summaries: [] as any[],
  next: null,
  coverage: "Synthetic evidence only.",
};
fixtureDetail.summaries = [
  {
    id: "demo-summary",
    output: {
      relations: [
        {
          kind: "complementary",
          explanation:
            "The example provides context; the next decision gives the person somewhere to go. This is illustrative, not a measured result.",
          references: fixtureDetail.members.map((m) => m.evidence.reference),
        },
      ],
    },
  },
];
export function LibraryExplore({
  organizationId,
  demo = false,
  enabled = true,
  readOnly = true,
  call,
  load,
}: {
  organizationId: string;
  demo?: boolean;
  enabled?: boolean;
  readOnly?: boolean;
  call?: (operation: string, args: any) => Promise<any>;
  load?: (operation: string, args: any) => Promise<any>;
}) {
  const [view, setView] = useState<View>("tree"),
    [scope, setScope] = useState("");
  const [topics, setTopics] = useState<any>(demo ? fixture : null),
    [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null),
    [detail, setDetail] = useState<any>(null),
    [journey, setJourney] = useState<any>(null),
    [helped, setHelped] = useState<any>(null);
  const [method, setMethod] = useState(""),
    [savingStructure, setSavingStructure] = useState(false),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(!demo),
    [laterPage, setLaterPage] = useState(false);
  const generation = useRef(0),
    selectionGeneration = useRef(0),
    selectedHeading = useRef<HTMLHeadingElement>(null),
    focusPending = useRef(false),
    detailCursor = useRef<string | undefined>(undefined);
  async function read(operation: string, args: any) {
    if (load) return load(operation, args);
    const response = await fetch("/api/product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation, args }),
    });
    const data = response.headers
      .get("content-type")
      ?.includes("application/json")
      ? await response.json()
      : null;
    if (!response.ok || !data)
      throw new Error(
        data?.error ??
          "Explore is unavailable. Reload after checking your session and space setup.",
      );
    return data.result;
  }
  const args = () => ({ organizationId, scope: scope || undefined });
  async function refresh(cursor?: string, append = false) {
    if (demo) return;
    const ticket = ++generation.current;
    setLoading(true);
    try {
      const result = await read(
        view === "helped" ? "exploreHelped" : "exploreTopics",
        {
          ...args(),
          cursor,
          ...(view === "helped"
            ? { method: method || undefined }
            : { search: search || undefined }),
        },
      );
      if (ticket !== generation.current) return;
      if (view === "helped") setHelped(result);
      else
        setTopics((old: any) => ({
          ...result,
          items:
            append && old
              ? [
                  ...new Map(
                    [...old.items, ...result.items].map((t: any) => [t.id, t]),
                  ).values(),
                ].slice(-40)
              : result.items,
        }));
      // Revalidate the selected branch on the same visibility-aware refresh.
      if (
        selected &&
        (await open(selected, detailCursor.current, false)) === false
      )
        return false;
      setMessage("");
    } catch (error) {
      if (ticket !== generation.current) return;
      selectionGeneration.current++;
      setTopics(null);
      setDetail(null);
      setJourney(null);
      setHelped(null);
      setSelected(null);
      setMessage(
        error instanceof Error
          ? error.message
          : "Explore is unavailable. Reload to try again.",
      );
      return false;
    } finally {
      if (ticket === generation.current) setLoading(false);
    }
  }
  usePolling(
    () => refresh(),
    60000,
    enabled && !demo && !laterPage,
    JSON.stringify([organizationId, scope, search, view, method]),
  );
  useEffect(
    () => () => {
      generation.current++;
      selectionGeneration.current++;
    },
    [],
  );
  useEffect(() => {
    if ((detail?.topic || journey) && focusPending.current) {
      selectedHeading.current?.focus({ preventScroll: true });
      selectedHeading.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
      focusPending.current = false;
    }
  }, [detail?.topic, journey]);
  async function open(topic: any, cursor?: string, focus = true) {
    const ticket = ++selectionGeneration.current;
    if (focus) {
      focusPending.current = true;
      detailCursor.current = cursor;
      setSelected(topic);
      setDetail(null);
      setJourney(null);
    }
    if (demo) {
      setDetail(fixtureDetail);
      setJourney({
        items: [],
        next: null,
        coverage:
          "Synthetic example has no recorded project evaluation or outcome.",
      });
      return;
    }
    try {
      const result = await read(
        view === "journey" ? "exploreJourney" : "exploreDetail",
        { ...args(), topicId: topic.id, cursor },
      );
      if (ticket !== selectionGeneration.current) return;
      if (view === "journey") setJourney(result);
      else {
        setDetail(result);
        if (!result.topic && !result.next) setSelected(null);
      }
      setMessage("");
    } catch (error) {
      if (ticket !== selectionGeneration.current) return;
      setDetail(null);
      setJourney(null);
      setSelected(null);
      setMessage(error instanceof Error ? error.message : "Topic unavailable.");
      return false;
    }
  }
  function reset() {
    generation.current++;
    selectionGeneration.current++;
    setSelected(null);
    setDetail(null);
    setJourney(null);
    setHelped(null);
    setTopics(demo ? fixture : null);
    setLaterPage(false);
    detailCursor.current = undefined;
  }
  const sourceLink = (source: any) =>
    demo ? (
      <span>Synthetic example</span>
    ) : (
      <a href={`/app/${organizationId}/library/${source.id}`}>{source.title}</a>
    );
  return (
    <section className="library-explore" aria-label="Library Explore">
      <div className="explore-intro">
        <h2>Explore your library</h2>
        <p>
          Follow an idea, inspect its connections, or see what happened when it
          was tried.
        </p>
      </div>
      {demo && (
        <p className="notice">
          Synthetic demonstration. No customer data, project evaluation or
          measured benefit.
        </p>
      )}
      <fieldset className="explore-views" aria-label="Explore view">
        {views.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={view === id}
            onClick={() => {
              reset();
              setView(id);
            }}
          >
            {label}
          </button>
        ))}
      </fieldset>
      <div className="explore-controls">
        <label>
          Library view
          <ChoiceSelect
            value={scope || topics?.scope || helped?.scope || ""}
            onValueChange={(value) => {
              reset();
              setScope(value);
            }}
          >
            {(
              topics?.scopes ??
              helped?.scopes ??
              (scope ? [scope] : ["personal", "business"])
            ).map((s: string) => (
              <option value={s} key={s}>
                {scopeNames[s]}
              </option>
            ))}
          </ChoiceSelect>
        </label>
        {view !== "helped" && (
          <label>
            Find a topic
            <input
              value={search}
              placeholder="Search topics and aliases"
              maxLength={120}
              onChange={(e) => {
                reset();
                setSearch(e.target.value);
              }}
            />
          </label>
        )}
        {view === "helped" && (
          <label htmlFor="explore-evidence-type">
            Evidence type
            <ChoiceSelect
              id="explore-evidence-type"
              value={method}
              onValueChange={(value) => {
                reset();
                setMethod(value);
              }}
            >
              <option value="">All recorded outcomes</option>
              <option value="judgment">Judgment only</option>
              <option value="measurement">Reported comparison</option>
            </ChoiceSelect>
          </label>
        )}
      </div>
      {message && (
        <div role="alert" className="error">
          <p>{message}</p>
          <button onClick={() => void refresh()}>Reload Explore</button>
        </div>
      )}
      {loading && (
        <output aria-live="polite">Loading current permitted knowledge…</output>
      )}
      {view === "helped" ? (
        <>
          {!loading && !helped?.items.length && !message && (
            <p>
              No recorded outcomes on this page. A merged PR alone does not
              establish a benefit.
            </p>
          )}
          <div className="explore-outcomes">
            {helped?.items.map((item: any) => (
              <article key={item.id}>
                <h3>{item.title}</h3>
                <p className="explore-meta">
                  {item.verdict.replaceAll("_", " ")} ·{" "}
                  {item.measurement
                    ? "Reported comparison"
                    : "Recorded judgment"}
                </p>
                <p>{item.note}</p>
                {item.measurement && <Measurement value={item.measurement} />}
                <p>
                  {item.deployedVersion
                    ? `Recorded deployment version: ${item.deployedVersion}`
                    : "No deployment version recorded."}
                </p>
                <ul>
                  {item.sources.map((s: any) => (
                    <li key={s.id}>{sourceLink(s)}</li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    reset();
                    setView("journey");
                    setSelected({ id: item.topicId, name: item.title });
                  }}
                >
                  Open attribution journey
                </button>
              </article>
            ))}
          </div>
          <p className="explore-coverage">{helped?.coverage}</p>
          {helped?.next && (
            <button
              disabled={loading}
              onClick={() => {
                setLaterPage(true);
                void refresh(helped.next);
              }}
            >
              Next outcomes page
            </button>
          )}
        </>
      ) : selected ? (
        <div className="explore-branch">
          <button
            className="secondary"
            onClick={() => {
              selectionGeneration.current++;
              setSelected(null);
              setDetail(null);
              setJourney(null);
            }}
          >
            Back to topic list
          </button>
          <h3 ref={selectedHeading} tabIndex={-1}>
            {detail?.topic?.name ?? selected.name}
          </h3>
          {detail?.topic && !readOnly && (
            <details className="explore-structure">
              <summary>Edit topic structure</summary>
              <form
                key={`${detail.topic._id}:${detail.topic.layoutVersion}`}
                className="form-grid"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!call || demo) return;
                  const data = new FormData(e.currentTarget),
                    parent = String(data.get("parent"));
                  setSavingStructure(true);
                  try {
                    await call("organizeExploreTopic", {
                      topicId: selected.id,
                      layoutVersion: detail.topic.layoutVersion,
                      ...(parent === "keep"
                        ? {}
                        : { parentId: parent || null }),
                      aliases: String(data.get("aliases"))
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    });
                    await refresh();
                  } catch (error) {
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : "Structure was not saved. Reload and try again.",
                    );
                  } finally {
                    setSavingStructure(false);
                  }
                }}
              >
                <label>
                  Parent topic
                  <ChoiceSelect
                    id="explore-parent-topic"
                    name="parent"
                    defaultValue="keep"
                  >
                    <option value="keep">Keep saved parent</option>
                    <option value="">No parent</option>
                    {topics?.items
                      .filter((t: any) => t.id !== selected.id)
                      .map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </ChoiceSelect>
                </label>
                <label>
                  Aliases, separated by commas
                  <input
                    name="aliases"
                    defaultValue={detail.topic.aliases.join(", ")}
                    maxLength={390}
                  />
                </label>
                <p>
                  Use up to eight short aliases. Structure and aliases do not
                  change evidence or authorize analysis.
                </p>
                <button disabled={savingStructure || demo || !call}>
                  Save topic structure
                </button>
              </form>
            </details>
          )}
          {view === "journey" ? (
            <>
              {!journey && (
                <output aria-live="polite">Opening recorded journey…</output>
              )}
              {journey?.items.length === 0 && (
                <p>
                  No recorded evaluations on this page. Saving a post does not
                  imply a project change.
                </p>
              )}
              {journey?.items.map((item: any) => (
                <article className="explore-journey" key={item.id}>
                  <h4>{item.repository}</h4>
                  <p className="explore-meta">
                    {item.current
                      ? "Current project fit"
                      : "Historical project fit; refresh before acting"}{" "}
                    · {item.state.replaceAll("_", " ")}
                  </p>
                  <ol>
                    <li>
                      <strong>Saved posts and cited ideas</strong>
                      <ul>
                        {item.sources.map((s: any) => (
                          <li key={s.id}>
                            {sourceLink(s)}{" "}
                            <span className="explore-meta">
                              {s.insights.length} cited{" "}
                              {s.insights.length === 1 ? "idea" : "ideas"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                    <li>
                      <strong>Evaluation</strong>
                      <p>
                        {item.disposition?.replaceAll("_", " ") ??
                          "No completed disposition"}{" "}
                        · Decision: {item.decision.replaceAll("_", " ")}
                      </p>
                      <p className="explore-meta">
                        Repository version {item.baseSha.slice(0, 12)}
                      </p>
                    </li>
                    {item.steps.map((step: any) => (
                      <li key={step.id}>
                        <strong>
                          {step.issueUrl ? (
                            <a
                              href={step.issueUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Published issue: {step.title}
                            </a>
                          ) : (
                            `Issue draft: ${step.title}`
                          )}
                        </strong>
                        <p>{step.state.replaceAll("_", " ")}</p>
                        {step.run ? (
                          <>
                            <p>
                              {step.run.prUrl ? (
                                <a
                                  href={step.run.prUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open recorded PR
                                </a>
                              ) : (
                                "No PR recorded"
                              )}{" "}
                              ·{" "}
                              {step.run.prState?.replaceAll("_", " ") ??
                                step.run.state.replaceAll("_", " ")}
                            </p>
                            {step.run.mergedAt && (
                              <p>
                                Merged {step.run.mergedAt}. Benefit remains a
                                separate outcome.
                              </p>
                            )}
                            {step.run.deployment && (
                              <p>
                                Deployment record:{" "}
                                {step.run.deployment.state ??
                                  step.run.deployment.status ??
                                  "recorded"}
                              </p>
                            )}
                          </>
                        ) : (
                          <p>No implementation run recorded.</p>
                        )}
                        {step.outcome ? (
                          <>
                            <p>
                              {step.outcome.verdict.replaceAll("_", " ")} ·{" "}
                              {step.outcome.method.replaceAll("_", " ")}
                            </p>
                            <p>{step.outcome.note}</p>
                            {step.outcome.measurement && (
                              <Measurement value={step.outcome.measurement} />
                            )}
                          </>
                        ) : (
                          <p>No outcome recorded.</p>
                        )}
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
              <p className="explore-coverage">{journey?.coverage}</p>
              {journey?.next && (
                <button onClick={() => void open(selected, journey.next)}>
                  Next evaluations page
                </button>
              )}
            </>
          ) : (
            <>
              {!detail && (
                <output aria-live="polite">Opening current evidence…</output>
              )}
              {detail && view === "connections" && (
                <KnowledgeMap
                  key={`${selected.id}:${detail.topic?.version}:${scope}:${detail.members[0]?._id ?? "empty"}`}
                  detail={detail}
                  organizationId={organizationId}
                  demo={demo}
                />
              )}
              {detail && view !== "connections" && (
                <ul className="explore-tree">
                  {[
                    ...new Set(
                      detail.members.map(
                        (m: any) => m.evidence.reference.sourceId,
                      ),
                    ),
                  ].map((id: any) => {
                    const members = detail.members.filter(
                      (m: any) => m.evidence.reference.sourceId === id,
                    );
                    return (
                      <li key={id}>
                        <details open>
                          <summary>
                            <Lightbulb size={18} aria-hidden="true" />
                            <span>{members[0].evidence.title}</span>
                            <span className="explore-meta">
                              {members.length} ideas
                            </span>
                          </summary>
                          <ul>
                            {members.map((m: any) => (
                              <li key={m._id}>
                                <p>{m.evidence.insight.claim}</p>
                                {sourceLink({
                                  id,
                                  title: "Inspect source evidence",
                                })}
                              </li>
                            ))}
                          </ul>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              )}
              {detail?.members.length === 0 && (
                <p>
                  No current permitted evidence on this page. Choose another
                  page or review your filing.
                </p>
              )}
              <p className="explore-coverage">{detail?.coverage}</p>
              {detail?.next && (
                <button onClick={() => void open(selected, detail.next)}>
                  Next evidence page
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          {!loading && !topics?.items.length && !message && (
            <p>
              No current permitted topics on this page. Try another page, clear
              the search, or file your analyzed posts in this view.
            </p>
          )}
          {view === "tree" ? (
            <TopicBranches
              topics={topics?.items ?? []}
              onOpen={(topic) => void open(topic)}
            />
          ) : (
            <ul
              className={`explore-topics ${view === "overview" ? "explore-bars" : ""}`}
            >
              {topics?.items.map((topic: any) => (
                <li key={topic.id}>
                  <button
                    onClick={() => void open(topic)}
                    aria-label={`Open ${topic.name}`}
                  >
                    <GitBranch size={19} aria-hidden="true" />
                    <span className="explore-topic-text">
                      <strong>
                        {topic.name}
                        {topic.pinned ? " · Pinned" : ""}
                      </strong>
                      <span className="explore-meta">
                        {topic.posts} posts · {topic.ideas} current ideas
                        {topic.moreEvidence ? " · more evidence available" : ""}
                      </span>
                      {view === "overview" && (
                        <span className="explore-bar" aria-hidden="true">
                          <span
                            style={{ width: `${(topic.ideas / 20) * 100}%` }}
                          />
                        </span>
                      )}
                    </span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="explore-coverage">
            {topics?.coverage} Up to 40 loaded topics are shown at once.
            {view === "overview" &&
              " Bars use the twenty-idea evidence-page limit as their full scale. They do not measure whole-topic size or independent corroboration."}
          </p>
          {laterPage && (
            <button
              className="secondary"
              onClick={() => {
                setLaterPage(false);
                void refresh();
              }}
            >
              Back to first topics page
            </button>
          )}
          {topics?.next && (
            <button
              disabled={loading}
              onClick={() => {
                setLaterPage(true);
                void refresh(topics.next, true);
              }}
            >
              Show more topics
            </button>
          )}
        </>
      )}
    </section>
  );
}
function TopicBranches({
  topics,
  onOpen,
}: {
  topics: any[];
  onOpen: (topic: any) => void;
}) {
  const byId = new Map(topics.map((t) => [t.id, t]));
  const branch = (node: TopicNode) => {
    const topic = byId.get(node.id);
    return (
      <li key={node.id}>
        {node.children.length ? (
          <details>
            <summary>
              <GitBranch size={19} aria-hidden="true" />
              <span>
                <strong>{topic.name}</strong>
                <span className="explore-meta">
                  {topic.posts} posts · {topic.ideas} current ideas
                </span>
              </span>
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <button className="secondary" onClick={() => onOpen(topic)}>
              Inspect {topic.name}
            </button>
            <ul>{node.children.map(branch)}</ul>
          </details>
        ) : (
          <button
            onClick={() => onOpen(topic)}
            aria-label={`Open ${topic.name}`}
          >
            <GitBranch size={19} aria-hidden="true" />
            <span>
              <strong>
                {topic.name}
                {topic.pinned ? " · Pinned" : ""}
              </strong>
              <span className="explore-meta">
                {topic.posts} posts · {topic.ideas} current ideas
                {topic.moreEvidence ? " · more evidence available" : ""}
              </span>
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        )}
      </li>
    );
  };
  return (
    <ul className="explore-category-tree">
      {buildTopicTree(topics).map(branch)}
    </ul>
  );
}
function Measurement({ value: m }: { value: any }) {
  return (
    <div className="explore-measurement">
      <p>
        <strong>{m.label}</strong>: {m.before}{" "}
        <ArrowRight size={14} aria-label="to" /> {m.after} {m.unit}
      </p>
      <p>
        {m.baselineSamples} baseline samples · {m.observationSamples}{" "}
        observation samples
      </p>
      <p>
        Baseline {new Date(m.baselineStart).toISOString().slice(0, 10)} to{" "}
        {new Date(m.baselineEnd).toISOString().slice(0, 10)}. Observation{" "}
        {new Date(m.observationStart).toISOString().slice(0, 10)} to{" "}
        {new Date(m.observationEnd).toISOString().slice(0, 10)}.
      </p>
      <p>Limitations: {m.limitations}</p>
    </div>
  );
}
