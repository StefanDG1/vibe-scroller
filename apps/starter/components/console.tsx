"use client";
import { useState, useEffect, useRef, useEffectEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Brand } from "./site";
import {
  Home,
  Library,
  GitBranch,
  Inbox,
  FileCheck2,
  GitPullRequest,
  Gauge,
  Plug,
  Laptop,
  ShieldCheck,
  CreditCard,
  Plus,
  FileText,
  Link2,
  Video,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowRight,
  MoreHorizontal,
  Check,
} from "lucide-react";
import { AccountMenu } from "./account-menu";
import { CookieSettings, rejectAnalytics } from "./consent";
import { track } from "@/lib/analytics";
import { productAnalyticsEvent } from "@/lib/analytics-events";
import type { ImportPreview } from "../../../packages/instagram-import";
type Initial = {
  aiPreference?: {
    preferChatGPTPlan: boolean;
    hostedStatus: string;
    active: boolean;
    personalAlphaEnabled?: boolean;
  };
  sources: any[];
  categories?: { key: string; name: string; count: number }[];
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
const coverageLabel = (s: string) =>
  ({
    full_sampled: "Audio + sampled frames",
    audio_only: "Audio",
    visual_only: "Images",
    caption_only: "Text",
    metadata_only: "Link",
  })[s] ?? label(s);
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
    aria-busy={busy || undefined}
    className={primary ? "primary" : "secondary"}
    onClick={onClick}
  >
    {busy && <Loader2 className="spinner" size={16} aria-hidden="true" />}
    {children}
  </button>
);

function SourceThumbnail({ source, demo }: { source: any; demo: boolean }) {
  const frame = (
    source.originalMediaEvidence ??
    source.mediaEvidence ??
    []
  ).find((e: any) => e.kind === "frame");
  const [failedId, setFailedId] = useState<string>(),
    [loadedId, setLoadedId] = useState<string>();
  const failed = Boolean(frame && failedId === frame.id),
    loaded = Boolean(frame && loadedId === frame.id);
  return (
    <span className="source-thumb" aria-hidden="true">
      {!demo && frame && !failed && (
        <Image
          className={loaded ? "source-preview ready" : "source-preview"}
          src={`/api/evidence/${encodeURIComponent(frame.id)}?inline=true`}
          width={60}
          height={76}
          alt=""
          unoptimized
          loading="lazy"
          onLoad={() => setLoadedId(frame.id)}
          onError={() => setFailedId(frame.id)}
        />
      )}
      {(!loaded || failed) &&
        (source.kind === "text" ? (
          <FileText size={24} strokeWidth={1.5} />
        ) : source.kind === "upload" ? (
          <Video size={24} strokeWidth={1.5} />
        ) : (
          <Link2 size={24} strokeWidth={1.5} />
        ))}
    </span>
  );
}

