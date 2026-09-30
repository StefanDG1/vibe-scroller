"use client";
import { useState, useEffect, useRef, useEffectEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brand } from "./site";
type Initial = {
  aiPreference?: {
    preferChatGPTPlan: boolean;
    hostedStatus: string;
    active: boolean;
  };
  sources: any[];
  libraryNext?: string | null;
  repositories: any[];
  proposals: any[];
  runs: any[];
  notifications: any[];
  usage: any;
  devices?: any[];
  measured?: number;
  githubChoices?: { id: number; fullName: string; installationId: number }[];
  customerRoutes?: {
    status: string;
    models: { id: string; version: string; maxProviderUsdCents: number }[];
  };
};
const id = (o: any) => o._id ?? o.id;
const label = (s: string) => s.replaceAll("_", " ");
const blankPlan = {
  scope: "",
  nonGoals: [],
  files: [{ path: "", isNew: true }],
  steps: [""],
  tests: [""],
  risks: [],
  rollout: "",
  rollback: "",
  unknowns: [],
};
const Button = ({
  children,
  onClick,
  primary = false,
  disabled = false,
  busy = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  busy?: boolean;
}) => (
  <button
    type="button"
    disabled={busy || disabled}
    className={primary ? "primary" : "secondary"}
    onClick={onClick}
  >
    {children}
  </button>
);

