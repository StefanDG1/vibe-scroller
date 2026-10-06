"use client";
import { useRef, useState } from "react";
import { usePolling } from "@/lib/use-polling";
import { ChoiceSelect } from "./choice-select";
import { Layers3, Loader2, Pause, ScanSearch } from "lucide-react";
type Call = (operation: string, args: any) => Promise<any>;
const reasons: Record<string, string> = {
  BUDGET_EXCEEDED: "This scan reached its maximum spend.",
  INSUFFICIENT_CREDITS: "Your current allowance cannot cover the next batch.",
  OPERATOR_BUDGET_REACHED:
    "The monthly processing ceiling cannot cover the next batch.",
  PROVIDER_LIMIT: "The AI allowance needs more headroom.",
  context_changed:
    "A project or source changed. Review the latest context before a new scan.",
  APPROVAL_STALE: "Some evidence changed. Review it before a new scan.",
  usage_unknown:
    "An earlier analysis cost needs checking before another attempt.",
  COST_RECONCILIATION_REQUIRED:
    "An earlier analysis cost needs checking before another attempt.",
  evaluation_unknown: "The last evaluation needs a confirmed result and cost.",
  evaluation_failed:
    "A project evaluation could not complete. Review its evidence and connection.",
  MEDIA_UNAVAILABLE:
    "Some links cannot currently be retrieved. Their saved links remain available.",
  SETUP_REQUIRED: "Finish the analysis connection setup before continuing.",
  owner_paused: "Paused by you.",
};
export function LibraryScan({
  organizationId,
  repositories,
  devices,
  call,
  readOnly,
  demo,
  onOpenIssues,
}: {
  organizationId: string;
  repositories: any[];
  devices: any[];
  call: Call;
  readOnly: boolean;
  demo: boolean;
  onOpenIssues: () => void;
}) {
  const [jobs, setJobs] = useState<any[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [maximum, setMaximum] = useState(100);
  const [funding, setFunding] = useState("own_plan"),
    [model, setModel] = useState(""),
    [effort, setEffort] = useState("medium");
  const device =
    devices.find(
      (d) =>
        d.personalOwned && d.state === "paired" && d._id === jobs[0]?.deviceId,
    ) ??
    devices.find(
      (d) => d.personalOwned && d.state === "paired" && d.personalOnline,
    ) ??
    devices.find((d) => d.personalOwned && d.state === "paired");
  const models = device?.personalModels ?? [];
  const actualModel = models.some((m: any) => m.slug === model)
    ? model
    : (models.find((m: any) => m.slug === "gpt-6.1-sol")?.slug ??
      models.find((m: any) => m.slug === "gpt-5.6-sol")?.slug ??
      models[0]?.slug ??
      "");
  const [selected, setSelected] = useState(
      () => new Set(repositories.filter((r) => r.enabled).map((r) => r._id)),
    ),
    generation = useRef({ value: 0 });
  const selectedRepos = repositories.filter(
      (r) => selected.has(r._id) && r.enabled,
    ),
    ready =
      selectedRepos.length > 0 &&
      selectedRepos.every((r) => r.confirmed && r.status === "connected");
  async function refresh() {
    if (demo) return;
    const g = ++generation.current.value;
    try {
      const r = await fetch("/api/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "scanList",
          args: { organizationId },
        }),
      });
      if (
        !r.ok ||
        r.redirected ||
        !r.headers.get("content-type")?.includes("application/json")
      )
        throw Error(
          "Scan status is unavailable. Check your connection or sign in again.",
        );
      const d = await r.json();
      if (g === generation.current.value) {
        setJobs(d.result);
        setError("");
      }
    } catch (e) {
      if (g === generation.current.value) {
        setJobs([]);
        setError(
          e instanceof Error ? e.message : "Scan status is unavailable.",
        );
      }
      return false;
    }
  }
  usePolling(
    refresh,
    jobs.some((j) => j.state === "running") ? 10000 : 60000,
    !demo,
    organizationId,
  );
  async function run(operation: string, args: any) {
    setBusy(true);
    try {
      const result = await call(operation, args);
      if (result !== undefined) await refresh();
    } finally {
      setBusy(false);
    }
  }
  const job = jobs[0],
    active = job && !["completed", "canceled"].includes(job.state);
  return (
    <section className="library-scan" aria-label="Analyze your library">
      <div className="scan-intro">
        <ScanSearch size={22} aria-hidden="true" />
        <div>
          <h2>Improve your projects</h2>
          <p>
            Turn your saved links into useful, evidence-backed issue drafts.
          </p>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      {!active && (
        <>
          <details>
            <summary>
              {selectedRepos.length}{" "}
              {selectedRepos.length === 1 ? "project" : "projects"} selected
            </summary>
            <button
              type="button"
              className="secondary"
              disabled={readOnly || busy}
              onClick={() =>
                setSelected(
                  new Set(
                    repositories.filter((r) => r.enabled).map((r) => r._id),
                  ),
                )
              }
            >
              Select all connected projects
            </button>
            {repositories
              .filter((r) => r.enabled)
              .map((r) => (
                <label className="check" key={r._id}>
                  <input
                    type="checkbox"
                    checked={selected.has(r._id)}
                    disabled={readOnly || busy}
                    onChange={(e) =>
                      setSelected((old) => {
                        const s = new Set(old);
                        if (e.target.checked) s.add(r._id);
                        else s.delete(r._id);
                        return s;
                      })
                    }
                  />
                  {r.fullName}
                  {!r.confirmed ? " · Confirm context first" : ""}
                </label>
              ))}
          </details>
          <p>Uses all saved links and reuses existing analyses.</p>
          <button
            type="button"
            className="primary"
            disabled={readOnly || busy || demo || !ready}
            onClick={() =>
              void run("scanPrepare", {
                organizationId,
                repositoryIds: selectedRepos.map((r) => r._id),
              })
            }
          >
            <Layers3 size={17} aria-hidden="true" />
            Review the full-library scan
          </button>
          {!ready && (
            <p>Confirm the selected projects’ context below to continue.</p>
          )}
        </>
      )}
      {job && (
        <div className="scan-progress">
          <output>
            {job.state === "completed"
              ? "Scan completed"
              : job.state === "canceled"
                ? "Scan canceled"
                : job.state === "ready"
                  ? "Ready for your spending limit"
                  : job.state === "paused"
                    ? "Scan paused"
                    : job.phase === "inventory"
                      ? "Counting the full library…"
                      : job.phase === "sources"
                        ? "Analyzing saved content…"
                        : job.phase === "knowledge"
                          ? "Gathering knowledge…"
                          : "Comparing knowledge with your projects…"}
            {job.state === "running" && (
              <Loader2 size={16} className="spinner" aria-hidden="true" />
            )}
          </output>
          <p>
            {job.sourceCount} saved links counted · {job.readyCount} already
            analyzed · {job.pendingCount} awaiting analysis.{" "}
            {job.processedCount} newly analyzed · {job.skippedCount} unavailable
            or skipped.
          </p>
          {job.gatheredCount > 0 && (
            <p>
              {job.gatheredCount} evidence batches connected into knowledge.
            </p>
          )}
          {job.phase === "topics" && (
            <p>
              {job.topicCount} topics visited · {job.evaluatedCount} project
              evaluations · {job.issueCount} new issue drafts. {job.noFitCount}{" "}
              other results retained for review.
            </p>
          )}
          {job.maximumCredits > 0 && (
            <p>
              Up to {job.committedCredits} credits committed from your{" "}
              {job.maximumCredits}-credit maximum.
            </p>
          )}
          {job.reason && (
            <p>
              {reasons[job.reason] ??
                "This scan needs attention. Check the latest analysis and project context."}
            </p>
          )}
          {["ready", "paused"].includes(job.state) &&
            ![
              "usage_unknown",
              "source_failed",
              "evaluation_unknown",
              "evaluation_failed",
              "context_changed",
              "APPROVAL_STALE",
              "COST_RECONCILIATION_REQUIRED",
            ].includes(job.reason ?? "") && (
              <form
                className="scan-approval"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run("scanApprove", {
                    id: job.id,
                    version: job.version,
                    maximumCredits: maximum,
                    funding: job.funding ?? funding,
                    ...((job.funding ?? funding) === "own_plan"
                      ? {
                          deviceId: device?._id,
                          model: job.model ?? actualModel,
                          effort: job.effort ?? effort,
                        }
                      : {}),
                  });
                }}
              >
                {!job.funding && (
                  <>
                    <ChoiceSelect
                      aria-label="Saved-link analysis"
                      value={funding}
                      onValueChange={setFunding}
                      disabled={readOnly || busy}
                    >
                      <option value="own_plan">My own ChatGPT plan</option>
                      <option value="managed">
                        Managed analysis (processing credits)
                      </option>
                    </ChoiceSelect>
                    {funding === "own_plan" && (
                      <>
                        <ChoiceSelect
                          aria-label="Available account model"
                          value={actualModel}
                          onValueChange={setModel}
                          disabled={readOnly || busy || !models.length}
                        >
                          {models.map((m: any) => (
                            <option key={m.slug} value={m.slug}>
                              {m.displayName ?? m.slug}
                            </option>
                          ))}
                        </ChoiceSelect>
                        <ChoiceSelect
                          aria-label="Reasoning"
                          value={effort}
                          onValueChange={setEffort}
                          disabled={readOnly || busy}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                        </ChoiceSelect>
                        <p>
                          {device?.personalOnline
                            ? "Your own analysis connection is online."
                            : "Start your paired analysis connection before approval. Only models offered by your account are shown."}
                        </p>
                        <p>
                          Use my own ChatGPT plan for these saved links. This
                          permission expires after 24 hours. Video preparation,
                          knowledge summaries and project evaluations still use
                          processing credits.
                        </p>
                      </>
                    )}
                  </>
                )}
                <label>
                  Maximum processing credits
                  <input
                    type="number"
                    min={Math.max(10, job.committedCredits + 10)}
                    max={10000}
                    value={maximum}
                    onChange={(e) => setMaximum(Number(e.target.value))}
                    required
                  />
                </label>
                <p>
                  Each managed analysis, video preparation, knowledge summary or
                  project evaluation reserves up to 10 credits. Own-plan
                  inference uses your subscription allowance. Work pauses before
                  this maximum or your available allowance runs out. New topics
                  can require more evaluations, so no complete-scan cost is
                  assumed.
                </p>
                <button
                  className="primary"
                  disabled={
                    readOnly ||
                    busy ||
                    !Number.isSafeInteger(maximum) ||
                    maximum < Math.max(10, job.committedCredits + 10) ||
                    ((job.funding ?? funding) === "own_plan" &&
                      (!device?.personalOnline || !actualModel))
                  }
                >
                  Analyze and draft issues
                </button>
              </form>
            )}
          {active && (
            <div className="actions">
              {job.state === "running" && (
                <button
                  type="button"
                  className="secondary"
                  disabled={readOnly || busy}
                  onClick={() =>
                    void run("scanPause", { id: job.id, cancel: false })
                  }
                >
                  <Pause size={16} aria-hidden="true" />
                  Pause
                </button>
              )}
              <button
                type="button"
                className="secondary"
                disabled={readOnly || busy}
                onClick={() =>
                  void run("scanPause", { id: job.id, cancel: true })
                }
              >
                Cancel scan
              </button>
            </div>
          )}
          {job.issueCount > 0 && (
            <button type="button" className="secondary" onClick={onOpenIssues}>
              Review issue drafts
            </button>
          )}
        </div>
      )}
      <details>
        <summary>What the scan includes</summary>
        <p>
          Available unfinished links are analyzed, their knowledge is gathered,
          then compared with every selected project. Unavailable links stay
          saved.
        </p>
        <p>
          Useful drafts include source links, project evidence, acceptance
          criteria, risks and open questions. You review them before publication
          or coding.
        </p>
      </details>
    </section>
  );
}
