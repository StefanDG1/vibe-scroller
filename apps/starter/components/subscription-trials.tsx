"use client";
import { useEffect, useState, useId } from "react";
import { NoticeToast } from "./notice-toast";
import { Laptop, Cloud, Loader2, Download, Copy } from "lucide-react";
import { trialPrompt } from "../../../packages/runner/trial-prompt.mjs";
import { ChoiceSelect } from "./choice-select";
import { downloadText } from "@/lib/download";
export function SubscriptionTrials({
  organizationId,
  call,
  readOnly,
  enabled,
}: {
  organizationId: string;
  call: (operation: string, args: any) => Promise<any>;
  readOnly: boolean;
  enabled: boolean;
}) {
  const [sources, setSources] = useState<any[]>([]),
    [trials, setTrials] = useState<any[]>([]),
    [selected, setSelected] = useState<string[]>([]),
    [route, setRoute] = useState("local"),
    [effort, setEffort] = useState("medium"),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [prepared, setPrepared] = useState<any>(null),
    [notice, setNotice] = useState("");
  const formId = useId();
  useEffect(() => {
    let active = true;
    if (!enabled) return;
    (async () => {
      const [library, history] = await Promise.all([
        fetch(`/api/library/${organizationId}?state=ready`, {
          cache: "no-store",
        }),
        fetch("/api/product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operation: "subscriptionTrialList",
            args: { organizationId },
          }),
        }),
      ]);
      if (
        !library.ok ||
        !history.ok ||
        library.redirected ||
        history.redirected
      )
        throw Error("Sign in again to view your trials.");
      const l = await library.json(),
        h = await history.json();
      if (active) {
        setSources((l.items ?? []).filter((s: any) => s.kind === "url"));
        setTrials(h.result ?? []);
      }
    })().catch((e) => {
      if (active) setError(e.message);
    });
    return () => {
      active = false;
    };
  }, [organizationId, enabled]);
  async function prepare() {
    setBusy(true);
    setError("");
    try {
      const id = await call("subscriptionTrialPrepare", {
        organizationId,
        sources: selected,
        route,
        effort,
        useOwnPlan: consent,
      });
      if (!id)
        throw Error("The trial was not prepared. Check your connection.");
      const bundle = await call("subscriptionTrialBundle", { id });
      if (!bundle) throw Error("The trial evidence could not be retrieved.");
      setPrepared(bundle);
      setNotice("");
      downloadText(
        `vibescroller-${route}-trial.json`,
        JSON.stringify(bundle, null, 2),
        "application/json",
      );
      setTrials(
        (await call("subscriptionTrialList", { organizationId })) ?? [],
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The trial could not be prepared.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function addResult(file: File) {
    setBusy(true);
    setError("");
    try {
      if (file.size > 500000)
        throw Error("Choose an agent result smaller than 500 KB.");
      const result = JSON.parse(await file.text());
      if (
        !trials.some((t) => t._id === result.trialId && t.state === "prepared")
      )
        throw Error("Prepare a matching trial first.");
      const accepted = await call("subscriptionTrialFinish", {
        id: result.trialId,
        bundleHash: result.bundleHash,
        results: result.results,
      });
      if (!accepted?.accepted)
        throw Error(
          "The returned result was not accepted. Your existing analysis is preserved.",
        );
      setTrials(
        (await call("subscriptionTrialList", { organizationId })) ?? [],
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The returned result could not be added.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!enabled) return null;
  return (
    <section className="panel" aria-label="Codex analysis trials">
      <h2>Try your Codex subscription</h2>
      <p>
        Compare prepared text from your saved posts on your laptop and in Codex
        cloud. Trials use your Codex allowance and keep your existing analysis
        and corrections. Video frames are not included in this comparison.
      </p>
      <div className="form-grid">
        <label htmlFor={`${formId}-route`}>
          Run in
          <ChoiceSelect
            aria-label="Trial location"
            id={`${formId}-route`}
            disabled={busy || readOnly}
            value={route}
            onValueChange={setRoute}
          >
            <option value="local">My laptop</option>
            <option value="codex_cloud">Codex cloud</option>
          </ChoiceSelect>
        </label>
        <label htmlFor={`${formId}-effort`}>
          Analysis depth
          <ChoiceSelect
            aria-label="Trial analysis depth"
            id={`${formId}-effort`}
            disabled={busy || readOnly}
            value={effort}
            onValueChange={setEffort}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
          </ChoiceSelect>
        </label>
      </div>
      <p>
        {route === "local" ? (
          <>
            <Laptop size={16} aria-hidden="true" /> Your laptop needs to stay
            awake.
          </>
        ) : (
          <>
            <Cloud size={16} aria-hidden="true" /> Use a private, published
            Codex environment.
          </>
        )}
      </p>
      <fieldset disabled={readOnly || busy}>
        <legend>Choose up to five posts with prepared evidence</legend>
        {sources.map((s) => (
          <label key={s._id} className="check">
            <input
              type="checkbox"
              checked={selected.includes(s._id)}
              onChange={(e) =>
                setSelected(
                  e.target.checked
                    ? [...selected, s._id].slice(0, 5)
                    : selected.filter((id) => id !== s._id),
                )
              }
              disabled={!selected.includes(s._id) && selected.length >= 5}
            />
            <span>{s.title}</span>
          </label>
        ))}
        {!sources.length && (
          <p>Available evidence will appear here after a post is prepared.</p>
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            Use my own Codex allowance for this trial. No paid API fallback.
          </span>
        </label>
      </fieldset>
      <button
        className="primary"
        disabled={readOnly || busy || !selected.length || !consent}
        onClick={prepare}
      >
        {busy ? (
          <Loader2 size={17} className="spinner" />
        ) : (
          <Download size={17} />
        )}{" "}
        Prepare {route === "local" ? "laptop" : "cloud"} trial
      </button>
      <p className="muted">
        The trial downloads a private evidence bundle for your agent. Returned
        results appear below after validation. This does not start the
        full-library scan.
      </p>
      {prepared && (
        <div className="form-grid">
          <button
            className="secondary"
            disabled={busy}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(trialPrompt(prepared));
                setNotice(
                  "Copied. Paste into Codex using GPT-6.1 Sol at the depth you chose.",
                );
              } catch {
                setError(
                  "Copy is unavailable here. Use your downloaded evidence bundle.",
                );
              }
            }}
          >
            <Copy size={17} /> Copy for Codex
          </button>
          {prepared.route === "codex_cloud" && (
            <a
              href="https://chatgpt.com/codex/cloud"
              target="_blank"
              rel="noreferrer"
              className="secondary"
            >
              Open Codex cloud
            </a>
          )}
        </div>
      )}
      <NoticeToast
        message={notice}
        kind="success"
        onDismiss={() => setNotice("")}
      />
      <label className="upload-analysis">
        Add your agent's result
        <input
          type="file"
          accept=".json,application/json"
          disabled={readOnly || busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void addResult(file);
          }}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      {trials.map((t) => (
        <article key={t._id} className="source-card">
          <strong>
            {t.route === "local" ? "Laptop" : "Codex cloud"} · {t.effort}
          </strong>
          <p className="status">
            {t.state === "completed"
              ? "Ready to review"
              : t.state === "canceled"
                ? "Canceled"
                : t.state === "expired"
                  ? "Expired or post changed"
                  : "Evidence prepared · awaiting analysis"}
          </p>
          {t.results?.map((r: any) => (
            <div key={r.sourceId}>
              <p>{r.summary}</p>
              {r.insights.map((i: any) => (
                <details key={i.id}>
                  <summary>{i.title}</summary>
                  <p>{i.claim}</p>
                  <p>{i.interpretation}</p>
                </details>
              ))}
              <p className="muted">{r.warnings.join(" ")}</p>
            </div>
          ))}
          {t.state !== "canceled" && (
            <button
              className="secondary"
              disabled={busy || readOnly}
              onClick={async () => {
                setBusy(true);
                try {
                  await call("subscriptionTrialCancel", { id: t._id });
                  if (prepared?.trialId === t._id) setPrepared(null);
                  setTrials(
                    (await call("subscriptionTrialList", { organizationId })) ??
                      [],
                  );
                } catch {
                  setError("The trial could not be deleted. Try again.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete trial evidence
            </button>
          )}
        </article>
      ))}
    </section>
  );
}