export function Console({
  demo = false,
  readOnly = false,
  initial,
  organizationId,
  initialView = "home",
  initialSharedDraft = "",
  initialSearch = "",
  initialFilter = "",
}: {
  demo?: boolean;
  readOnly?: boolean;
  initial: Initial;
  organizationId: string;
  initialView?: string;
  initialSharedDraft?: string;
  initialSearch?: string;
  initialFilter?: string;
}) {
  const router = useRouter(),
    [data, setData] = useState(initial),
    [view, setView] = useState(
      initialView === "plans" ? "proposals" : initialView,
    ),
    [selected, setSelected] = useState<any>(null),
    [search, setSearch] = useState(initialSearch),
    [filter, setFilter] = useState(initialFilter),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [captureOpen, setCaptureOpen] = useState(
      !readOnly && Boolean(initialSharedDraft),
    ),
    [planText, setPlanText] = useState(JSON.stringify(blankPlan, null, 2)),
    [dark, setDark] = useState(false),
    [pairing, setPairing] = useState<{
      id: string;
      fingerprint: string;
      credentialHash: string;
      name: string;
    } | null>(null);
  const seenNotifications = useRef(new Set(initial.notifications.map(id)));
  const captureDialog = useRef<HTMLDialogElement>(null);
  const [sharedDraft, setSharedDraft] = useState(initialSharedDraft);
  const libraryRequest = useRef(0);
  async function loadLibrary(append = false) {
    if (demo) return;
    const generation = ++libraryRequest.current;
    const q = new URLSearchParams({ q: search, state: filter });
    if (append && data.libraryNext) q.set("cursor", data.libraryNext);
    const response = await fetch(`/api/library/${organizationId}?${q}`, {
      cache: "no-store",
    });
    if (!response.ok || response.redirected) return;
    const result = await response.json();
    if (generation !== libraryRequest.current) return;
    setData((current) => ({
      ...current,
      sources: append
        ? [
            ...current.sources,
            ...result.items.filter(
              (item: any) =>
                !current.sources.some((old) => id(old) === id(item)),
            ),
          ]
        : result.items,
      libraryNext: result.next,
    }));
  }
  const loadLibraryFromEffect = useEffectEvent(() => loadLibrary());
  useEffect(() => {
    if (demo || view !== "library") return;
    const timeout = setTimeout(() => {
      loadLibraryFromEffect().catch(() =>
        setNotice("Library search is unavailable. Try again."),
      );
    }, 250);
    return () => {
      clearTimeout(timeout);
      // oxlint-disable-next-line react-hooks/exhaustive-deps -- Invalidate this asynchronous request generation on cleanup.
      libraryRequest.current++;
    };
  }, [demo, organizationId, view, search, filter]);
  useEffect(() => {
    const draft = new URL(window.location.href).searchParams.get("draft");
    if (!demo && draft) {
      const url = new URL(window.location.href);
      url.searchParams.delete("draft");
      window.history.replaceState(null, "", url);
    }
  }, [demo]);
  useEffect(() => {
    if (!captureOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = captureDialog.current;
    dialog?.showModal();
    const controls = () =>
      [
        ...(dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
        ) ?? []),
      ].filter((element) => element.getClientRects().length);
    controls()[0]?.focus();
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setCaptureOpen(false);
      }
      if (event.key !== "Tab") return;
      const items = controls(),
        first = items[0],
        last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("keydown", keyboard);
      dialog?.close();
      previous?.focus();
    };
  }, [captureOpen]);
  function applyData(next: Initial) {
    setData(next);
    setSelected((current: any) =>
      current
        ? (next.proposals.find((p) => id(p) === id(current)) ??
          next.sources.find((s) => id(s) === id(current)) ??
          null)
        : null,
    );
    for (const notification of next.notifications) {
      if (
        !seenNotifications.current.has(id(notification)) &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("VibeScroller has an update", {
          body: "Open your private inbox to review it.",
          tag: id(notification),
        });
      }
      seenNotifications.current.add(id(notification));
    }
  }

  async function refreshData() {
    if (demo) return;
    const response = await fetch(`/api/workspace/${organizationId}`, {
      cache: "no-store",
    });
    if (
      response.ok &&
      !response.redirected &&
      response.headers.get("content-type")?.includes("application/json")
    )
      applyData(await response.json());
    else if (
      response.redirected ||
      response.status === 401 ||
      response.status === 403 ||
      response.status === 404
    ) {
      setSelected(null);
      setData({
        sources: [],
        repositories: [],
        proposals: [],
        runs: [],
        notifications: [],
        usage: null,
      });
    }
  }
  const refreshFromEffect = useEffectEvent(() => refreshData());
  useEffect(() => {
    if (demo || view === "library") return;
    const timer = setInterval(() => {
      refreshFromEffect().catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, [demo, organizationId, view]);
  const planIdentity = selected
    ? `${id(selected)}:${selected.planHash ?? ""}`
    : "";
  const [editedPlanIdentity, setEditedPlanIdentity] = useState("");
  if (editedPlanIdentity !== planIdentity) {
    setEditedPlanIdentity(planIdentity);
    setPlanText(JSON.stringify(selected?.plan ?? blankPlan, null, 2));
  }
  async function call(operation: string, args: any) {
    if (readOnly) {
      setNotice(
        "Your viewer role allows reading. Ask a workspace owner to change your role before making changes.",
      );
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      if (demo) {
        setNotice(
          "Synthetic demo action only. No provider, payment, execution or GitHub write occurred.",
        );
        return "demo";
      }
      const res = await fetch("/api/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation, args }),
      });
      if (res.redirected || res.status === 401 || res.status === 403) {
        setSelected(null);
        setData({
          sources: [],
          repositories: [],
          proposals: [],
          runs: [],
          notifications: [],
          usage: null,
        });
        throw new Error(
          "Your session or access changed. Sign in again to continue.",
        );
      }
      if (!res.headers.get("content-type")?.includes("application/json"))
        throw new Error(
          "The application host is temporarily unavailable. No success was confirmed. Check the inbox before retrying this action.",
        );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      await refreshData();
      router.refresh();
      setNotice("Saved. The server accepted this action.");
      return body.result;
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "The action failed.");
    } finally {
      setBusy(false);
    }
  }
  const go = (v: string) => {
    if (!demo && v === "billing") {
      router.push(`/app/${organizationId}/billing`);
      return;
    }
    setView(v);
    setSelected(null);
    if (v === "menu") return;
    if (!demo)
      history.replaceState(
        null,
        "",
        `/app/${organizationId}/${v === "home" ? "" : v}`,
      );
  };
  const filtered = data.sources.filter(
    (s) =>
      (!demo ||
        !search ||
        [s.title, s.summary, ...(s.mainPoints ?? [])]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (!demo ||
        !filter ||
        s.state === filter ||
        s.matches?.some((m: any) => m.disposition === filter)),
  );
  function findSource(s: any) {
    setSelected(s);
    setView("source");
  }
  const nav = [
    ["home", "Home", "⌂"],
    ["library", "Library", "▤"],
    ["projects", "Projects", "⑂"],
    ["inbox", "Inbox", "▣"],
    ["proposals", "Proposals", "◇"],
    ["runs", "Runs & PRs", "▷"],
    ["usage", "Usage", "◷"],
    ["connections", "Connections", "↔"],
    ["runners", "Computers", "▱"],
    ["privacy", "Privacy", "⊙"],
    ["billing", "Billing", "€"],
  ];
  const metrics = [
    data.sources.filter((s) => s.state === "ready" || s.summary).length,
    data.proposals.filter((p) => p.review === "accepted").length,
    new Set(data.runs.filter((r) => r.mergedAt).map((r) => r.prUrl)).size,
    data.measured ?? 0,
  ];
  return (
    <div className={`product-shell ${dark ? "dark" : ""}`}>
      <aside className="product-rail">
        <Brand />
        <p className="workspace-label">
          {demo ? "Demo workspace" : "Your workspace"}
        </p>
        <nav aria-label="Application">
          {nav.map(([key, title, icon]) => (
            <button
              key={key}
              className={view === key ? "active" : ""}
              onClick={() => go(key)}
            >
              <span aria-hidden="true">{icon}</span>
              {title}
            </button>
          ))}
        </nav>
        <div className="rail-bottom">
          <button onClick={() => setDark(!dark)}>
            {dark ? "Light appearance" : "Dark appearance"}
          </button>
          <Link href={demo ? "/app" : "/account"}>
            {demo ? "Open your own library" : "Account & sign out"}
          </Link>
          <Link href="/">Back to website</Link>
        </div>
      </aside>
      <div className="product-body">
        <header className="product-top">
          <div>
            <span className="status">
              {demo ? "Synthetic demo" : "Private workspace"}
            </span>
            <p>Make scrolling productive.</p>
          </div>
          <Button
            busy={busy}
            disabled={readOnly}
            primary
            onClick={() => setCaptureOpen(true)}
          >
            ＋ Add source
          </Button>
        </header>
        {readOnly && (
          <p className="demo-banner">
            Viewer access. You can read this workspace. Captures, edits,
            approvals, execution and billing changes require another role.
          </p>
        )}
        {demo && (
          <p className="demo-banner">
            Synthetic data only. No real videos, customer repositories, measured
            benefits or live execution.
          </p>
        )}
        <main id="main" className="product-main">
          <div className="page-heading">
            <div>
              <p className="muted">
                {demo
                  ? "Explore the review workflow"
                  : "Your next useful action"}
              </p>
              <h1>
                {view === "source"
                  ? selected?.title
                  : view === "proposal"
                    ? selected?.title
                    : (nav.find((n) => n[0] === view)?.[1] ?? "Review plan")}
              </h1>
            </div>
            {selected && (
              <Button
                busy={busy}
                onClick={() => go(view === "source" ? "library" : "proposals")}
              >
                Back to list
              </Button>
            )}
          </div>
          <output aria-live="polite" className={notice ? "notice" : "sr-only"}>
            {notice}
          </output>
          {(view === "home" || view === "library") && (
            <>
              <div className="attention">
                <div>
                  <h2>
                    {data.proposals.filter((p) => p.review === "unreviewed")
                      .length
                      ? `${data.proposals.filter((p) => p.review === "unreviewed").length} proposals to review`
                      : "Make room for the next useful idea."}
                  </h2>
                  <p>
                    Keep the evidence, review the fit, and choose what to build.
                  </p>
                </div>
                <Button busy={busy} onClick={() => go("proposals")}>
                  Review proposals
                </Button>
              </div>
              {view === "home" && (
                <div className="metric-strip">
                  {[
                    "Sources processed",
                    "Plans accepted",
                    "Unique PRs merged",
                    "Outcomes measured",
                  ].map((n, i) => (
                    <div key={n}>
                      <strong>{metrics[i]}</strong>
                      <span>{n}</span>
                      <small>
                        {i === 3
                          ? "Benefit needs your evidence"
                          : "Current workspace"}
                      </small>
                    </div>
                  ))}
                </div>
              )}
              <div className="library-tools">
                <label>
                  Search your library
                  <input
                    value={search}
                    placeholder="Title, summary or main point"
                    onChange={(e) => {
                      setSearch(e.target.value);
                      const u = new URL(location.href);
                      u.searchParams.set("q", e.target.value);
                      history.replaceState(null, "", u);
                    }}
                  />
                </label>
                <label>
                  Show
                  <select
                    value={filter}
                    onChange={(e) => {
                      setFilter(e.target.value);
                      const u = new URL(location.href);
                      u.searchParams.set("state", e.target.value);
                      history.replaceState(null, "", u);
                    }}
                  >
                    <option value="">All sources</option>
                    {[
                      "ready",
                      "needs_upload",
                      "no_fit",
                      "already_implemented",
                      "unsupported_claim",
                      "needs_context",
                    ].map((s) => (
                      <option key={s} value={s}>
                        {label(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  busy={busy}
                  onClick={() => {
                    setSearch("");
                    setFilter("");
                  }}
                >
                  Reset filters
                </Button>
              </div>
              <div className="source-list">
                {filtered.length ? (
                  filtered.map((s, i) => (
                    <article key={id(s)} className="source-card">
                      <button
                        className={`source-thumb art-${i % 4}`}
                        onClick={() => findSource(s)}
                        aria-label={`Open ${s.title}`}
                      >
                        <span>▶</span>
                        <small>
                          {s.kind === "text" ? "Supplied text" : "Saved source"}
                        </small>
                      </button>
                      <div className="source-card-body">
                        <div className="row spread">
                          <span className="muted">
                            {demo
                              ? "Illustrative source"
                              : label(s.state ?? "ready")}
                          </span>
                          <span className="coverage">{label(s.coverage)}</span>
                        </div>
                        <button
                          className="title-button"
                          onClick={() => findSource(s)}
                        >
                          <h2>{s.title}</h2>
                        </button>
                        <p>
                          {s.summary ??
                            (s.state === "needs_upload"
                              ? "This source needs permitted content. Metadata is not an analysis."
                              : s.state === "failed"
                                ? "Analysis needs attention. Open the source for its next step."
                                : "Source saved. Review and approve analysis to get its summary.")}
                        </p>
                        <ul className="point-preview">
                          {s.mainPoints?.slice(0, 3).map((p: string) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                        <div className="row wrap">
                          {s.matches?.map((m: any) => (
                            <span className="status" key={m.repositoryId}>
                              {label(m.disposition)}
                            </span>
                          ))}
                          {s.tags?.map((t: string) => (
                            <span className="tag" key={t}>
                              {t}
                            </span>
                          ))}
                          {s.pullRequests?.length > 0 && (
                            <span className="tag">
                              {
                                s.pullRequests.filter((p: any) => p.mergedAt)
                                  .length
                              }{" "}
                              merged PR ·{" "}
                              {
                                s.pullRequests.filter(
                                  (p: any) => p.state === "open",
                                ).length
                              }{" "}
                              open
                            </span>
                          )}
                        </div>
                      </div>
                      <Button busy={busy} onClick={() => findSource(s)}>
                        Open details
                      </Button>
                    </article>
                  ))
                ) : (
                  <div className="empty">
                    <h2>
                      {data.sources.length
                        ? "No sources match these filters."
                        : "Your library starts here."}
                    </h2>
                    <p>
                      {data.sources.length
                        ? "Reset the filters to see your saved sources."
                        : "Add a supported link, upload permitted content, or supply a transcript."}
                    </p>
                    <Button
                      busy={busy}
                      primary
                      onClick={() => setCaptureOpen(true)}
                    >
                      Add your first source
                    </Button>
                  </div>
                )}
              </div>
              {!demo && data.libraryNext && (
                <Button
                  busy={busy}
                  onClick={() =>
                    loadLibrary(true).catch(() =>
                      setNotice("Could not load the next page."),
                    )
                  }
                >
                  Load more sources
                </Button>
              )}
            </>
          )}
          {view === "source" && selected && (
            <SourceDetail
              key={id(selected)}
              source={selected}
              demo={demo}
              org={organizationId}
              repos={data.repositories}
              call={call}
              onProposal={(p: any) => {
                setSelected(p);
                setView("proposal");
              }}
            />
          )}
          {view === "projects" && (
            <>
              <p>
                Only explicitly selected GitHub App repositories are analyzed.
                Confirm a profile before matching.
              </p>
              <form
                className="panel form-grid"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const choice = data.githubChoices?.find(
                    (r) =>
                      `${r.installationId}:${r.id}` === f.get("repository"),
                  );
                  if (!choice) return;
                  await call("connectRepository", {
                    organizationId,
                    installationId: choice.installationId,
                    providerId: choice.id,
                    fullName: choice.fullName,
                  });
                }}
              >
                <h2>Select a repository</h2>
                <p>
                  Install the GitHub App on the repositories you choose, then
                  link your GitHub account to this workspace.
                </p>
                <a
                  href="https://github.com/apps/vibescroller-stefandg1-staging/installations/new"
                  target="_blank"
                  rel="noreferrer"
                >
                  Install the staging GitHub App
                </a>
                {!demo && (
                  <a
                    href={`/api/github/connect?organizationId=${organizationId}`}
                  >
                    Link GitHub account
                  </a>
                )}
                <label>
                  Authorized repository
                  <select name="repository" required defaultValue="">
                    <option value="" disabled>
                      Choose a repository
                    </option>
                    {data.githubChoices?.map((r) => (
                      <option
                        key={`${r.installationId}:${r.id}`}
                        value={`${r.installationId}:${r.id}`}
                      >
                        {r.fullName}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="primary"
                  disabled={busy || !data.githubChoices?.length}
                >
                  Verify and snapshot selected repository
                </button>
              </form>
              {data.repositories.map((r) => (
                <form
                  className="panel"
                  key={id(r)}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    call("saveProfile", {
                      id: id(r),
                      profile: f.get("profile"),
                      confirmed: f.get("confirmed") === "on",
                      enabled: f.get("enabled") === "on",
                    });
                  }}
                >
                  <h2>{r.fullName}</h2>
                  <p className="code-label">Base {r.sha}</p>
                  <Button
                    busy={busy}
                    disabled={readOnly || !r.enabled || !!r.profileDraftKey}
                    onClick={() =>
                      call("draftProfile", { id: id(r), maxCredits: 10 })
                    }
                  >
                    Draft a business profile · reserve up to 10 credits
                  </Button>
                  {r.profileDraft &&
                    r.profileDraftSha === r.sha &&
                    r.profileDraftVersion === r.profileVersion && (
                      <details>
                        <summary>
                          Unconfirmed AI draft. Edit the profile below before
                          confirming.
                        </summary>
                        <pre>{r.profileDraft}</pre>
                        <Button
                          busy={busy}
                          onClick={() => {
                            const form =
                              document.querySelector<HTMLTextAreaElement>(
                                `textarea[data-repository="${id(r)}"]`,
                              );
                            if (form) {
                              form.value = r.profileDraft;
                              const confirmation =
                                form.form?.querySelector<HTMLInputElement>(
                                  'input[name="confirmed"]',
                                );
                              if (confirmation) confirmation.checked = false;
                              form.focus();
                            }
                          }}
                        >
                          Copy draft into the editable profile
                        </Button>
                      </details>
                    )}
                  <label>
                    Purpose, audience, stage, goals, business model, constraints
                    and non-goals
                    <textarea
                      data-repository={id(r)}
                      name="profile"
                      defaultValue={r.profile}
                      onChange={(event) => {
                        const confirmation =
                          event.currentTarget.form?.querySelector<HTMLInputElement>(
                            'input[name="confirmed"]',
                          );
                        if (confirmation) confirmation.checked = false;
                      }}
                      rows={7}
                    />
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      name="confirmed"
                      defaultChecked={r.confirmed}
                    />
                    I confirm this business profile
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      name="enabled"
                      defaultChecked={r.enabled}
                    />
                    Enable matching for this repository
                  </label>
                  <button className="secondary" disabled={busy}>
                    Save profile
                  </button>
                </form>
              ))}
              {demo && (
                <div className="panel">
                  <h2>Demo Planner</h2>
                  <p>
                    Purpose: help people organize a small project. Audience:
                    first-time planners. Goal: a clear first useful result.
                    Non-goal: changing account or payment logic.
                  </p>
                  <span className="status">Synthetic confirmed profile</span>
                </div>
              )}
            </>
          )}
          {view === "proposals" && (
            <>
              {data.proposals.length ? (
                data.proposals.map((p) => (
                  <article className="panel" key={id(p)}>
                    <span className="status">{label(p.disposition)}</span>
                    <h2>{p.title}</h2>
                    <p>{p.detail?.currentProblem}</p>
                    <p>{label(p.review)}</p>
                    <Button
                      busy={busy}
                      onClick={() => {
                        setSelected(p);
                        setView("proposal");
                      }}
                    >
                      Review proposal
                    </Button>
                  </article>
                ))
              ) : (
                <div className="empty">
                  <h2>No proposals to review.</h2>
                  <p>
                    Analyze a source and match it to a confirmed repository. No
                    useful match is a valid result.
                  </p>
                  {demo && (
                    <Button
                      busy={busy}
                      onClick={() => {
                        setSelected({
                          id: "demo-proposal",
                          title: "Preview a useful result before setup",
                          disposition: "relevant",
                          review: "unreviewed",
                          version: 1,
                          detail: {
                            currentProblem:
                              "Demo Planner opens with an empty view.",
                            proposedChange:
                              "Offer a reversible populated example.",
                            benefitHypothesis:
                              "A first-time visitor may understand the product sooner.",
                            risks: [
                              "Sample data could be mistaken for a saved project.",
                            ],
                            acceptanceCriteria: [
                              "Sample remains labeled",
                              "Start fresh removes the example",
                            ],
                          },
                        });
                        setView("proposal");
                      }}
                    >
                      Open synthetic proposal
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
          {view === "proposal" && selected && (
            <>
              <span className="status">{label(selected.disposition)}</span>
              {selected.reviewerCorrection && (
                <p className="notice">
                  Reviewer correction: {label(selected.reviewerCorrection.to)}.
                  Original model assessment:{" "}
                  {label(selected.reviewerCorrection.from)}. Reason:{" "}
                  {selected.reviewerCorrection.reason}
                </p>
              )}
              {!demo && (
                <form
                  className="panel form-grid"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    await call("decide", {
                      id: id(selected),
                      version: selected.version,
                      decision: "accepted",
                      disposition: form.get("disposition"),
                      note: form.get("reason"),
                    });
                  }}
                >
                  <h2>Review the assessment</h2>
                  <label>
                    Reviewer assessment
                    <select
                      name="disposition"
                      defaultValue={selected.disposition}
                    >
                      {[
                        "relevant",
                        "no_fit",
                        "already_implemented",
                        "unsupported_claim",
                        "needs_context",
                        "defer",
                      ].map((value) => (
                        <option key={value} value={value}>
                          {label(value)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Evidence and reason for any correction
                    <textarea
                      name="reason"
                      maxLength={2000}
                      placeholder="Explain the source and repository evidence. Changing an assessment requires a reason."
                    />
                  </label>
                  <button className="primary" disabled={busy} type="submit">
                    Accept reviewed relevant proposal
                  </button>
                </form>
              )}

              <section className="panel">
                <h2>Why this project?</h2>
                <p>{selected.detail?.currentProblem}</p>
                <h3>Proposed change</h3>
                <p>
                  {selected.detail?.proposedChange ??
                    "No code change recommended."}
                </p>
                <h3>Expected benefit, as a hypothesis</h3>
                <p>
                  {selected.detail?.benefitHypothesis ?? "No benefit claim."}
                </p>
                <h3>Risks and reasons to reject</h3>
                <ul>
                  {selected.detail?.risks?.map((s: string) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <h3>Acceptance criteria</h3>
                <ul>
                  {selected.detail?.acceptanceCriteria?.map((s: string) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <details>
                  <summary>Source and repository evidence</summary>
                  <pre>
                    {JSON.stringify(
                      {
                        source: selected.detail?.sourceEvidence,
                        repository: selected.detail?.repositoryEvidence,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
                <div className="row wrap">
                  {["rejected", "deferred", "accepted"].map((d) => (
                    <Button
                      busy={busy}
                      key={d}
                      primary={d === "accepted"}
                      onClick={async () => {
                        await call("decide", {
                          id: id(selected),
                          version: selected.version,
                          decision: d,
                          note: "",
                        });
                        if (demo) setSelected({ ...selected, review: d });
                      }}
                    >
                      {d === "accepted"
                        ? "Accept proposal"
                        : d === "rejected"
                          ? "Reject"
                          : "Defer"}
                    </Button>
                  ))}
                </div>
              </section>
              <section className="panel">
                <h2>Review and edit the plan</h2>
                <Button
                  busy={busy}
                  disabled={selected.review !== "accepted"}
                  onClick={() =>
                    call("draftPlan", {
                      id: id(selected),
                      version: selected.version,
                      maxCredits: 10,
                    })
                  }
                >
                  Draft an editable plan, maximum 10 credits
                </Button>
                {selected.planDraft &&
                  selected.planDraftVersion === selected.version && (
                    <details>
                      <summary>Unconfirmed AI plan draft</summary>
                      <pre>{JSON.stringify(selected.planDraft, null, 2)}</pre>
                      <Button
                        busy={busy}
                        onClick={() =>
                          setPlanText(
                            JSON.stringify(selected.planDraft, null, 2),
                          )
                        }
                      >
                        Copy draft into the editable plan
                      </Button>
                      <p>
                        Review and save a new version before execution. This
                        draft grants no coding permission.
                      </p>
                    </details>
                  )}
                <p>
                  Acceptance does not authorize execution. Files marked existing
                  must appear in the repository snapshot. Saving creates a new
                  immutable plan hash.
                </p>
                <label>
                  Structured plan
                  <textarea
                    className="plan-editor"
                    rows={16}
                    value={planText}
                    onChange={(e) => setPlanText(e.target.value)}
                  />
                </label>
                <Button
                  busy={busy}
                  onClick={async () => {
                    try {
                      await call("editPlan", {
                        id: id(selected),
                        version: selected.version,
                        plan: JSON.parse(planText),
                      });
                    } catch {
                      setNotice(
                        "The plan must be valid JSON with all required sections.",
                      );
                    }
                  }}
                >
                  Save new plan version
                </Button>
                <Button
                  busy={busy}
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(
                      new Blob([planText], { type: "application/json" }),
                    );
                    a.download = "vibescroller-plan.json";
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                >
                  Export plan
                </Button>
              </section>
              <ExecutionApproval
                proposal={selected}
                call={call}
                routes={data.customerRoutes}
              />
            </>
          )}
          {view === "runs" && (
            <>
              {data.runs.length ? (
                data.runs.map((r) => (
                  <RunCard key={id(r)} run={r} call={call} />
                ))
              ) : (
                <div className="empty">
                  <h2>No authorized runs yet.</h2>
                  <p>
                    Approve a reviewed plan with a specific executor and funding
                    route. An offline laptop never triggers a cloud charge.
                  </p>
                </div>
              )}
            </>
          )}
          {view === "inbox" && (
            <>
              <p>
                Notifications use safe previews. Telegram is planned for later.
                Messages never approve execution.
              </p>
              {data.notifications.length ? (
                data.notifications.map((n) => (
                  <article className="panel" key={id(n)}>
                    <p>{n.message}</p>
                    <small>{new Date(n.createdAt).toLocaleString()}</small>
                  </article>
                ))
              ) : (
                <div className="empty">
                  <h2>You're caught up.</h2>
                  <p>Processing and review notifications will appear here.</p>
                </div>
              )}
              <Button
                busy={busy}
                onClick={async () => {
                  if (!("Notification" in window)) {
                    setNotice(
                      "This browser does not support desktop notifications. Use the inbox.",
                    );
                    return;
                  }
                  const result = await Notification.requestPermission();
                  setNotice(
                    result === "granted"
                      ? "Browser notifications allowed. Delivery still requires an open application or a configured push service."
                      : "Browser notifications remain off. The inbox is available.",
                  );
                }}
              >
                Enable browser notification permission
              </Button>
              <Button
                busy={busy}
                onClick={() =>
                  call("preferences", {
                    organizationId,
                    email: true,
                    telegram: false,
                    analytics: false,
                    legalVersion: "draft-v1",
                  })
                }
              >
                Request email notifications
              </Button>
              <p>
                Email stays unavailable until a verified sender is connected.
              </p>
            </>
          )}
          {view === "usage" && (
            <>
              <div className="panel">
                <h2>Your allowance</h2>
                <p>
                  Trial: 30 credits and up to 3 sources. No automatic paid
                  conversion.
                </p>
                <pre>
                  {JSON.stringify(
                    data.usage ?? { granted: 30, reserved: 0, spent: 0 },
                    null,
                    2,
                  )}
                </pre>
              </div>
              <p>
                Reservations reduce available credits before work starts. Unused
                reservations release after reconciled settlement. API and cloud
                costs need an explicit quote.
              </p>
            </>
          )}
          {view === "connections" && (
            <>
              <section className="panel">
                <h2>Your ChatGPT plan</h2>
                <p>
                  Prefer your own allowance for eligible AI requests and keep
                  VibeScroller inference credits for other work. ChatGPT limits
                  still apply; transcription, storage and cloud execution have
                  separate costs.
                </p>
                <label>
                  <input
                    type="checkbox"
                    checked={data.aiPreference?.preferChatGPTPlan ?? false}
                    disabled={demo || busy}
                    onChange={async (event) => {
                      const preferChatGPTPlan = event.target.checked;
                      const result = await call("aiPreference", {
                        organizationId,
                        preferChatGPTPlan,
                      });
                      if (result)
                        setData((current) => ({
                          ...current,
                          aiPreference: {
                            preferChatGPTPlan,
                            hostedStatus: "awaiting_commercial_access",
                            active: false,
                          },
                        }));
                    }}
                  />
                  Prefer my ChatGPT plan when available
                </label>
                <p className="notice">
                  Hosted connection is awaiting OpenAI commercial access. Saving
                  this preference does not connect an account, grant consent, or
                  change the funding route of a current task.
                </p>
                <p>
                  The optional local text adapter is in the source repository.
                  It requires an eligible deployment, official account consent
                  and a completed inference test. Coding still requires verified
                  isolation and separate approval.
                </p>
                <a
                  href="https://chatgpt.com/settings/usage"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Manage ChatGPT app access and usage
                </a>
              </section>
              <div className="panel">
                <h2>GitHub</h2>
                <p>
                  Install the VibeScroller GitHub App on selected repositories.
                  Administration and workflow write are not requested by
                  default.
                </p>
                <Button busy={busy} onClick={() => go("projects")}>
                  Manage selected repositories
                </Button>
                <Button
                  busy={busy}
                  onClick={() =>
                    call("revoke", { organizationId, provider: "github" })
                  }
                >
                  Disconnect GitHub
                </Button>
              </div>
              <form
                className="panel"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  call("saveKey", { organizationId, secret: f.get("secret") });
                  e.currentTarget.reset();
                }}
              >
                <h2>Your OpenAI API credential</h2>
                <p>
                  Provider charges are separate. The server encrypts this
                  credential; the browser does not retain it. Saving does not
                  activate execution. Sign in again before saving or testing.
                </p>
                <p>
                  Status: {label(data.customerRoutes?.status ?? "disconnected")}
                  . {data.customerRoutes?.models.length ?? 0} reviewed models
                  available.
                </p>
                <label>
                  API key
                  <input
                    name="secret"
                    type="password"
                    autoComplete="off"
                    required
                  />
                </label>
                <button className="primary" disabled={busy}>
                  Encrypt and save credential
                </button>
                <Button
                  busy={busy}
                  onClick={() => call("testKey", { organizationId })}
                >
                  Verify credential with a model-list request
                </Button>
                <p className="fine">
                  Verification sends no inference request. Coding requires a
                  separate USD provider ceiling and platform compute allowance.
                  No reviewed available model means this route stays
                  unavailable.
                </p>
                <Button
                  busy={busy}
                  onClick={() =>
                    call("revoke", { organizationId, provider: "openai" })
                  }
                >
                  Revoke credential
                </Button>
              </form>
              <div className="panel">
                <h2>Telegram</h2>
                <p>
                  Planned for later. Use the web inbox now. Setup needs a
                  BotFather bot, secret webhook, numeric-user pairing and replay
                  tests.
                </p>
              </div>
            </>
          )}
          {view === "runners" && (
            <>
              <div className="panel">
                <h2>Optional laptop execution</h2>
                <p>
                  Pair a named computer, confirm its fingerprint, map
                  repositories, and verify Windows isolation. Official Codex
                  app-server keeps authentication on the computer. No inbound
                  port is required.
                </p>
                <p className="notice">
                  Execution is blocked until its isolation tests pass. A
                  worktree alone is not a sandbox.
                </p>
                <Link href="/docs">Read runner setup</Link>
              </div>
              {!readOnly && (
                <section className="panel">
                  <h2>Pair this computer</h2>
                  <p>
                    Run the documented local pairing command, then paste its
                    public request here. Check its fingerprint against the
                    terminal before confirming. A fresh sign-in is required.
                  </p>
                  <form
                    className="form-grid"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        const value = JSON.parse(
                          String(
                            new FormData(e.currentTarget).get("request") ?? "",
                          ),
                        );
                        if (
                          Object.keys(value).sort().join(",") !==
                            "codeHash,credentialHash,fingerprint,name,workspaceId" ||
                          typeof value.name !== "string" ||
                          value.workspaceId !== organizationId ||
                          ![
                            value.codeHash,
                            value.credentialHash,
                            value.fingerprint,
                          ].every(
                            (v) =>
                              typeof v === "string" && /^[a-f0-9]{64}$/.test(v),
                          )
                        )
                          throw new Error("Invalid public pairing request.");
                        const deviceId = await call("startDevice", {
                          organizationId,
                          name: value.name,
                          fingerprint: value.fingerprint,
                          codeHash: value.codeHash,
                        });
                        if (deviceId)
                          setPairing({
                            id: deviceId,
                            name: value.name,
                            fingerprint: value.fingerprint,
                            credentialHash: value.credentialHash,
                          });
                      } catch {
                        setNotice(
                          "Paste the public request generated by your runner. Do not paste keys or login tokens.",
                        );
                      }
                    }}
                  >
                    <label>
                      Public pairing request
                      <textarea
                        name="request"
                        required
                        maxLength={1200}
                        rows={5}
                      />
                    </label>
                    <button className="secondary" disabled={busy}>
                      Review device request
                    </button>
                  </form>
                  {pairing && (
                    <div>
                      <h3>Confirm {pairing.name}</h3>
                      <p className="code-label">
                        Fingerprint {pairing.fingerprint}
                      </p>
                      <p>
                        Confirm only if this fingerprint matches the computer
                        you control. Pairing enables communication. Coding still
                        requires separately verified isolation and an approved
                        plan.
                      </p>
                      <Button
                        busy={busy}
                        onClick={async () => {
                          const result = await call("approveDevice", {
                            id: pairing.id,
                            fingerprint: pairing.fingerprint,
                            credentialHash: pairing.credentialHash,
                          });
                          if (result !== undefined) setPairing(null);
                        }}
                      >
                        Confirm matching computer
                      </Button>
                    </div>
                  )}
                </section>
              )}
              {data.devices?.map((d) => (
                <article className="panel" key={id(d)}>
                  <h3>{d.name}</h3>
                  <p>
                    {d.state} · Fingerprint {d.fingerprint}
                  </p>
                  <Button
                    busy={busy}
                    onClick={() => call("revokeDevice", { id: id(d) })}
                  >
                    Revoke computer
                  </Button>
                </article>
              ))}
            </>
          )}
          {view === "privacy" && (
            <>
              <div className="panel">
                <h2>Your content and preferences</h2>
                <p>
                  Sources, summaries and project context belong to your
                  workspace. Original media expires within the configured
                  retention window. Source deletion blocks access immediately
                  and schedules cleanup.
                </p>
                <a
                  className="secondary"
                  href={`/app/${organizationId}/content-export`}
                >
                  Export workspace content
                </a>
                <Link
                  className="secondary"
                  href={`/app/${organizationId}/settings`}
                >
                  Delete workspace
                </Link>
                <Link className="secondary" href="/account">
                  Account export & deletion
                </Link>
              </div>
              <Button
                busy={busy}
                onClick={() =>
                  call("preferences", {
                    organizationId,
                    email: false,
                    telegram: false,
                    analytics: false,
                    legalVersion: "draft-v1",
                  })
                }
              >
                Turn off optional notifications and analytics
              </Button>
              <p>
                No private service-worker cache or cross-workspace content
                reuse.
              </p>
            </>
          )}
          {view === "billing" && (
            <>
              <div className="panel">
                <h2>Live checkout is disabled</h2>
                <p>
                  Tax mode: pending evidence. The intended exemption strategy is
                  not a claim about the company's registration. Ordinary VAT,
                  special registration and destination treatment need matching
                  official records.
                </p>
                <Link className="secondary" href="/pricing">
                  View six catalogue prices and allowances
                </Link>
                <Link
                  className="secondary"
                  href={`/app/${organizationId}/billing`}
                >
                  Billing portal and subscription status
                </Link>
              </div>
              <p>
                Cancellation, refunds and invoice compliance remain
                server-authorized workflows. A checkout return does not grant
                credits.
              </p>
            </>
          )}
        </main>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {nav.slice(0, 4).map(([key, title, icon]) => (
            <button
              className={view === key ? "active" : ""}
              key={key}
              onClick={() => go(key)}
            >
              <span aria-hidden="true">{icon}</span>
              {title}
            </button>
          ))}
          <button aria-expanded={view === "menu"} onClick={() => go("menu")}>
            More
          </button>
        </nav>
      </div>
      {view === "menu" && (
        <section className="capture-modal" aria-label="All application pages">
          <h2>More pages</h2>
          <nav aria-label="All mobile pages" className="form-grid">
            {nav.slice(4).map(([key, title]) => (
              <button key={key} onClick={() => go(key)}>
                {title}
              </button>
            ))}
          </nav>
        </section>
      )}
      {captureOpen && (
        <div className="modal-backdrop">
          <dialog
            ref={captureDialog}
            aria-labelledby="capture-title"
            className="capture-modal"
          >
            <div className="row spread">
              <h2 id="capture-title">Add to your library</h2>
              <Button busy={busy} onClick={() => setCaptureOpen(false)}>
                Close
              </Button>
            </div>
            <CaptureForm
              sharedDraft={sharedDraft}
              demo={demo}
              organizationId={organizationId}
              call={call}
              onDone={() => {
                setCaptureOpen(false);
                setSharedDraft("");
              }}
            />
          </dialog>
        </div>
      )}
    </div>
  );
}
function CaptureForm({
  demo,
  organizationId,
  call,
  onDone,
  existingSourceId,
  sharedDraft,
}: any) {
  const [kind, setKind] = useState(existingSourceId ? "upload" : "url");
  const [manifest, setManifest] = useState<any>(null);
  const [importError, setImportError] = useState("");
  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        if (demo) {
          await call("capture", { synthetic: true });
          onDone();
          return;
        }
        if (kind === "import") {
          try {
            setImportError("");
            const file = f.get("import") as File;
            if (!file || file.size > 140000)
              throw new Error(
                "Choose a CSV or JSON file within 140 KB, with up to 500 links.",
              );
            const text = new TextDecoder("utf-8", { fatal: true }).decode(
              await file.arrayBuffer(),
            );
            const result = await call("importLinks", {
              organizationId,
              key: crypto.randomUUID(),
              format: file.name.toLowerCase().endsWith(".json")
                ? "json"
                : "csv",
              text,
              rightsAttested: f.get("rights") === "on",
            });
            if (result) setManifest(result);
          } catch (error) {
            setImportError(
              error instanceof Error ? error.message : "Import failed.",
            );
          }
          return;
        }
        if (kind === "upload") {
          const file = f.get("file") as File;
          if (file.size > 250000000)
            throw new Error("The maximum upload is 250 MB.");
          const g = await fetch("/api/uploads/grant", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              organizationId,
              type: file.type,
              size: file.size,
            }),
          }).then((r) => r.json());
          if (g.error) {
            alert(g.error);
            return;
          }
          const uploaded = await fetch(g.url, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!uploaded.ok) {
            alert("Upload failed. No source was attached.");
            return;
          }
          const done = await fetch("/api/uploads/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ organizationId, key: g.key }),
          }).then((r) => r.json());
          if (done.error) {
            alert(done.error);
            return;
          }
          if (existingSourceId)
            await call("attachSource", {
              id: existingSourceId,
              objectKey: g.key,
              rightsAttested: f.get("rights") === "on",
            });
          else
            await call("capture", {
              organizationId,
              key: crypto.randomUUID(),
              kind,
              title: f.get("title"),
              objectKey: g.key,
              rightsAttested: true,
            });
        } else if (existingSourceId)
          await call("attachSource", {
            id: existingSourceId,
            text: f.get("text"),
            rightsAttested: f.get("rights") === "on",
          });
        else
          await call("capture", {
            organizationId,
            key: crypto.randomUUID(),
            kind,
            title: f.get("title"),
            ...(kind === "url"
              ? { url: f.get("url") }
              : { text: f.get("text") }),
            rightsAttested: f.get("rights") === "on",
          });
        onDone();
      }}
    >
      <label>
        Source type
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          {!existingSourceId && <option value="url">Video URL</option>}
          {!existingSourceId && (
            <option value="import">CSV or JSON link import</option>
          )}
          <option value="upload">Permitted media upload</option>
          <option value="text">Supplied transcript</option>
        </select>
      </label>
      {!existingSourceId && kind !== "import" && (
        <label>
          Title
          <input name="title" required maxLength={160} />
        </label>
      )}
      {kind === "import" ? (
        <label>
          CSV or JSON, up to 500 links
          <input
            name="import"
            type="file"
            accept=".csv,.json,text/csv,application/json"
            required
          />
          <span className="fine">
            Use url with optional title, collection, saved_at. Original dates
            use UTC ISO timestamps. Links are saved without analysis charges.
          </span>
        </label>
      ) : kind === "url" ? (
        <label>
          Source URL
          <input
            name="url"
            type="url"
            defaultValue={sharedDraft ?? ""}
            placeholder="https://..."
            required
          />
        </label>
      ) : kind === "text" ? (
        <label>
          Original supplied text
          <textarea name="text" rows={7} required maxLength={60000} />
        </label>
      ) : (
        <label>
          Video or audio, up to 250 MB and 10 minutes
          <input
            name="file"
            type="file"
            accept="video/mp4,video/webm,audio/mpeg,audio/wav"
            required
          />
        </label>
      )}
      <label className="check">
        <input name="rights" type="checkbox" required />I may submit this
        content for processing
      </label>
      <p className="fine">
        Saving is separate from analysis. Review the quote before processing.
        Supplied text has no implied audio or visual coverage.
      </p>
      <button className="primary">
        {demo
          ? "Save synthetic demo source"
          : kind === "import"
            ? "Import permitted links"
            : existingSourceId
              ? "Attach permitted content"
              : "Save source"}
      </button>
      {importError && <p role="alert">{importError}</p>}
      {manifest && (
        <section aria-label="Import manifest">
          <output>
            {manifest.accepted} saved, {manifest.duplicate} duplicates,{" "}
            {manifest.invalid} invalid, {manifest.unsupported} unsupported,{" "}
            {manifest.waiting} waiting. Analysis credits charged:{" "}
            {manifest.analysisCreditsCharged}.
          </output>
          <ol>
            {manifest.entries.map((entry: any) => (
              <li key={entry.row}>
                Row {entry.row}: {entry.status}
                {entry.message ? `. ${entry.message}` : ""}
              </li>
            ))}
          </ol>
        </section>
      )}
    </form>
  );
}
function SourceDetail({ source, demo, org, repos, call, onProposal }: any) {
  const [detail, setDetail] = useState(source);
  const [selectedInsight, setSelectedInsight] = useState("");
  const insightId = selectedInsight || detail.analysis?.insights?.[0]?.id;
  const selection =
    detail.repositorySelection?.insightId === insightId
      ? detail.repositorySelection
      : undefined;
  useEffect(() => {
    if (demo) return;
    const abort = new AbortController();
    fetch(`/api/source/${id(source)}`, {
      cache: "no-store",
      signal: abort.signal,
    })
      .then(async (response) => {
        if (
          !response.ok ||
          !response.headers.get("content-type")?.includes("application/json")
        )
          throw new Error("Source unavailable");
        const next = await response.json();
        if (!abort.signal.aborted) setDetail(next);
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setDetail({
            ...source,
            analysis: undefined,
            text: undefined,
            originalText: undefined,
            summary: undefined,
            repositorySelection: undefined,
            error:
              "Source details are unavailable. Check access before continuing.",
          });
      });
    return () => abort.abort();
  }, [source, demo]);
  return (
    <>
      <div className="panel">
        <span className="coverage">
          {label(detail.coverage ?? "metadata_only")}
        </span>
        <h2>AI summary</h2>
        <p>
          {detail.summary ??
            "No analysis available. Upload permitted content or supply a transcript."}
        </p>
        {detail.error && (
          <p className="error" role="alert">
            {detail.error}
          </p>
        )}
        {!!detail.analysis?.warnings?.length && (
          <section aria-label="Analysis limitations">
            <h3>Limitations and uncertainty</h3>
            <ul>
              {detail.analysis.warnings.map(
                (warning: string, index: number) => (
                  <li key={index}>{warning}</li>
                ),
              )}
            </ul>
          </section>
        )}
        {detail.url && (
          <a href={detail.url} target="_blank" rel="noopener noreferrer">
            Original source
          </a>
        )}
        <p className="fine">
          {detail.createdAt
            ? `Captured ${new Date(detail.createdAt).toLocaleString()}.`
            : "Synthetic example; no real capture date."}
          {detail.originalSavedAt
            ? ` Original save date supplied by the import: ${new Date(detail.originalSavedAt).toLocaleString()}.`
            : " Original save date unknown."}{" "}
          Sampled evidence is not exhaustive analysis.
        </p>
      </div>
      <section className="panel">
        <h2>Main points</h2>
        {(
          detail.analysis?.insights ??
          detail.mainPoints?.map((t: string) => ({
            title: t,
            claim: t,
            evidence: [],
          })) ??
          []
        ).map((i: any) => (
          <article className="insight" key={i.id ?? i.title}>
            <h3>{i.title}</h3>
            <p>{i.claim}</p>
            <p>{i.interpretation}</p>
            <span className="status">
              {i.confidence ?? "Synthetic evidence"}
            </span>
            <ul>
              {i.evidence?.map((e: any) => (
                <li key={e.id}>
                  {e.kind} · {e.id} ·{" "}
                  {e.startMs === null
                    ? "Supplied text"
                    : `${e.startMs / 1000}s`}
                  {e.kind === "frame" && !demo && (
                    <a
                      href={`/api/evidence/${encodeURIComponent(e.id)}?view=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View private frame
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </article>
        ))}
        <details>
          <summary>Original transcript and corrections</summary>
          <p style={{ whiteSpace: "pre-wrap" }}>
            {detail.originalText ??
              detail.text ??
              "Original transcript is unavailable."}
          </p>
          {detail.originalText && <p>Current user correction: {detail.text}</p>}
          {(detail.originalMediaEvidence ?? detail.mediaEvidence)
            ?.filter((e: any) => e.kind === "transcript")
            .map((e: any) => (
              <p key={e.id} className="fine">
                Original transcript segment: {(e.startMs / 1000).toFixed(1)}–
                {(e.endMs / 1000).toFixed(1)} seconds.
              </p>
            ))}
          {detail.analysis?.correctedText && (
            <p>Confirmed correction: {detail.analysis.correctedText}</p>
          )}
        </details>
      </section>
      {detail.state === "needs_upload" && (
        <section className="panel">
          <h2>Supply permitted content</h2>
          <p>
            This saved URL has no verified audiovisual analysis. Attach a
            permitted upload or supplied transcript to this saved source.
          </p>
          <CaptureForm
            demo={demo}
            organizationId={org}
            call={call}
            existingSourceId={id(source)}
            onDone={() => {}}
          />
        </section>
      )}
      <details className="panel">
        <summary>Edit summary, tags and transcript correction</summary>
        <form
          key={`${id(source)}:${detail.updatedAt}`}
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            await call("editSource", {
              id: id(source),
              summary: f.get("summary"),
              tags: String(f.get("tags") ?? "")
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
              ...(f.get("correction")
                ? { correctedText: f.get("correction") }
                : {}),
            });
          }}
        >
          <label>
            Summary
            <textarea
              name="summary"
              maxLength={1500}
              defaultValue={detail.summary ?? ""}
            />
          </label>
          <label>
            Tags, separated by commas
            <input name="tags" defaultValue={detail.tags?.join(", ") ?? ""} />
          </label>
          <label>
            Transcript correction, retained beside the original
            <textarea
              name="correction"
              maxLength={60000}
              defaultValue={detail.analysis?.correctedText ?? ""}
            />
          </label>
          <button className="primary">Save source edits</button>
        </form>
      </details>
      <section className="panel">
        <h2>Applies to your projects</h2>
        {detail.analysis?.insights?.length > 0 && (
          <>
            <label>
              Main point for project selection
              <select
                value={insightId}
                onChange={(event) => setSelectedInsight(event.target.value)}
              >
                {detail.analysis.insights.map((insight: any) => (
                  <option key={insight.id} value={insight.id}>
                    {insight.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary"
              onClick={() =>
                call("suggestRepositories", {
                  id: id(source),
                  insightId,
                  maxCredits: 10,
                })
              }
            >
              Find up to five plausible projects, maximum 10 credits
            </button>
            <p className="fine">
              This selection uses confirmed business profiles. It does not
              establish implementation fit or approve coding. Evaluate a project
              separately to inspect repository evidence.
            </p>
            {selection && (
              <div>
                <p>
                  {selection.candidates.length
                    ? "Possible project matches"
                    : "No plausible project match"}
                </p>
                {selection.noFitReason && <p>{selection.noFitReason}</p>}
                {selection.candidates.map((candidate: any) => (
                  <article key={candidate.repositoryId}>
                    <h3>
                      {repos.find(
                        (repo: any) => id(repo) === candidate.repositoryId,
                      )?.fullName ?? "Selected project"}
                    </h3>
                    <p>{candidate.reason}</p>
                    <button
                      className="secondary"
                      onClick={() =>
                        call("match", {
                          id: id(source),
                          repositoryId: candidate.repositoryId,
                          maxCredits: 10,
                        })
                      }
                    >
                      Evaluate inspected repository, maximum 10 credits
                    </button>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
        {detail.matches?.map((m: any) => (
          <article key={m.repositoryId}>
            <h3>{label(m.disposition)}</h3>
            <p>{m.reason}</p>
          </article>
        ))}
        {detail.proposals?.map((p: any) => (
          <button
            className="secondary"
            key={id(p)}
            onClick={() => onProposal(p)}
          >
            {p.title} · {label(p.disposition)}
          </button>
        ))}
        {repos.map((r: any) => (
          <button
            className="secondary"
            key={id(r)}
            onClick={() =>
              call("match", {
                id: id(source),
                repositoryId: id(r),
                maxCredits: 10,
              })
            }
          >
            Match {r.fullName}, maximum 10 credits
          </button>
        ))}
        {!repos.length && !detail.matches?.length && (
          <p>
            No selected repository yet. Your source can remain useful as a
            reference.
          </p>
        )}
      </section>
      <div className="panel">
        <h2>Processing and retention</h2>
        {detail.error && <p role="alert">{detail.error}</p>}
        <button
          className="primary"
          onClick={() => call("process", { id: id(source), maxCredits: 10 })}
        >
          Analyze, maximum 10 credits
        </button>
        <button
          className="secondary"
          onClick={() => {
            if (
              confirm(
                "Delete this source and its private evidence? Existing GitHub PRs remain on GitHub.",
              )
            )
              call("deleteSource", { id: id(source) });
          }}
        >
          Delete source
        </button>
        <p>
          Benefit remains unmeasured. A merged PR does not prove the idea
          worked.
        </p>
      </div>
    </>
  );
}
function ExecutionApproval({ proposal, call, routes }: any) {
  const [executor, setExecutor] = useState("local"),
    [ceiling, setCeiling] = useState(100),
    [modelId, setModelId] = useState(""),
    [highRisk, setHighRisk] = useState(false);
  const model = routes?.models.find((m: any) => m.id === modelId);
  const cloud = executor !== "local";
  return (
    <section className="panel">
      <h2>Separate execution approval</h2>
      <p>Repository: {proposal.repositoryId ?? "Demo Planner"}</p>
      <p>
        Base commit: <code>{proposal.baseSha ?? "Synthetic base"}</code>
      </p>
      <p>
        Plan version: {proposal.version} · Hash:{" "}
        <code>{proposal.planHash ?? "Save a validated plan first"}</code>
      </p>
      <label>
        Executor
        <select value={executor} onChange={(e) => setExecutor(e.target.value)}>
          <option value="local">Paired laptop, own local Codex session</option>
          <option value="cloud">Metered cloud, managed API</option>
          <option value="customer" disabled={!routes?.models.length}>
            Metered cloud, your OpenAI API credential
          </option>
        </select>
      </label>
      {executor === "customer" && (
        <>
          <label>
            Reviewed model
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
            >
              <option value="">Choose a verified model</option>
              {routes?.models.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.id} · {m.version}
                </option>
              ))}
            </select>
          </label>
          <p>
            Separate provider ceiling:{" "}
            {model
              ? `USD ${(model.maxProviderUsdCents / 100).toFixed(2)}`
              : "Choose a model"}
            . OpenAI bills your API account directly. Platform credits cover
            isolated compute; they do not pay this provider charge. One
            generation request, no automatic retry or fallback.
          </p>
        </>
      )}
      {cloud && (
        <label>
          Maximum platform credits
          <input
            type="number"
            min={1}
            max={10000}
            value={ceiling}
            onChange={(e) => setCeiling(Number(e.target.value))}
          />
        </label>
      )}
      <p>
        Maximum runtime: 20 minutes. Permitted files come from the reviewed
        plan. Publication requires final patch review.
      </p>
      <label className="check">
        <input
          type="checkbox"
          checked={highRisk}
          onChange={(event) => setHighRisk(event.target.checked)}
        />
        I explicitly approve protected changes in this exact plan. Owner or
        administrator permission and final patch review are required.
      </label>
      <button
        className="primary"
        disabled={executor === "customer" && !model}
        onClick={() =>
          call("approve", {
            id: id(proposal),
            version: proposal.version,
            planHash: proposal.planHash ?? "",
            baseSha: proposal.baseSha ?? "",
            executor: cloud ? "cloud" : "local",
            fundingRoute:
              executor === "local"
                ? "local_codex_subscription"
                : executor === "customer"
                  ? "customer_api_key"
                  : "managed_api",
            ...(executor === "customer"
              ? {
                  modelId: model.id,
                  maxProviderUsdCents: model.maxProviderUsdCents,
                }
              : {}),
            maxCredits: cloud ? ceiling : 0,
            allowedPaths: proposal.plan?.files.map((f: any) => f.path) ?? [],
            highRisk,
          })
        }
      >
        Approve exact scope and funding route
      </button>
      <p className="fine">
        Missing isolation blocks execution. No automatic paid fallback.
      </p>
    </section>
  );
}
function RunCard({ run, call }: any) {
  return (
    <article className="panel">
      <span className="status">{label(run.state)}</span>
      <h2>Run {id(run)}</h2>
      <p>
        {run.executor} · {label(run.fundingRoute)} · Ceiling {run.maxCredits}{" "}
        credits
      </p>
      {run.fundingRoute === "customer_api_key" && (
        <p>
          Customer API model: {run.customerModel?.id}. Provider ceiling USD{" "}
          {((run.maxProviderUsdCents ?? 0) / 100).toFixed(2)}.{" "}
          {run.providerRequestState === "settled"
            ? `Reported provider usage USD ${(run.providerUsdCents / 100).toFixed(2)}.`
            : `Provider request: ${label(run.providerRequestState ?? "unissued")}. Unknown usage requires reconciliation.`}
        </p>
      )}
      <p>Benefit: not measured</p>
      <ul>
        {run.events?.map((e: string, i: number) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
      {run.error && <p role="alert">{run.error}</p>}
      {run.patch && (
        <details>
          <summary>Review patch and check report</summary>
          <pre>{run.patch}</pre>
          <p>{run.report}</p>
          <button
            className="primary"
            onClick={async () => {
              const hash = await crypto.subtle.digest(
                "SHA-256",
                new TextEncoder().encode(run.patch),
              );
              const patchDigest = Array.from(new Uint8Array(hash), (n) =>
                n.toString(16).padStart(2, "0"),
              ).join("");
              call("publish", {
                id: id(run),
                generation: run.generation,
                patchDigest,
              });
            }}
          >
            Approve this patch for a draft PR
          </button>
        </details>
      )}
      {run.prUrl && (
        <>
          <a
            className="secondary"
            href={run.prUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {label(run.prState ?? "status unavailable")} · Open GitHub PR
          </a>
          <button
            className="secondary"
            onClick={() => call("refreshPR", { id: id(run) })}
          >
            Refresh authoritative PR status
          </button>
          <p>
            Last checked{" "}
            {run.observedAt
              ? new Date(run.observedAt).toLocaleString()
              : "not checked"}
          </p>
        </>
      )}
      <button
        className="secondary"
        onClick={() => call("cancel", { id: id(run) })}
      >
        Cancel pending execution
      </button>
    </article>
  );
}
