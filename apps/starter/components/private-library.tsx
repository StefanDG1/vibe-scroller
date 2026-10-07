"use client";
import { useEffect, useRef, useState } from "react";
import { downloadText } from "@/lib/download";
type Space = "personal" | "business";
type Setup = {
  version: number;
  focus: Space[];
  goal: string;
  interests: string[];
  role: string;
  connectSpaces: boolean;
  confirmed: boolean;
  stage: 0 | 1 | 2;
};
const empty: Setup = {
  version: 0,
  focus: ["personal"],
  goal: "",
  interests: [],
  role: "",
  connectSpaces: false,
  confirmed: false,
  stage: 0,
};
async function read(operation: string, args: unknown) {
  const r = await fetch("/api/product", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation, args }),
  });
  if (
    !r.ok ||
    r.redirected ||
    !r.headers.get("content-type")?.includes("application/json")
  )
    throw new Error(
      "Your private library is unavailable. Check your session and reload.",
    );
  return (await r.json()).result;
}
export function PrivateLibrary({
  organizationId,
  call,
  readOnly,
  onOpenSource,
  onSave,
  onProjects,
}: {
  organizationId: string;
  call: (op: string, args: any) => Promise<any>;
  readOnly: boolean;
  onOpenSource: (source: any) => void;
  onSave: () => void;
  onProjects: () => void;
}) {
  const [setup, setSetup] = useState<Setup>(empty),
    [draft, setDraft] = useState<Setup>(empty),
    [step, setStep] = useState(0),
    [loaded, setLoaded] = useState(false),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [space, setSpace] = useState<Space | "connected">("personal"),
    [items, setItems] = useState<any[]>([]),
    [next, setNext] = useState<string | null>(null),
    [browsing, setBrowsing] = useState(false);
  const [interestText, setInterestText] = useState("");
  const request = useRef(0);
  useEffect(() => {
    let active = true;
    read("librarySetup", { organizationId })
      .then((value) => {
        if (active) {
          const initial = value ?? empty;
          setSetup(initial);
          setDraft(initial);
          setStep(initial.stage ?? 0);
          setInterestText(initial.interests.join(", "));
          setEditing(!initial.confirmed);
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setItems([]);
        }
      });
    return () => {
      active = false;
      // This is a request generation fence, not a rendered DOM ref.
      // oxlint-disable-next-line react-hooks/exhaustive-deps
      request.current++;
    };
  }, [organizationId]);
  async function save(confirmed: boolean) {
    setBusy(true);
    setError("");
    try {
      const value = await call("saveLibrarySetup", {
        organizationId,
        expectedVersion: setup.version,
        focus: draft.focus,
        goal: draft.goal,
        interests: interestText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        role: draft.role,
        connectSpaces: draft.connectSpaces,
        confirmed,
        stage: confirmed ? 2 : Math.min(2, step + 1),
      });
      if (!value)
        throw new Error(
          "Setup was not saved. Reload to check the current version.",
        );
      request.current++;
      setItems([]);
      setNext(null);
      setBrowsing(false);
      setSetup(value);
      setDraft(value);
      setInterestText(value.interests.join(", "));
      if (confirmed) setEditing(false);
      else setStep(Math.min(2, step + 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup was not saved.");
    } finally {
      setBusy(false);
    }
  }
  async function browse(selected: Space | "connected", cursor?: string) {
    const generation = ++request.current;
    setSpace(selected);
    setBrowsing(true);
    setBusy(true);
    setError("");
    if (!cursor) {
      setItems([]);
      setNext(null);
    }
    try {
      const page = await read(
        selected === "connected" ? "connectedSpaceSources" : "spaceSources",
        {
          organizationId,
          ...(selected === "connected" ? {} : { space: selected }),
          cursor,
        },
      );
      if (generation === request.current) {
        setItems((old) => [
          ...new Map(
            (cursor ? [...old, ...page.items] : page.items).map((item: any) => [
              item.id,
              item,
            ]),
          ).values(),
        ]);
        setNext(page.next);
      }
    } catch (e) {
      if (generation === request.current) {
        setItems([]);
        setNext(null);
        setError(e instanceof Error ? e.message : "Space unavailable.");
      }
    } finally {
      if (generation === request.current) setBusy(false);
    }
  }
  async function exportFiling() {
    setBusy(true);
    setError("");
    try {
      const rows: any[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < 100; page++) {
        const result = await read("exportSourceSpaces", {
          organizationId,
          cursor,
        });
        rows.push(...result.items);
        if (!result.next) {
          downloadText(
            "vibescroll-private-filing.json",
            JSON.stringify(
              { schemaVersion: 1, setup, memberships: rows },
              null,
              2,
            ),
            "application/json",
          );
          return;
        }
        cursor = result.next;
      }
      throw new Error(
        "This export exceeded its page limit. No partial file was downloaded.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export unavailable.");
    } finally {
      setBusy(false);
    }
  }
  if (!loaded)
    return error ? (
      <p role="alert" className="error">
        {error}
      </p>
    ) : (
      <output className="fine">Loading your private setup...</output>
    );
  return (
    <section
      className="panel private-library-setup"
      aria-label="Your private library"
    >
      <div className="row spread">
        <h2>
          {editing ? "Give your ideas a direction" : "Your private library"}
        </h2>
        {!editing && (
          <button
            className="button secondary"
            onClick={() => {
              setDraft(setup);
              setInterestText(setup.interests.join(", "));
              setStep(0);
              setEditing(true);
            }}
          >
            Edit setup
          </button>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {editing ? (
        <>
          <p className="fine">
            Step {step + 1} of 3. Saved answers resume here. Your choices do not
            share content, connect accounts or authorize spending.
          </p>
          {step === 0 && (
            <fieldset disabled={readOnly || busy}>
              <legend>What would you like to use your ideas for?</legend>
              <div className="row">
                {(["personal", "business"] as Space[]).map((value) => (
                  <label className="check" key={value}>
                    <input
                      type="checkbox"
                      checked={draft.focus.includes(value)}
                      onChange={(e) =>
                        setDraft((d) => {
                          const focus = e.target.checked
                            ? [...d.focus, value]
                            : d.focus.filter((s) => s !== value);
                          return {
                            ...d,
                            focus,
                            connectSpaces:
                              focus.length === 2 && d.connectSpaces,
                          };
                        })
                      }
                    />
                    {value === "personal"
                      ? "Personal interests"
                      : "Business and projects"}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {step === 1 && (
            <fieldset disabled={readOnly || busy}>
              <legend>What are you working toward?</legend>
              <label>
                A goal, in your words{" "}
                <input
                  maxLength={300}
                  value={draft.goal}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, goal: e.target.value }))
                  }
                  placeholder="e.g. Make onboarding clearer for my project"
                />
              </label>
              <label>
                Interests, separated by commas{" "}
                <input
                  maxLength={480}
                  value={interestText}
                  onChange={(e) => setInterestText(e.target.value)}
                  placeholder="e.g. Cooking, interface design"
                />
              </label>
              {draft.focus.includes("business") && (
                <label>
                  Your project role (optional)
                  <input
                    maxLength={80}
                    value={draft.role}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, role: e.target.value }))
                    }
                    placeholder="e.g. Owner, educator, developer"
                  />
                </label>
              )}
            </fieldset>
          )}
          {step === 2 && (
            <>
              <h3>Your setup preview</h3>
              <p>
                {draft.focus
                  .map((s) => (s === "personal" ? "Personal" : "Business"))
                  .join(" and ")}{" "}
                views in your owner-private library.
              </p>
              {draft.goal && <p>Goal: {draft.goal}</p>}
              {draft.interests.length > 0 && (
                <p>Interests: {draft.interests.join(", ")}</p>
              )}
              {draft.role && <p>Role: {draft.role}</p>}
              {draft.focus.length === 2 && (
                <label className="check">
                  <input
                    type="checkbox"
                    checked={draft.connectSpaces}
                    disabled={readOnly || busy}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        connectSpaces: e.target.checked,
                      }))
                    }
                  />
                  Browse my two private views together
                </label>
              )}
              <p className="fine">
                Team and assistant sharing stay separate. GitHub is optional.
                Processing still requires an available route and a bounded
                grant.
              </p>
            </>
          )}
          <div className="row">
            {step > 0 && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setStep(step - 1)}
              >
                Back
              </button>
            )}
            <button
              className="button primary"
              disabled={busy || readOnly || !draft.focus.length}
              onClick={() => {
                void save(step === 2);
              }}
            >
              {busy
                ? "Saving..."
                : step === 2
                  ? "Confirm my setup"
                  : "Save and continue"}
            </button>
            {setup.confirmed && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  setDraft(setup);
                  setInterestText(setup.interests.join(", "));
                  setEditing(false);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <p>
            {setup.focus
              .map((s) => (s === "personal" ? "Personal" : "Business"))
              .join(" and ")}
            {setup.goal
              ? `: ${setup.goal}`
              : " ideas, filed once and kept private."}
          </p>
          {setup.interests.length > 0 && (
            <p className="fine">Interests: {setup.interests.join(", ")}</p>
          )}
          <div className="row">
            <button className="button primary" onClick={onSave}>
              Bring one useful thing
            </button>
            {setup.focus.includes("business") && (
              <button className="button secondary" onClick={onProjects}>
                Set up a project (optional)
              </button>
            )}
          </div>
        </>
      )}
      <div className="row private-space-actions">
        {(["personal", "business"] as Space[]).map((s) => (
          <button
            className="button secondary"
            key={s}
            aria-pressed={browsing && space === s}
            disabled={busy}
            onClick={() => {
              void browse(s);
            }}
          >
            {s === "personal" ? "Personal" : "Business"}
          </button>
        ))}
        {setup.confirmed && setup.connectSpaces && (
          <button
            className="button secondary"
            aria-pressed={browsing && space === "connected"}
            disabled={busy}
            onClick={() => {
              void browse("connected");
            }}
          >
            Both private views
          </button>
        )}
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => {
            void exportFiling();
          }}
        >
          Export filing
        </button>
      </div>
      {browsing && (
        <div aria-live="polite">
          {busy && !items.length ? (
            <p>Loading saved posts...</p>
          ) : !items.length && !error ? (
            <p className="fine">
              No posts filed here yet. Open a saved post and choose Personal,
              Business or both.
            </p>
          ) : (
            <ul className="private-space-list">
              {items.map((item) => (
                <li key={item.id}>
                  <button onClick={() => onOpenSource(item)}>
                    {item.title}
                  </button>
                  <span className="fine">
                    {item.state === "ready" ? "Analysis ready" : "Saved post"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {next && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => {
                void browse(space, next);
              }}
            >
              Load more posts
            </button>
          )}
        </div>
      )}
    </section>
  );
}
