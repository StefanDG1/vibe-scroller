"use client";
import { useRef, useState } from "react";
import { ChoiceSelect } from "./choice-select";
async function read(operation: string, args: unknown) {
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
    throw new Error("Sharing is unavailable. Check your session and reload.");
  return (await response.json()).result;
}
function oneWeekFromNow() {
  return Date.now() + 7 * 86400000;
}
export function TeamKnowledgeSharing({
  organizationId,
  source,
  call,
  readOnly,
}: {
  organizationId: string;
  source: any;
  call: (op: string, args: any) => Promise<any>;
  readOnly: boolean;
}) {
  const [targets, setTargets] = useState<any[]>([]),
    [grants, setGrants] = useState<any[]>([]),
    [target, setTarget] = useState(""),
    [acknowledgedBinding, setAcknowledgedBinding] = useState(""),
    [replaceSelection, setReplaceSelection] = useState(false),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const generation = useRef(0);
  const existing = grants.find((g) => g.recipientOrganizationId === target);
  const bindingKey = JSON.stringify([
    organizationId,
    source._id ?? source.id,
    source.generation,
    source.updatedAt,
    target,
    existing?.version ?? 0,
    replaceSelection,
  ]);
  const acknowledged = acknowledgedBinding === bindingKey;
  async function load() {
    const current = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const [choices, rows] = await Promise.all([
        read("teamKnowledgeTargets", { organizationId }),
        read("teamKnowledgeGrants", { organizationId }),
      ]);
      if (current === generation.current) {
        setTargets(choices);
        setGrants(rows);
      }
    } catch (e) {
      if (current === generation.current) {
        setTargets([]);
        setGrants([]);
        setError(e instanceof Error ? e.message : "Sharing unavailable.");
      }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }
  async function share() {
    setBusy(true);
    setError("");
    try {
      const old = grants.find((g) => g.recipientOrganizationId === target);
      const binding = {
        sourceId: source._id ?? source.id,
        generation: source.generation,
        revision: source.updatedAt,
      };
      const sources = [
        ...(old?.state === "active" && !old.expired && !replaceSelection
          ? old.sources
          : []
        ).filter((r: any) => r.sourceId !== binding.sourceId),
        binding,
      ];
      const result = await call("saveTeamKnowledgeGrant", {
        organizationId,
        recipientOrganizationId: target,
        expectedVersion: old?.version ?? 0,
        sources,
        expiresAt: oneWeekFromNow(),
        acknowledged: true,
      });
      if (!result)
        throw new Error(
          "The grant was not saved. Complete the sign-in or review prompt, then try again.",
        );
      setAcknowledgedBinding("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sharing was not saved.");
    } finally {
      setBusy(false);
    }
  }
  async function revoke(grant: any) {
    setBusy(true);
    setError("");
    try {
      const result = await call("revokeTeamKnowledgeGrant", {
        organizationId,
        id: grant.id,
        expectedVersion: grant.version,
      });
      if (!result)
        throw new Error(
          "Revocation was not confirmed. Reload to check the current grant.",
        );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revocation unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      className="panel source-notes private-library-setup"
      onToggle={(event) => {
        if (event.currentTarget.open) {
          void load();
        } else {
          generation.current++;
          setTargets([]);
          setGrants([]);
          setAcknowledgedBinding("");
        }
      }}
    >
      <summary>Share selected knowledge with a workspace</summary>
      <p>
        Your Personal/Business filing stays private. This separate grant shares
        this version's title and cited analysis with all current members of the
        workspace you choose, for seven days. It does not share transcripts,
        frames, profile answers or credentials.
      </p>
      <p className="fine">
        Source generation {source.generation}; revised{" "}
        {new Date(source.updatedAt).toLocaleString()}.
      </p>
      <p className="fine">
        Corrections, deletion, expiry and revocation stop future retrieval. A
        recipient may retain material already disclosed. Fresh sign-in is
        required to create a grant; revocation has no extra sign-in requirement.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <output>Loading your sharing choices...</output>
      ) : (
        <>
          <ChoiceSelect
            value={target}
            onValueChange={(value) => {
              setTarget(value);
              setAcknowledgedBinding("");
            }}
            disabled={busy || readOnly}
            aria-label="Shared workspace"
          >
            <option value="">Choose a workspace</option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </ChoiceSelect>
          {!targets.length && !error && (
            <p className="fine">
              No eligible shared workspace. Create or join one with permission
              to share before granting access.
            </p>
          )}
          {target &&
            grants.some(
              (g) =>
                g.recipientOrganizationId === target &&
                g.state === "active" &&
                !g.expired,
            ) && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={replaceSelection}
                  disabled={busy || readOnly}
                  onChange={(e) => {
                    setReplaceSelection(e.target.checked);
                    setAcknowledgedBinding("");
                  }}
                />
                Share only this post; remove this grant's other selections.
              </label>
            )}
          {target && (
            <label className="check">
              <input
                type="checkbox"
                checked={acknowledged}
                disabled={busy || readOnly}
                onChange={(e) =>
                  setAcknowledgedBinding(e.target.checked ? bindingKey : "")
                }
              />
              I have permission to share this exact source version for seven
              days.{" "}
              {replaceSelection
                ? "Remove other selections."
                : "Keep other selections only in an active, unexpired grant."}
            </label>
          )}
          <button
            className="button primary"
            disabled={
              busy ||
              readOnly ||
              !target ||
              !acknowledged ||
              !source.rightsAttested
            }
            onClick={() => {
              void share();
            }}
          >
            {busy ? "Saving..." : "Share reviewed version"}
          </button>
          {grants.length > 0 && (
            <>
              <h3 className="knowledge-grants-heading">
                Your workspace grants
              </h3>
              <ul className="private-space-list">
                {grants.map((g) => (
                  <li key={g.id}>
                    <span>
                      <strong>{g.targetName}</strong>
                      <span className="fine">
                        {" "}
                        {g.state === "revoked"
                          ? "Revoked"
                          : g.expired
                            ? "Expired"
                            : `Expires ${new Date(g.expiresAt).toLocaleDateString()}`}{" "}
                        / {g.selectedSourceCount} selected source versions.
                        Changed versions require review.
                      </span>
                    </span>
                    {g.state === "active" && (
                      <button
                        className="button secondary"
                        disabled={busy || readOnly}
                        onClick={() => {
                          void revoke(g);
                        }}
                      >
                        Revoke grant
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </details>
  );
}
