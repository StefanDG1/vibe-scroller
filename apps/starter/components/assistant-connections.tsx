"use client";
import { useEffect, useRef, useState } from "react";
import { usePolling } from "@/lib/use-polling";
import { ChoiceSelect } from "./choice-select";
type Source = {
  sourceId: string;
  title: string;
  generation: number;
  revision: number;
};
type Grant = {
  id: string;
  clientId: string;
  scopes: string[];
  sources: Omit<Source, "title">[];
  version: number;
  state: string;
  expiresAt: number;
};
type Setup = {
  nextCursor: string | null;
  enabled: boolean;
  clients: { id: string; name: string; scopes: string[] }[];
  sources: Source[];
  grants: Grant[];
  context: {
    version: number;
    goal: string;
    role: string;
    interests: string[];
  } | null;
  coverage: string;
};
const scopeNames: Record<string, string> = {
  "knowledge:read": "Read selected saved ideas",
  "context:read": "Read my confirmed goal and interests",
  "links:save": "Save links I explicitly request",
  "jobs:read": "Read status of selected work",
  "analysis:request": "Prepare analysis for my review",
  "feedback:write": "Record feedback I explicitly state",
  "suggestions:draft": "Prepare private project suggestions",
  "events:subscribe": "Notify me about selected completed work",
};
export function AssistantConnections({
  organizationId,
  call,
  readOnly,
  demo,
}: {
  organizationId: string;
  call: (op: string, args: unknown) => Promise<unknown>;
  readOnly: boolean;
  demo: boolean;
}) {
  const [data, setData] = useState<Setup | null>(null);
  const [clientId, setClientId] = useState("");
  const [selected, setSelected] = useState<Source[]>([]);
  const [pageCursor, setPageCursor] = useState<string | null>(null);
  const [scopes, setScopes] = useState<string[]>([]);
  const [intakeSpace, setIntakeSpace] = useState("");
  const [ack, setAck] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const busy = pending !== null;
  const [pageLoading, setPageLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState(0);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  async function load() {
    const current = ++generation.current;
    try {
      const response = await fetch("/api/product", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "assistantSetup",
          args: { organizationId, cursor: pageCursor },
        }),
      });
      if (
        !response.ok ||
        response.redirected ||
        !response.headers.get("content-type")?.includes("application/json")
      )
        throw Error("Reload Connections after signing in to review access.");
      const next = (await response.json()).result as Setup;
      if (current === generation.current) {
        setData(next);
        setCheckedAt(Date.now());
        setPageLoading(false);
        setError("");
      }
    } catch {
      if (current === generation.current) {
        setData(null);
        setPageLoading(false);
        setAck("");
        setError(
          "Access could not be checked. Reload Connections after signing in.",
        );
      }
    }
  }
  usePolling(
    load,
    60000,
    !demo && !busy,
    `${organizationId}:${pageCursor ?? "first"}`,
  );
  const client = data?.clients.find((c) => c.id === clientId);
  const existing = data?.grants.find((g) => g.clientId === clientId);
  const sources = selected.map(
    (ref) => data?.sources.find((s) => s.sourceId === ref.sourceId) ?? ref,
  );
  const binding = JSON.stringify([
    organizationId,
    clientId,
    sources,
    scopes,
    intakeSpace,
    data?.context?.version,
    existing?.version,
  ]);
  const disabled = busy || pageLoading || readOnly || demo || !data?.enabled;
  function changePage(cursor: string | null) {
    generation.current++;
    setPageLoading(true);
    setAck("");
    setPageCursor(cursor);
  }
  async function save(expiresAt: number) {
    setPending("save");
    setError("");
    try {
      const result = await call("saveAssistantGrant", {
        organizationId,
        clientId,
        sources: sources.map(({ title: _title, ...r }) => r),
        scopes,
        ...(scopes.includes("context:read")
          ? { contextVersion: data?.context?.version }
          : {}),
        ...(scopes.includes("links:save") && intakeSpace
          ? { intakeSpace }
          : {}),
        expectedVersion: existing?.version ?? 0,
        expiresAt,
        acknowledged: true,
      });
      if (!result)
        throw Error(
          "Access was not saved. Complete the fresh sign-in prompt, reload, and review again.",
        );
      setAck("");
      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Access was not saved. Reload and review again.",
      );
    } finally {
      setPending(null);
    }
  }
  async function revoke(grant: Grant) {
    setPending(grant.id);
    setError("");
    try {
      if (
        !(await call("revokeAssistantGrant", {
          id: grant.id,
          expectedVersion: grant.version,
        }))
      )
        throw Error("Revocation was not confirmed. Reload to check access.");
      setAck("");
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Revocation was not confirmed.",
      );
    } finally {
      setPending(null);
    }
  }
  function exportGrants() {
    if (!data) return;
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              schemaVersion: 1,
              organizationId,
              exportedAt: Date.now(),
              grants: data.grants,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "vibescroll-assistant-grants.json";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section
      className="panel assistant-connections"
      aria-labelledby="assistant-access-title"
    >
      <h2 id="assistant-access-title">Use saved ideas in your assistant</h2>
      <p>
        Choose exactly what a connected assistant can retrieve. This access
        lasts seven days. ChatGPT or Codex may retain ideas already disclosed in
        a conversation.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {demo ? (
        <p className="notice">
          Assistant access needs your own signed-in account.
        </p>
      ) : !data ? (
        !error && <output>Checking current access...</output>
      ) : (
        <>
          {!data.enabled && (
            <p className="notice">
              Assistant connection is being prepared. New grants are unavailable
              until official OAuth is configured and verified.
            </p>
          )}
          <div className="assistant-grant-list">
            {data.grants.map((grant) => (
              <div key={grant.id} className="assistant-grant-row">
                <div>
                  <strong>
                    {data.clients.find((c) => c.id === grant.clientId)?.name ??
                      "Previously configured assistant"}
                  </strong>
                  <p className="fine">
                    {grant.state === "active" && grant.expiresAt > checkedAt
                      ? `Active until ${new Date(grant.expiresAt).toLocaleString()}`
                      : "Access ended"}
                    . {grant.sources.length} selected posts.
                  </p>
                </div>
                {grant.state === "active" && (
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy || readOnly}
                    onClick={() => void revoke(grant)}
                  >
                    {pending === grant.id
                      ? "Revoking access..."
                      : "Revoke access"}
                  </button>
                )}
              </div>
            ))}
          </div>
          <details className="assistant-grant-editor">
            <summary>Review a seven-day grant</summary>
            <label htmlFor="assistant-client-choice">
              Assistant
              <ChoiceSelect
                id="assistant-client-choice"
                value={clientId}
                onValueChange={(value) => {
                  setClientId(value);
                  setScopes([]);
                  setSelected([]);
                  setAck("");
                }}
                disabled={disabled}
                aria-label="Assistant client"
              >
                <option value="">Choose an assistant</option>
                {data.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </ChoiceSelect>
            </label>
            {client && (
              <>
                <fieldset>
                  <legend>Allowed actions</legend>
                  {client.scopes.map((scope) => (
                    <label key={scope} className="check">
                      <input
                        type="checkbox"
                        disabled={
                          disabled ||
                          (scope === "context:read" && !data.context)
                        }
                        checked={scopes.includes(scope)}
                        onChange={(e) => {
                          setScopes((old) =>
                            e.target.checked
                              ? [...old, scope]
                              : old.filter((s) => s !== scope),
                          );
                          setAck("");
                        }}
                      />
                      {scopeNames[scope] ?? scope}
                    </label>
                  ))}
                </fieldset>
                {scopes.includes("context:read") && data.context && (
                  <div className="assistant-context">
                    <p>{data.context.goal || "No stated goal"}</p>
                    <p className="fine">
                      {data.context.role}. {data.context.interests.join(", ")}
                    </p>
                    <a href={`/app/${organizationId}/library`}>
                      Review my stated context
                    </a>
                  </div>
                )}
                {scopes.includes("links:save") && (
                  <label htmlFor="assistant-intake-choice">
                    File new links in
                    <ChoiceSelect
                      id="assistant-intake-choice"
                      value={intakeSpace}
                      onValueChange={(v) => {
                        setIntakeSpace(v);
                        setAck("");
                      }}
                      disabled={disabled}
                      aria-label="Assistant intake space"
                    >
                      <option value="">
                        Choose in the app for each saved link
                      </option>
                      <option value="personal">Personal</option>
                      <option value="business">Business</option>
                    </ChoiceSelect>
                  </label>
                )}
                <fieldset>
                  <legend>Selected posts</legend>
                  <p className="fine">
                    {data.coverage} Corrections or rights changes require a new
                    review.
                  </p>
                  <div className="assistant-source-choices">
                    {pageLoading && <output>Loading post page...</output>}
                    {data.sources.map((source) => (
                      <label key={source.sourceId} className="check">
                        <input
                          type="checkbox"
                          disabled={
                            disabled ||
                            (!selected.some(
                              (s) => s.sourceId === source.sourceId,
                            ) &&
                              selected.length >= 50)
                          }
                          checked={selected.some(
                            (s) => s.sourceId === source.sourceId,
                          )}
                          onChange={(e) => {
                            setSelected((old) =>
                              e.target.checked
                                ? [...old, source]
                                : old.filter(
                                    (s) => s.sourceId !== source.sourceId,
                                  ),
                            );
                            setAck("");
                          }}
                        />
                        <span>
                          {source.title}
                          <a
                            href={`/app/${organizationId}/library/${source.sourceId}`}
                          >
                            Review evidence
                          </a>
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="fine">
                    {selected.length} of 50 selected. Your selection stays while
                    you browse pages.
                  </p>
                  <div className="row">
                    {pageCursor && (
                      <button
                        type="button"
                        className="secondary"
                        disabled={busy || pageLoading}
                        onClick={() => changePage(null)}
                      >
                        Newest posts
                      </button>
                    )}
                    {data.nextCursor && (
                      <button
                        type="button"
                        className="secondary"
                        disabled={busy || pageLoading}
                        onClick={() => changePage(data.nextCursor)}
                      >
                        Older posts
                      </button>
                    )}
                    {selected.length > 0 && (
                      <button
                        type="button"
                        className="secondary"
                        disabled={disabled}
                        onClick={() => {
                          setSelected([]);
                          setAck("");
                        }}
                      >
                        Clear selection
                      </button>
                    )}
                  </div>
                  {sources.length > 0 && (
                    <details className="assistant-selected-review">
                      <summary>Review {sources.length} selected posts</summary>
                      <ul>
                        {sources.map((source) => (
                          <li key={source.sourceId}>
                            <a
                              href={`/app/${organizationId}/library/${source.sourceId}`}
                            >
                              {source.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {!data.sources.length && (
                    <p>
                      Save a post in your Library to grant access to its ideas.
                    </p>
                  )}
                </fieldset>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={ack === binding}
                    disabled={disabled}
                    onChange={(e) => setAck(e.target.checked ? binding : "")}
                  />
                  I approve these exact posts and actions for seven days. A
                  replacement removes any previously selected access.
                </label>
                <p className="fine">
                  Fresh app sign-in is required within five minutes. This grant
                  does not authorize spending, coding, publication, or access to
                  chat history.
                </p>
                <button
                  type="button"
                  className="primary"
                  disabled={
                    disabled ||
                    ack !== binding ||
                    !scopes.length ||
                    (!sources.length &&
                      !scopes.includes("context:read") &&
                      !scopes.includes("links:save"))
                  }
                  onClick={() => void save(Date.now() + 7 * 86400000)}
                >
                  {pending === "save"
                    ? "Saving access..."
                    : "Save reviewed access"}
                </button>
              </>
            )}
          </details>
          <button
            type="button"
            className="secondary"
            disabled={busy || pageLoading}
            onClick={exportGrants}
          >
            Export my access records
          </button>
        </>
      )}
      {!demo && (
        <button
          type="button"
          className="secondary"
          disabled={busy || pageLoading}
          onClick={() => void load()}
        >
          Refresh access
        </button>
      )}
    </section>
  );
}