export function Console({
  demo = false,
  readOnly = false,
  canSuggestCategories = false,
  initial,
  organizationId,
  initialView = "home",
  initialSharedDraft = "",
  initialSearch = "",
  initialFilter = "",
  initialCategory = "",
  initialSort = "newest",
  demoState = "ready",
}: {
  demo?: boolean;
  readOnly?: boolean;
  canSuggestCategories?: boolean;
  initial: Initial;
  organizationId: string;
  initialView?: string;
  initialSharedDraft?: string;
  initialSearch?: string;
  initialFilter?: string;
  initialCategory?: string;
  initialSort?: string;
  demoState?: "ready" | "loading" | "error" | "empty";
}) {
  const router = useRouter(),
    [data, setData] = useState(initial),
    [view, setView] = useState(
      initialView === "plans" ? "proposals" : initialView,
    ),
    [selected, setSelected] = useState<any>(null),
    [search, setSearch] = useState(initialSearch),
    [filter, setFilter] = useState(initialFilter),
    [category, setCategory] = useState(initialCategory),
    [sort, setSort] = useState(initialSort),
    [notice, setNotice] = useState(""),
    [reauthNeeded, setReauthNeeded] = useState(false),
    [busy, setBusy] = useState(false),
    [libraryLoading, setLibraryLoading] = useState(
      demo && demoState === "loading",
    ),
    [libraryError, setLibraryError] = useState(
      demo && demoState === "error"
        ? "Synthetic request failure. Your library could not be loaded."
        : "",
    ),
    [captureOpen, setCaptureOpen] = useState(
      !readOnly && Boolean(initialSharedDraft),
    ),
    [planText, setPlanText] = useState(JSON.stringify(blankPlan, null, 2)),
    [railCollapsed, setRailCollapsed] = useState(false),
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
  const libraryAbort = useRef<AbortController | null>(null);
  const refreshFlight = useRef<Promise<void> | null>(null);
  async function loadLibrary(append = false) {
    if (demo) {
      setLibraryError("");
      return;
    }
    const generation = ++libraryRequest.current;
    libraryAbort.current?.abort();
    const abort = new AbortController();
    libraryAbort.current = abort;
    setLibraryLoading(true);
    setLibraryError("");
    try {
      const q = new URLSearchParams({
        q: search,
        state: filter,
        category,
        sort,
      });
      if (append && data.libraryNext) q.set("cursor", data.libraryNext);
      const response = await fetch(`/api/library/${organizationId}?${q}`, {
        cache: "no-store",
        signal: abort.signal,
      });
      if (!response.ok || response.redirected)
        throw new Error("Your library could not be loaded. Try again.");
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
    } catch (error) {
      if (!abort.signal.aborted && generation === libraryRequest.current)
        setLibraryError(
          error instanceof Error
            ? error.message
            : "Your library could not be loaded.",
        );
    } finally {
      if (generation === libraryRequest.current) setLibraryLoading(false);
    }
  }
  const loadLibraryFromEffect = useEffectEvent(() => loadLibrary());
  useEffect(() => {
    if (demo || !["library", "home"].includes(view)) return;
    const timeout = setTimeout(() => {
      loadLibraryFromEffect().catch(() =>
        setNotice("Library search is unavailable. Try again."),
      );
    }, 250);
    return () => {
      clearTimeout(timeout);
      libraryAbort.current?.abort();
      // oxlint-disable-next-line react-hooks/exhaustive-deps -- Invalidate this asynchronous request generation on cleanup.
      libraryRequest.current++;
    };
  }, [demo, organizationId, view, search, filter, category, sort]);
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
    if (!demo)
      for (const source of next.sources) {
        const old = data.sources.find((s) => id(s) === id(source));
        if (source.state === "ready" && old && old.state !== "ready")
          track("analysis_completed", {
            route:
              source.personalAnalysis?.state === "completed"
                ? "personal_chatgpt"
                : "included",
            coverage: source.coverage,
          });
      }
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
    if (refreshFlight.current) return refreshFlight.current;
    const request = refreshWorkspace();
    refreshFlight.current = request;
    try {
      await request;
    } finally {
      refreshFlight.current = null;
    }
  }
  async function refreshWorkspace() {
    const response = await fetch(
      `/api/workspace/${organizationId}?${new URLSearchParams({ q: search, state: filter, category, sort })}`,
      {
        cache: "no-store",
      },
    );
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
  const processing =
    data.sources.some((s) => ["queued", "processing"].includes(s.state)) ||
    data.runs.some((r) =>
      ["queued", "running", "publishing"].includes(r.state),
    );
  useEffect(() => {
    if (demo) return;
    const refreshVisible = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      refreshFromEffect().catch(() => {});
    };
    const timer = setInterval(refreshVisible, processing ? 15000 : 60000);
    document.addEventListener("visibilitychange", refreshVisible);
    window.addEventListener("online", refreshVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshVisible);
      window.removeEventListener("online", refreshVisible);
    };
  }, [demo, organizationId, processing]);
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
    setReauthNeeded(false);
    try {
      if (demo) {
        setNotice(
          "Synthetic demo action only. No provider, payment, execution or GitHub write occurred.",
        );
        return "demo";
      }
      if (operation === "preferences" && args.analytics === false)
        rejectAnalytics();
      const res = await fetch("/api/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation, args }),
      });
      if (res.redirected || res.status === 401) {
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
      if (!res.ok) {
        setReauthNeeded(body.code === "REAUTH_REQUIRED");
        if (!demo)
          track("operation_failed", {
            operation,
            code: body.code ?? "UNKNOWN",
          });
        throw new Error(body.error);
      }
      if (operation === "checkPersonalSession") return body.result;
      const event = productAnalyticsEvent(operation, args, body.result);
      if (!demo && event) track(event.event, event.properties);
      await refreshData();
      if (operation === "deleteSource") go("library");
      setNotice(
        operation === "deleteSource"
          ? "Source deleted."
          : operation === "suggestCategory"
            ? "Category name submitted for review."
            : "Saved.",
      );
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
    if (!demo) track("workspace_viewed", { view: v });
    if (v === "menu") return;
    if (!demo)
      history.replaceState(
        null,
        "",
        `/app/${organizationId}/${v === "home" ? "" : v}`,
      );
  };
  const filtered = !demo
    ? data.sources
    : data.sources.filter(
        (s) =>
          (!search ||
            [
              s.title,
              s.summary,
              s.text,
              ...(s.tags ?? []),
              ...(s.mainPoints ?? []),
            ]
              .join(" ")
              .toLowerCase()
              .includes(search.toLowerCase())) &&
          (!category || s.categoryKeys?.includes(category)) &&
          (!filter ||
            s.state === filter ||
            s.matches?.some((m: any) => m.disposition === filter)),
      );
  function findSource(s: any) {
    if (!demo)
      track("source_viewed", {
        kind: s.kind,
        state: s.state,
        coverage: s.coverage,
      });
    setSelected(s);
    setView("source");
  }
  const nav = [
    ["home", "Home", Home],
    ["library", "Library", Library],
    ["projects", "Projects", GitBranch],
    ["inbox", "Inbox", Inbox],
    ["proposals", "Proposals", FileCheck2],
    ["runs", "Runs & PRs", GitPullRequest],
    ["usage", "Usage", Gauge],
    ["connections", "Connections", Plug],
    ["runners", "Computers", Laptop],
    ["privacy", "Privacy", ShieldCheck],
    ["billing", "Billing", CreditCard],
  ] as const;
  const pendingProposals = data.proposals.filter(
    (p) => p.review === "unreviewed",
  ).length;
  return (
    <div
      className={`product-shell dark ${railCollapsed ? "rail-collapsed" : ""}`}
    >
      <aside className="product-rail">
        <div className="rail-brand">
          <Brand />
          <button
            type="button"
            className="icon-button"
            aria-label="Collapse sidebar"
            onClick={() => setRailCollapsed(true)}
          >
            <PanelLeftClose size={19} />
          </button>
        </div>
        {demo && <p className="workspace-label">Demo workspace</p>}
        <nav aria-label="Application">
          {nav.slice(0, 6).map(([key, title, Icon]) => (
            <button
              type="button"
              key={key}
              aria-current={view === key ? "page" : undefined}
              className={view === key ? "active" : ""}
              onClick={() => go(key)}
            >
              <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
              {title}
              {key === "inbox" && data.notifications.some((n) => !n.read) && (
                <span className="nav-count">
                  {data.notifications.filter((n) => !n.read).length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="rail-bottom">
          <button type="button" onClick={() => go("connections")}>
            <Plug size={18} />
            Connections
          </button>
          <AccountMenu go={go} demo={demo} />
        </div>
      </aside>
      <div className="product-body">
        <header className="product-top">
          <div className="row">
            <button
              type="button"
              className="icon-button rail-open"
              aria-label="Expand sidebar"
              onClick={() => setRailCollapsed(false)}
            >
              <PanelLeftOpen size={19} />
            </button>
            <span className="top-view">
              {view === "source"
                ? "Library"
                : view === "proposal"
                  ? "Proposals"
                  : view === "menu"
                    ? "More"
                    : (nav.find((n) => n[0] === view)?.[1] ?? "Review plan")}
            </span>
            {demo && <span className="status">Synthetic demo</span>}
          </div>
          <div className="row">
            <Button
              busy={busy}
              disabled={readOnly}
              primary
              onClick={() => setCaptureOpen(true)}
            >
              <Plus size={17} />
              Add source
            </Button>
            <div className="mobile-account">
              <AccountMenu go={go} demo={demo} />
            </div>
          </div>
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
          <div
            className={`page-heading ${view === "source" ? "source-heading" : ""}`}
          >
            <div>
              <h1>
                {view === "source"
                  ? selected?.title
                  : view === "proposal"
                    ? selected?.title
                    : view === "menu"
                      ? "More"
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
            {reauthNeeded && (
              <>
                {" "}
                <a
                  href={`/sign-in?reauth=true&returnTo=${encodeURIComponent(`/app?workspace=${organizationId}`)}`}
                >
                  Sign in again
                </a>
              </>
            )}
          </output>
          {(view === "home" || view === "library") && (
            <>
              {view === "home" && (
                <section className="home-capture" aria-label="Capture a source">
                  <h2>What did you save?</h2>
                  <form
                    className="capture-composer"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setCaptureOpen(true);
                    }}
                  >
                    <Link2 size={21} aria-hidden="true" />
                    <input
                      aria-label="Video URL"
                      value={sharedDraft}
                      onChange={(e) => setSharedDraft(e.target.value)}
                      placeholder="Paste a video link"
                      type="url"
                      disabled={readOnly}
                    />
                    <button
                      type="submit"
                      className="composer-send"
                      disabled={readOnly}
                      aria-label="Add video link"
                    >
                      <ArrowRight size={20} />
                    </button>
                  </form>
                  <div className="capture-shortcuts">
                    <button
                      type="button"
                      onClick={() => {
                        setSharedDraft("");
                        setCaptureOpen(true);
                      }}
                      disabled={readOnly}
                    >
                      <Plus size={16} />
                      Upload or import
                    </button>
                    <button type="button" onClick={() => go("connections")}>
                      <Plug size={16} />
                      Connect AI
                    </button>
                  </div>
                </section>
              )}
              {pendingProposals > 0 && (
                <div className="attention">
                  <h2>
                    {pendingProposals}{" "}
                    {pendingProposals === 1 ? "proposal" : "proposals"} to
                    review
                  </h2>
                  <Button busy={busy} onClick={() => go("proposals")}>
                    Review <ArrowRight size={16} />
                  </Button>
                </div>
              )}
              <div className="library-tools">
                <label>
                  <span className="sr-only">Search your library</span>
                  <input
                    value={search}
                    placeholder="Search your library"
                    onChange={(e) => {
                      setSearch(e.target.value);
                      const u = new URL(location.href);
                      u.searchParams.set("q", e.target.value);
                      history.replaceState(null, "", u);
                    }}
                  />
                </label>
                <label>
                  <span className="sr-only">Filter sources</span>
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
                <label>
                  <span className="sr-only">Category</span>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      const u = new URL(location.href);
                      u.searchParams.set("category", e.target.value);
                      history.replaceState(null, "", u);
                    }}
                  >
                    <option value="">All categories</option>
                    {(data.categories ?? [])
                      .filter((c) => c.count > 0)
                      .map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.name} ({c.count})
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Sort sources</span>
                  <select
                    value={search ? "relevance" : sort}
                    disabled={Boolean(search)}
                    onChange={(e) => {
                      setSort(e.target.value);
                      const u = new URL(location.href);
                      u.searchParams.set("sort", e.target.value);
                      history.replaceState(null, "", u);
                    }}
                  >
                    {search && <option value="relevance">Most relevant</option>}
                    <option value="newest">Newest imported</option>
                    <option value="oldest">Oldest imported</option>
                    <option value="saved">Recently saved</option>
                    <option value="updated">Recently updated</option>
                    <option value="title">Title A�Z</option>
                  </select>
                </label>
                {(search || filter || category || sort !== "newest") && (
                  <Button
                    busy={busy}
                    onClick={() => {
                      setSearch("");
                      setFilter("");
                      setCategory("");
                      setSort("newest");
                      const u = new URL(location.href);
                      for (const key of ["q", "state", "category", "sort"])
                        u.searchParams.delete(key);
                      history.replaceState(null, "", u);
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
              {libraryError && (
                <div className="panel error" role="alert">
                  {libraryError}
                  <Button busy={libraryLoading} onClick={() => loadLibrary()}>
                    Retry
                  </Button>
                </div>
              )}
              <div className="source-list" aria-busy={libraryLoading}>
                {libraryLoading && !filtered.length ? (
                  <output className="empty">
                    <Loader2 className="spinner" size={24} />
                    <p>Loading your library...</p>
                  </output>
                ) : filtered.length ? (
                  filtered.map((s) => (
                    <article key={id(s)} className="source-card">
                      <button
                        type="button"
                        className="source-hitarea"
                        onClick={() => findSource(s)}
                        aria-label={`Open ${s.title}`}
                      />
                      <SourceThumbnail source={s} demo={demo} />
                      <div className="source-card-body">
                        <h2>{s.title}</h2>
                        <div className="row spread">
                          <span className="coverage">
                            {coverageLabel(s.coverage)}
                          </span>
                        </div>
                        {!demo && s.state !== "ready" && (
                          <span className="muted source-state">
                            {label(s.state ?? "ready")}
                          </span>
                        )}
                        <p>
                          {s.summary ??
                            (s.state === "needs_upload"
                              ? "Add the video or transcript to analyze it."
                              : ["processing", "queued"].includes(s.state)
                                ? "Transcribing and analyzing your source..."
                                : s.state === "failed"
                                  ? "Analysis stopped. Open for details."
                                  : "Ready for analysis.")}
                        </p>
                        <ul className="point-preview">
                          {s.mainPoints?.slice(0, 3).map((p: string) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                        <div className="row wrap">
                          {s.insightCount > 0 && (
                            <span className="tag">
                              {s.insightCount} insights
                            </span>
                          )}
                          {s.matches?.map((m: any) => (
                            <span className="status" key={m.repositoryId}>
                              {label(m.disposition)}
                            </span>
                          ))}
                          {(s.categoryNames ?? s.tags)
                            ?.slice(0, 4)
                            .map((t: string) => (
                              <span className="tag" key={t}>
                                {label(t)}
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
                      <span
                        className="icon-button source-open"
                        aria-hidden="true"
                      >
                        <ArrowRight size={18} />
                      </span>
                    </article>
                  ))
                ) : (
                  <div className="empty">
                    <h2>
                      {search || filter || category
                        ? "No matches on this page"
                        : "Your library starts here."}
                    </h2>
                    <p>
                      {search || filter || category
                        ? data.libraryNext
                          ? "Continue loading to check more sources, or clear the filters."
                          : "Clear the filters to see your saved sources."
                        : "Add a supported link, upload permitted content, or supply a transcript."}
                    </p>
                    <Button
                      busy={busy}
                      primary
                      onClick={() =>
                        search || filter || category
                          ? (setSearch(""), setFilter(""), setCategory(""))
                          : setCaptureOpen(true)
                      }
                    >
                      {search || filter || category
                        ? "Clear filters"
                        : "Add source"}
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
              readOnly={readOnly}
              busy={busy}
              canSuggestCategories={canSuggestCategories}
              demo={demo}
              org={organizationId}
              repos={data.repositories}
              devices={data.devices ?? []}
              personalEnabled={
                !demo && data.aiPreference?.personalAlphaEnabled === true
              }
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
              <CookieSettings className="secondary" />
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
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: ".65rem",
                    minHeight: 44,
                  }}
                >
                  <input
                    type="checkbox"
                    style={{ width: 18, height: 18, flexShrink: 0 }}
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
                            ...current.aiPreference,
                            preferChatGPTPlan,
                            hostedStatus: "awaiting_commercial_access",
                            active: false,
                          },
                        }));
                    }}
                  />
                  Prefer my ChatGPT plan when available
                </label>
                <p className="notice" style={{ textAlign: "left" }}>
                  Hosted connection is awaiting OpenAI commercial access. Saving
                  this preference does not connect an account, grant consent, or
                  change the funding route of a current task.
                </p>
                <p>
                  Personal alpha accounts can pair a laptop and approve
                  supplied-text analysis from the source screen. ChatGPT consent
                  stays on that laptop. Video processing needs its separate
                  media integration. Coding requires verified isolation and
                  separate approval.
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
                        const existing = data.devices?.find(
                          (d) =>
                            d.personalOwned &&
                            d.pairingActive &&
                            d.fingerprint === value.fingerprint &&
                            d.name === value.name,
                        );
                        const deviceId = existing
                          ? id(existing)
                          : await call("startDevice", {
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
              <CookieSettings className="secondary" />
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
          {view === "menu" && (
            <section className="panel" aria-label="All application pages">
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
        </main>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {nav.slice(0, 4).map(([key, title, Icon]) => (
            <button
              className={view === key ? "active" : ""}
              aria-current={view === key ? "page" : undefined}
              key={key}
              onClick={() => go(key)}
            >
              <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
              {title}
            </button>
          ))}
          <button aria-expanded={view === "menu"} onClick={() => go("menu")}>
            <MoreHorizontal size={20} aria-hidden="true" />
            More
          </button>
        </nav>
      </div>
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
              devices={data.devices ?? []}
              personalEnabled={data.aiPreference?.personalAlphaEnabled}
              sharedDraft={sharedDraft}
              demo={demo}
              organizationId={organizationId}
              call={call}
              onDone={(sourceId?: string) => {
                setCaptureOpen(false);
                setSharedDraft("");
                if (sourceId)
                  findSource({
                    _id: sourceId,
                    title: "New upload",
                    state: "processing",
                    coverage: "metadata_only",
                  });
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
  existingGeneration,
  devices = [],
  personalEnabled = false,
  sharedDraft,
}: any) {
  const [kind, setKind] = useState(existingSourceId ? "upload" : "url");
  const [saving, setSaving] = useState(false);
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const eligible = devices.filter(
    (d: any) =>
      d.personalOwned &&
      d.state === "paired" &&
      d.personalOnline &&
      d.personalModels?.length,
  );
  const [chosenDevice, setChosenDevice] = useState(
    eligible.length === 1 ? id(eligible[0]) : "",
  );
  const computer = eligible.find((d: any) => id(d) === chosenDevice);
  const [chosenModel, setChosenModel] = useState("");
  const effectiveModel =
    chosenModel ||
    computer?.personalModels.find(
      (m: any) => m.slug === "gpt-6.1-sol" || m.slug === "gpt-5.6-sol",
    )?.slug ||
    computer?.personalModels[0]?.slug ||
    "";
  const [manifest, setManifest] = useState<any>(null);
  const [importError, setImportError] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importOffset, setImportOffset] = useState(0);
  const importAbort = useRef<AbortController | null>(null);
  useEffect(() => () => importAbort.current?.abort(), []);
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
          if (!preview || importBusy || previewBusy) return;
          setImportBusy(true);
          try {
            setImportError("");
            const { importBatch } =
              await import("../../../packages/instagram-import");
            const batch = importBatch(preview.links, importOffset);
            if (!batch.count) return;
            const result = await call("importLinks", {
              organizationId,
              key: crypto.randomUUID(),
              format: "json",
              text: batch.text,
              rightsAttested: f.get("rights") === "on",
            });
            if (result) {
              setManifest((previous: any) => ({
                ...result,
                accepted: (previous?.accepted ?? 0) + result.accepted,
                duplicate: (previous?.duplicate ?? 0) + result.duplicate,
                invalid: (previous?.invalid ?? 0) + result.invalid,
                unsupported: (previous?.unsupported ?? 0) + result.unsupported,
                waiting: (previous?.waiting ?? 0) + result.waiting,
                entries: [
                  ...(previous?.entries ?? []),
                  ...result.entries.map((entry: any) => ({
                    ...entry,
                    row: importOffset + entry.row,
                  })),
                ],
              }));
              setImportOffset(importOffset + batch.count);
            }
          } catch (error) {
            setImportError(
              error instanceof Error ? error.message : "Import failed.",
            );
          } finally {
            setImportBusy(false);
          }
          return;
        }
        if (kind === "upload") {
          if (saving) return;
          setSaving(true);
          setImportError("");
          try {
            const file = f.get("file") as File;
            if (!file?.size || file.size > 250000000)
              throw new Error("Choose a video or audio file up to 250 MB.");
            if (
              personalEnabled &&
              autoAnalyze &&
              (!computer || !effectiveModel || f.get("ownPlan") !== "on")
            )
              throw new Error(
                "Choose your online computer and approve using your ChatGPT plan.",
              );
            if (personalEnabled && autoAnalyze) {
              const fresh = await call("checkPersonalSession", {
                organizationId,
              });
              if (fresh !== true) {
                onDone();
                return;
              }
            }
            const grantResponse = await fetch("/api/uploads/grant", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                organizationId,
                type: file.type,
                size: file.size,
              }),
            });
            const g = await grantResponse.json();
            if (!grantResponse.ok || g.error)
              throw new Error(g.error || "Upload permission failed.");
            const uploaded = await fetch(g.url, {
              method: "PUT",
              headers: { "Content-Type": file.type },
              body: file,
            });
            if (!uploaded.ok)
              throw new Error("Upload failed. No source was attached.");
            const doneResponse = await fetch("/api/uploads/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ organizationId, key: g.key }),
            });
            const done = await doneResponse.json();
            if (!doneResponse.ok || done.error)
              throw new Error(done.error || "Upload verification failed.");
            let sourceId = existingSourceId;
            if (existingSourceId) {
              const attached = await call("attachSource", {
                id: existingSourceId,
                objectKey: g.key,
                rightsAttested: f.get("rights") === "on",
              });
              if (attached === undefined) return;
            } else
              sourceId = await call("capture", {
                organizationId,
                key: crypto.randomUUID(),
                kind,
                title: String(f.get("title") || file.name).slice(0, 160),
                objectKey: g.key,
                rightsAttested: f.get("rights") === "on",
              });
            if (!sourceId) return;
            if (personalEnabled && autoAnalyze) {
              const approved = await call("approvePersonalAnalysis", {
                id: sourceId,
                generation: existingSourceId ? existingGeneration + 1 : 0,
                deviceId: chosenDevice,
                model: effectiveModel,
                effort: "medium",
                useOwnPlan: true,
                maxComputeCredits: 10,
              });
              if (approved === undefined) {
                // Open the saved source instead of offering a duplicate upload.
                onDone(sourceId);
                return;
              }
            }
            onDone(sourceId);
          } catch (error) {
            setImportError(
              error instanceof Error
                ? error.message
                : "Upload failed. Try again.",
            );
          } finally {
            setSaving(false);
          }
          return;
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
        <select
          disabled={importBusy}
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          {!existingSourceId && <option value="url">Video URL</option>}
          {!existingSourceId && (
            <option value="import">Instagram export or link import</option>
          )}
          <option value="upload">Permitted media upload</option>
          <option value="text">Supplied transcript</option>
        </select>
      </label>
      {!existingSourceId && kind !== "import" && (
        <label>
          Title
          <input
            name="title"
            required={kind !== "upload"}
            maxLength={160}
            placeholder={
              kind === "upload" ? "Uses the filename if empty" : undefined
            }
          />
        </label>
      )}
      {kind === "import" ? (
        <div className="form-grid">
          <label>
            Instagram ZIP, Saved JSON or HTML, or CSV links
            <input
              name="import"
              type="file"
              accept=".zip,.csv,.json,.html,.htm,application/zip,text/csv,application/json,text/html"
              required
              disabled={importBusy}
              onChange={async (event) => {
                importAbort.current?.abort();
                const controller = new AbortController();
                importAbort.current = controller;
                setPreview(null);
                setManifest(null);
                setImportOffset(0);
                setImportError("");
                const file = event.currentTarget.files?.[0];
                if (!file) {
                  setPreviewBusy(false);
                  return;
                }
                setPreviewBusy(true);
                try {
                  const { previewLinkFile, SAVED_TEXT_LIMIT } =
                    await import("../../../packages/instagram-import");
                  let next: ImportPreview;
                  if (/\.zip$/i.test(file.name)) {
                    const { previewInstagramZip } =
                      await import("../../../packages/instagram-zip");
                    next = await previewInstagramZip(file, controller.signal);
                  } else {
                    if (file.size > SAVED_TEXT_LIMIT)
                      throw new Error(
                        "Choose Saved metadata within 8 MB. For a larger account export, select its ZIP.",
                      );
                    next = previewLinkFile(
                      new TextDecoder("utf-8", { fatal: true }).decode(
                        await file.arrayBuffer(),
                      ),
                      file.name,
                    );
                  }
                  if (!controller.signal.aborted) {
                    setPreview(next);
                    if (!demo)
                      track("import_previewed", {
                        format: next.format,
                        count: next.links.length,
                      });
                  }
                } catch (error) {
                  if (!controller.signal.aborted)
                    setImportError(
                      error instanceof Error
                        ? error.message
                        : "Cannot read this export.",
                    );
                } finally {
                  if (!controller.signal.aborted) setPreviewBusy(false);
                }
              }}
            />
            <span className="fine">
              The export stays on this device. Only Saved links selected for
              import are sent to your workspace. ZIPs can be up to 3 GB; Saved
              metadata up to 8 MB per file. JSON is preferred. Messages and
              contacts are excluded.
            </span>
          </label>
          {previewBusy && (
            <output>Reading Saved metadata on this device...</output>
          )}
          {preview && (
            <section aria-label="Import preview">
              <h3>Review your import</h3>
              <p>
                {preview.format}: {preview.rows.length} records,{" "}
                {preview.links.length} distinct valid links,{" "}
                {preview.duplicates} repeated links, {preview.invalid} invalid,{" "}
                {preview.unsupported} unsupported.
              </p>
              <p>
                {preview.reels} Reel links; {preview.posts} post links with
                unverified media type. An export does not establish video access
                or complete Saved history. HTML dates are left unknown.
              </p>
              <p className="fine">
                Up to 500 links per batch, within your workspace allowance.{" "}
                {importOffset} of {preview.links.length} links submitted. Saving
                links uses no analysis credits. Permitted media or a transcript
                is still needed before analysis.
              </p>
              <ol>
                {preview.links
                  .slice(importOffset, importOffset + 10)
                  .map((link) => (
                    <li key={link.url}>
                      {link.title || "Saved Instagram link"}
                      <br />
                      <span className="fine">{link.url}</span>
                    </li>
                  ))}
              </ol>
            </section>
          )}
        </div>
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
      {kind === "upload" && personalEnabled && (
        <section
          className="upload-analysis form-grid"
          aria-label="Automatic analysis"
        >
          <label className="check">
            <input
              type="checkbox"
              checked={autoAnalyze}
              onChange={(e) => setAutoAnalyze(e.target.checked)}
            />
            Transcribe and analyze after upload
          </label>
          {autoAnalyze && (
            <>
              <label>
                Computer
                <select
                  value={chosenDevice}
                  onChange={(e) => {
                    setChosenDevice(e.target.value);
                    setChosenModel("");
                  }}
                >
                  <option value="">Choose an online computer</option>
                  {eligible.map((d: any) => (
                    <option key={id(d)} value={id(d)}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                ChatGPT model
                <select
                  value={effectiveModel}
                  onChange={(e) => setChosenModel(e.target.value)}
                >
                  {!computer && (
                    <option value="">Connect your computer first</option>
                  )}
                  {computer?.personalModels.map((m: any) => (
                    <option key={m.slug} value={m.slug}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="check">
                <input name="ownPlan" type="checkbox" required />
                Use my ChatGPT plan for this video with medium reasoning.
                Reserve up to 10 credits for isolated media preparation.
              </label>
              <p className="fine">
                Audio is transcribed locally on your laptop. Sampled frames and
                the transcript go to your connected OpenAI account. No paid AI
                fallback.
              </p>
            </>
          )}
        </section>
      )}
      <p className="fine">
        {kind === "upload" && personalEnabled && autoAnalyze
          ? "Keep your paired laptop on until analysis finishes."
          : "Saving does not start analysis. Supplied text has no implied audio or visual coverage."}
      </p>
      <button
        className="primary"
        disabled={
          saving ||
          (kind === "import" &&
            (previewBusy ||
              importBusy ||
              !preview?.links.length ||
              importOffset >= preview.links.length))
        }
      >
        {demo
          ? "Save synthetic demo source"
          : kind === "import"
            ? importBusy
              ? "Importing links..."
              : importOffset
                ? "Import next batch"
                : "Import reviewed links"
            : saving
              ? "Uploading..."
              : kind === "upload" && personalEnabled && autoAnalyze
                ? "Upload and analyze"
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
function SourceDetail({
  source,
  readOnly,
  busy,
  canSuggestCategories,
  demo,
  org,
  repos,
  devices,
  personalEnabled,
  call,
  onProposal,
}: any) {
  const [detail, setDetail] = useState(source);
  const [detailLoading, setDetailLoading] = useState(!demo);
  const [selectedInsight, setSelectedInsight] = useState("");
  const [allFrames, setAllFrames] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const transcript = useRef<HTMLDetailsElement>(null);
  const sourceId = id(source);
  const sourceRevision = `${source.generation}:${source.updatedAt}:${source.personalAnalysis?.state}`;
  const savedFrames = (
    detail.originalMediaEvidence ??
    detail.mediaEvidence ??
    []
  ).filter((e: any) => e.kind === "frame");
  const insightId = selectedInsight || detail.analysis?.insights?.[0]?.id;
  const selection =
    detail.repositorySelection?.insightId === insightId
      ? detail.repositorySelection
      : undefined;
  useEffect(() => {
    if (demo) return;
    const abort = new AbortController();
    fetch(`/api/source/${sourceId}`, {
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
        if (!abort.signal.aborted) {
          setDetail(next);
          setDetailLoading(false);
        }
      })
      .catch(() => {
        if (!abort.signal.aborted) {
          setDetail({
            ...source,
            analysis: undefined,
            text: undefined,
            originalText: undefined,
            summary: undefined,
            mainPoints: undefined,
            mediaEvidence: undefined,
            originalMediaEvidence: undefined,
            repositorySelection: undefined,
            error:
              "Source details are unavailable. Check access before continuing.",
          });
          setDetailLoading(false);
        }
      });
    return () => abort.abort();
    // The workspace projection is a new object after every poll. Reload private
    // evidence only when this source's actual revision changes.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId, sourceRevision, demo]);
  const insights =
    detail.analysis?.insights ??
    (demo
      ? detail.mainPoints?.map((title: string) => ({
          title,
          claim: title,
          evidence: [],
        }))
      : []) ??
    [];
  const summary =
    detail.summary ??
    "No analysis available. Upload permitted content or supply a transcript.";
  const overview =
    summary.length > 280
      ? (summary.match(/^.{1,280}[.!?](?:\s|$)/)?.[0]?.trim() ??
        `${summary.slice(0, 280).replace(/\s+\S*$/, "")}…`)
      : summary;
  return (
    <>
      <div className="panel">
        <span className="coverage">
          {coverageLabel(detail.coverage ?? "metadata_only")}
        </span>
        <h2>AI summary</h2>
        <p>{overview}</p>
        {detail.error && (
          <p className="error" role="alert">
            {detail.error}
          </p>
        )}
        <p className="fine">
          {detail.coverage === "full_sampled"
            ? "Frames are sampled. Automatic transcripts can contain errors."
            : "Review the evidence coverage and analysis notes."}
        </p>
        <details className="source-notes">
          <summary>Full summary and analysis notes</summary>
          {overview !== summary && <p>{summary}</p>}
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
          </p>
        </details>
      </div>
      <details
        className="panel source-notes"
        onToggle={(e) => {
          if (e.currentTarget.open)
            setCategoryDraft((detail.categoryNames ?? []).join(", "));
        }}
      >
        <summary>
          Categories
          {detail.categoryNames?.length
            ? ` � ${detail.categoryNames.join(", ")}`
            : ""}
        </summary>
        {!readOnly && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const names = categoryDraft
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              const result = await call("assignCategories", {
                id: sourceId,
                names,
              });
              if (result?.saved)
                setDetail({
                  ...detail,
                  categoryNames: result.names,
                  categoryKeys: result.keys,
                });
            }}
          >
            <label>
              Separate categories with commas
              <input
                value={categoryDraft}
                maxLength={400}
                onChange={(e) => setCategoryDraft(e.target.value)}
                placeholder="Music, Reading, Product design"
              />
            </label>
            <button
              type="submit"
              className="secondary"
              disabled={busy}
              aria-busy={busy || undefined}
            >
              {busy ? "Saving…" : "Save categories"}
            </button>
          </form>
        )}
        {!demo && canSuggestCategories && !!detail.categoryKeys?.length && (
          <details>
            <summary>Suggest a shared category</summary>
            <p className="fine">
              Only this category name is submitted for review. Your videos and
              insights stay private. Workspace owners and admins can submit.
            </p>
            {detail.categoryKeys.map((key: string, index: number) => (
              <Button
                key={key}
                busy={busy}
                onClick={() =>
                  call("suggestCategory", { organizationId: org, key })
                }
              >
                Suggest {detail.categoryNames[index]}
              </Button>
            ))}
          </details>
        )}
      </details>
      <section className="panel">
        <h2>Main points</h2>
        {!detailLoading && insights.length > 1 && (
          <nav className="insight-index" aria-label="Main points">
            {insights.map((insight: any, index: number) => (
              <a key={insight.id ?? index} href={`#insight-${index}`}>
                {insight.title}
              </a>
            ))}
          </nav>
        )}
        {detailLoading && (
          <output aria-live="polite">
            <Loader2 className="spinner" size={16} aria-hidden="true" /> Loading
            source details…
          </output>
        )}
        {!detailLoading &&
          insights.map((i: any, index: number) => (
            <article
              className="insight"
              id={`insight-${index}`}
              key={i.id ?? i.title}
              tabIndex={-1}
            >
              <h3>{i.title}</h3>
              <p>{i.claim}</p>
              <p>{i.interpretation}</p>
              {(i.confidence || demo) && (
                <span className="status">
                  {i.confidence ?? "Synthetic evidence"}
                </span>
              )}
              {!!i.evidence?.length && (
                <details className="insight-evidence">
                  <summary>
                    Evidence · {i.evidence.length}{" "}
                    {i.evidence.length === 1 ? "reference" : "references"}
                  </summary>
                  <ul className="evidence-links">
                    {i.evidence?.map((e: any) => (
                      <li key={e.id}>
                        {e.kind === "frame" && !demo && (
                          <a
                            href={`/api/evidence/${encodeURIComponent(e.id)}?view=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Frame · {(e.startMs / 1000).toFixed(1)}s
                          </a>
                        )}
                        {e.kind === "transcript" && (
                          <a
                            href="#source-transcript"
                            onClick={(event) => {
                              event.preventDefault();
                              setTranscriptOpen(true);
                              const target = transcript.current;
                              if (target) {
                                target.open = true;
                                target.scrollIntoView({ block: "start" });
                                target.focus({ preventScroll: true });
                              }
                            }}
                          >
                            Transcript ·{" "}
                            {e.startMs === null
                              ? "supplied text"
                              : `${(e.startMs / 1000).toFixed(1)}s`}
                          </a>
                        )}
                        {e.kind !== "transcript" &&
                          (e.kind !== "frame" || demo) && (
                            <span>
                              {label(e.kind)} ·{" "}
                              {e.startMs === null
                                ? "Supplied text"
                                : `${(e.startMs / 1000).toFixed(1)}s`}
                            </span>
                          )}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </article>
          ))}
        {!detailLoading && !insights.length && !detail.error && (
          <p>No main points yet. Add permitted media to start analysis.</p>
        )}
        <details
          id="source-transcript"
          ref={transcript}
          tabIndex={-1}
          open={transcriptOpen}
          onToggle={(event) => setTranscriptOpen(event.currentTarget.open)}
        >
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
      {!demo && savedFrames.length > 0 && (
        <section className="panel" aria-label="Video evidence">
          <h2>Video evidence</h2>
          <div className="evidence-grid">
            {savedFrames.slice(0, allFrames ? 24 : 4).map((frame: any) => (
              <figure key={frame.id}>
                <a
                  href={`/api/evidence/${encodeURIComponent(frame.id)}?view=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image
                    src={`/api/evidence/${encodeURIComponent(frame.id)}?inline=true`}
                    alt={`Private sampled video frame at ${(frame.startMs / 1000).toFixed(1)} seconds`}
                    width={960}
                    height={540}
                    unoptimized
                    loading="lazy"
                    decoding="async"
                  />
                </a>
                <figcaption>{(frame.startMs / 1000).toFixed(1)}s</figcaption>
              </figure>
            ))}
          </div>
          {savedFrames.length > 4 && (
            <Button onClick={() => setAllFrames(!allFrames)}>
              {allFrames
                ? "Show fewer frames"
                : `View all ${savedFrames.length} frames`}
            </Button>
          )}
          <p className="fine">
            Selected frames support the analysis. Sampling can miss short
            scenes.
          </p>
        </section>
      )}
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
            existingGeneration={detail.generation}
            devices={devices}
            personalEnabled={personalEnabled}
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
        {personalEnabled && (
          <PersonalSourceAnalysis
            source={detail}
            devices={devices}
            call={call}
          />
        )}
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
function PersonalSourceAnalysis({ source, devices, call }: any) {
  const [deviceId, setDeviceId] = useState(""),
    [model, setModel] = useState(""),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false);
  const eligible = devices.filter(
    (d: any) =>
      d.personalOwned &&
      d.state === "paired" &&
      d.personalOnline &&
      d.personalModels?.length,
  );
  const device = eligible.find((d: any) => id(d) === deviceId);
  const running = ["preparing", "queued", "running"].includes(
    source.personalAnalysis?.state,
  );
  return (
    <section aria-label="Personal ChatGPT analysis" className="panel">
      <h3>Use your ChatGPT plan</h3>
      {running && (
        <ol
          className="processing-steps"
          aria-label="Analysis progress"
          aria-live="polite"
        >
          {(source.kind === "upload"
            ? [
                "Preparing media",
                "Transcribing audio",
                "Analyzing frames and saving insights",
              ]
            : ["Analyzing text and saving insights"]
          ).map((step, index) => {
            const active =
              source.kind !== "upload"
                ? 0
                : source.personalAnalysis.state === "preparing"
                  ? 0
                  : source.personalAnalysis.stage === "transcribing"
                    ? 1
                    : 2;
            return (
              <li
                key={step}
                className={
                  index === active
                    ? "current"
                    : index < active
                      ? "complete"
                      : ""
                }
              >
                {index < active ? (
                  <Check size={16} aria-hidden="true" />
                ) : index === active ? (
                  <Loader2 size={16} className="spinner" aria-hidden="true" />
                ) : (
                  <span className="step-dot" />
                )}
                {step}
              </li>
            );
          })}
        </ol>
      )}
      {source.personalAnalysis && (
        <p>
          Personal analysis: {label(source.personalAnalysis.state)} ·{" "}
          {source.personalAnalysis.model} · {source.personalAnalysis.effort}{" "}
          reasoning.{" "}
          {source.personalAnalysis.inputTokens === undefined
            ? "Plan usage is not yet reported."
            : `${source.personalAnalysis.inputTokens} input and ${source.personalAnalysis.outputTokens} output tokens reported.`}
        </p>
      )}
      {running ? (
        <Button
          busy={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await call("cancelPersonalAnalysis", { id: id(source) });
            } finally {
              setBusy(false);
            }
          }}
        >
          Cancel personal analysis
        </Button>
      ) : !["text", "upload"].includes(source.kind) ? (
        <p>
          Upload the permitted video to start automatic transcription and frame
          analysis.
        </p>
      ) : (
        source.state !== "ready" && (
          <>
            <p>
              {source.kind === "upload"
                ? "Your laptop transcribes audio locally, then sends sampled frames and the transcript to your ChatGPT account. Media preparation reserves up to 10 compute credits."
                : "Your laptop sends this text to your ChatGPT account."}{" "}
              No VibeScroller inference credits or paid AI fallback. Your
              ChatGPT limits apply.
            </p>
            {!eligible.length ? (
              <p>
                Start the personal runner on your paired laptop to see its
                available models.
              </p>
            ) : (
              <>
                <label>
                  Computer
                  <select
                    value={deviceId}
                    onChange={(e) => {
                      setDeviceId(e.target.value);
                      setModel("");
                      setConsent(false);
                    }}
                  >
                    <option value="">Choose your computer</option>
                    {eligible.map((d: any) => (
                      <option key={id(d)} value={id(d)}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Account model
                  <select
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      setConsent(false);
                    }}
                  >
                    <option value="">Choose an available model</option>
                    {device?.personalModels.map((m: any) => (
                      <option key={m.slug} value={m.slug}>
                        {m.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  Use my connected ChatGPT plan for this source with medium
                  reasoning.
                </label>
                <Button
                  primary
                  busy={busy}
                  disabled={
                    !consent ||
                    !device ||
                    !model ||
                    ["queued", "processing"].includes(source.state)
                  }
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await call("approvePersonalAnalysis", {
                        id: id(source),
                        generation: source.generation,
                        deviceId,
                        model,
                        effort: "medium",
                        useOwnPlan: true,
                        ...(source.kind === "upload"
                          ? { maxComputeCredits: 10 }
                          : {}),
                      });
                      setConsent(false);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {source.kind === "upload"
                    ? "Transcribe and analyze video"
                    : "Analyze with my plan"}
                </Button>
                <p className="fine">
                  Approval expires after 15 minutes if unclaimed.
                  Reauthentication may be required. There is no automatic model
                  or paid-provider fallback.
                </p>
              </>
            )}
          </>
        )
      )}
    </section>
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
