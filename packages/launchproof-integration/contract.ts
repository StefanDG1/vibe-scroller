/** Versioned data returned to an owner/admin server-rendered view. No credentials. */
export const INTEGRATION_VERSION = "0.1.1" as const;
export const SUMMARY_CONTRACT = "launchproof-summary-v1" as const;
export type Outcome =
  | "BLOCKED_FOR_DECLARED_SCOPE"
  | "UNVERIFIED_FOR_DECLARED_SCOPE"
  | "PASSED_FOR_DECLARED_SCOPE";
export type ScopeSummary = {
  outcome: Outcome;
  required: number;
  passed: number;
  failed: number;
  unverified: number;
};
export type SummaryEnvelope = {
  applicationId: string;
  report: null | {
    _id: string;
    applicationId: string;
    createdAt: number;
    expiresAt: number;
    environmentId: string;
    target: {
      origin: string;
      commit?: string;
      deploymentId?: string;
      identityEvidence: "customer_declared";
    };
    summary: ScopeSummary;
    provenance: {
      execution: "customer_local" | "customer_ci";
      runnerVersion: "0.1.0" | "0.1.1";
      adapterId: "companynerve-v1";
      adapterVersion: "0.1.0";
      planDigest: string;
      policyDigest: string;
    };
  };
};
export type LaunchChecksStatus =
  | { state: "disabled" | "hidden" }
  | {
      state: "setup_required";
      label: "Launch checks setup required";
      reason: "configuration_invalid";
    }
  | {
      state: "unavailable";
      label: "Launch checks unavailable";
      reason:
        | "authentication"
        | "mapping_or_scope"
        | "rate_limited"
        | "service"
        | "timeout"
        | "invalid_response"
        | "redirect";
      lastCheckedAt: string | null;
    }
  | {
      state: "missing";
      label: "No retained LaunchProof report";
      fetchedAt: string;
    }
  | {
      state: "available";
      label: string;
      contract: typeof SUMMARY_CONTRACT;
      adapterVersion: typeof INTEGRATION_VERSION;
      deployment: {
        state: "matching_claim" | "not_tested" | "comparison_unsupported";
        reasons: string[];
      };
      reportId: string;
      applicationId: string;
      reportUrl: string;
      environmentId: string;
      targetOrigin: string;
      testedCommit: string | null;
      testedDeploymentId: string | null;
      uploadedAt: string;
      executionAt: null;
      retainedUntil: string;
      fetchedAt: string;
      cached: boolean;
      summary: ScopeSummary;
      execution: "customer_local" | "customer_ci";
      identityEvidence: "customer_declared";
      limitations: string[];
    };

// Deliberately dependency-free. Reject unknown fields rather than forwarding them.
function object(
  value: unknown,
  required: string[],
  optional: string[] = [],
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("INVALID_RESPONSE");
  const row = value as Record<string, unknown>;
  if (
    required.some((key) => !Object.hasOwn(row, key)) ||
    Object.keys(row).some(
      (key) => !required.includes(key) && !optional.includes(key),
    )
  )
    throw new Error("INVALID_RESPONSE");
  return row;
}
export function id(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,160}$/.test(value);
}
export function reference(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,159}$/.test(value)
  );
}
export function origin(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 300) return false;
  try {
    const url = new URL(value);
    return (
      url.origin === value &&
      !url.username &&
      !url.password &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" &&
          ["127.0.0.1", "[::1]"].includes(url.hostname)))
    );
  } catch {
    return false;
  }
}
const timestamp = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value >= 0 &&
  value <= 8640000000000000;
const digest = (value: unknown) =>
  typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
export function parseSummary(
  value: unknown,
  applicationId: string,
): SummaryEnvelope {
  const envelope = object(value, ["applicationId", "report"]);
  if (envelope.applicationId !== applicationId)
    throw new Error("INVALID_RESPONSE");
  if (envelope.report === null) return { applicationId, report: null };
  const r = object(envelope.report, [
    "_id",
    "applicationId",
    "createdAt",
    "expiresAt",
    "environmentId",
    "target",
    "summary",
    "provenance",
  ]);
  if (
    !id(r._id) ||
    r.applicationId !== applicationId ||
    !reference(r.environmentId) ||
    !timestamp(r.createdAt) ||
    !timestamp(r.expiresAt) ||
    r.expiresAt <= r.createdAt
  )
    throw new Error("INVALID_RESPONSE");
  const target = object(
    r.target,
    ["origin", "identityEvidence"],
    ["commit", "deploymentId"],
  );
  if (
    !origin(target.origin) ||
    target.identityEvidence !== "customer_declared" ||
    (target.commit !== undefined && !reference(target.commit)) ||
    (target.deploymentId !== undefined && !reference(target.deploymentId))
  )
    throw new Error("INVALID_RESPONSE");
  const s = object(r.summary, [
    "outcome",
    "required",
    "passed",
    "failed",
    "unverified",
  ]);
  for (const key of ["required", "passed", "failed", "unverified"])
    if (
      typeof s[key] !== "number" ||
      !Number.isInteger(s[key]) ||
      s[key] < 0 ||
      s[key] > 250
    )
      throw new Error("INVALID_RESPONSE");
  const summary = s as ScopeSummary;
  const expected = summary.failed
    ? "BLOCKED_FOR_DECLARED_SCOPE"
    : summary.unverified
      ? "UNVERIFIED_FOR_DECLARED_SCOPE"
      : "PASSED_FOR_DECLARED_SCOPE";
  if (
    !summary.required ||
    summary.required !== summary.passed + summary.failed + summary.unverified ||
    summary.outcome !== expected
  )
    throw new Error("INVALID_RESPONSE");
  const p = object(r.provenance, [
    "execution",
    "runnerVersion",
    "adapterId",
    "adapterVersion",
    "planDigest",
    "policyDigest",
  ]);
  if (
    !["customer_local", "customer_ci"].includes(String(p.execution)) ||
    (p.runnerVersion !== "0.1.0" && p.runnerVersion !== "0.1.1") ||
    p.adapterId !== "companynerve-v1" ||
    p.adapterVersion !== "0.1.0" ||
    !digest(p.planDigest) ||
    !digest(p.policyDigest)
  )
    throw new Error("INVALID_RESPONSE");
  return structuredClone(envelope) as SummaryEnvelope;
}
