// Node-only module. The Next.js wrapper must also import "server-only" to enforce
// its build boundary. Do not import this file from client components or actions
// that accept role/configuration/token values supplied by a browser.
import { Buffer } from "node:buffer";
import {
  INTEGRATION_VERSION,
  SUMMARY_CONTRACT,
  id,
  origin,
  parseSummary,
  reference,
} from "./contract.ts";
import type { LaunchChecksStatus, SummaryEnvelope } from "./contract.ts";

export type IntegrationConfig =
  | { enabled?: false }
  | {
      enabled: true;
      adapterVersion: typeof INTEGRATION_VERSION;
      token: string;
      serviceOrigin: string;
      applicationId: string;
      reportingWorkspaceSlug: string;
      targetOrganizationId: string;
      targetOrigin: string;
      environmentId: string;
      cacheTtlMs?: number;
      timeoutMs?: number;
    };
export type CurrentDeployment = {
  organizationId: string;
  commit?: string;
  deploymentId?: string;
};
/** Must query the target application's CURRENT server-side membership on every call. */
export type Authorize = (
  organizationId: string,
) => Promise<{ organizationId: string; role: string } | null>;
/** Fixed server env names only. Disabled by default without reading any secret. */
export function integrationConfigFromEnv(
  env: Record<string, string | undefined>,
): IntegrationConfig {
  if (env.LP_INTEGRATION_ENABLED !== "true") return { enabled: false };
  return {
    enabled: true,
    adapterVersion: INTEGRATION_VERSION,
    token: env.LP_INTEGRATION_SUMMARY_TOKEN ?? "",
    serviceOrigin: env.LP_INTEGRATION_ORIGIN ?? "",
    applicationId: env.LP_INTEGRATION_APPLICATION_ID ?? "",
    reportingWorkspaceSlug: env.LP_INTEGRATION_WORKSPACE_SLUG ?? "",
    targetOrganizationId: env.LP_INTEGRATION_TARGET_ORGANIZATION_ID ?? "",
    targetOrigin: env.LP_INTEGRATION_TARGET_ORIGIN ?? "",
    environmentId: env.LP_INTEGRATION_ENVIRONMENT_ID ?? "",
    ...(env.LP_INTEGRATION_CACHE_TTL_MS !== undefined
      ? { cacheTtlMs: Number(env.LP_INTEGRATION_CACHE_TTL_MS) }
      : {}),
    ...(env.LP_INTEGRATION_TIMEOUT_MS !== undefined
      ? { timeoutMs: Number(env.LP_INTEGRATION_TIMEOUT_MS) }
      : {}),
  };
}
type Failure = Extract<LaunchChecksStatus, { state: "unavailable" }>["reason"];
type Mapping = Omit<Extract<IntegrationConfig, { enabled: true }>, "token">;
const MAX_BYTES = 16 * 1024;
function configuration(
  input: IntegrationConfig,
): { mapping: Mapping; credential: string } | null {
  if (!input || input.enabled !== true) return null;
  const allowed = [
    "enabled",
    "adapterVersion",
    "token",
    "serviceOrigin",
    "applicationId",
    "reportingWorkspaceSlug",
    "targetOrganizationId",
    "targetOrigin",
    "environmentId",
    "cacheTtlMs",
    "timeoutMs",
  ];
  if (
    Object.keys(input).some((k) => !allowed.includes(k)) ||
    input.adapterVersion !== INTEGRATION_VERSION ||
    !origin(input.serviceOrigin) ||
    !origin(input.targetOrigin) ||
    !id(input.applicationId) ||
    !id(input.targetOrganizationId) ||
    !id(input.reportingWorkspaceSlug) ||
    !reference(input.environmentId) ||
    typeof input.token !== "string" ||
    !/^lp_[a-f0-9]{64}$/.test(input.token)
  )
    throw new Error("CONFIGURATION_INVALID");
  const cacheTtlMs = input.cacheTtlMs ?? 60000,
    timeoutMs = input.timeoutMs ?? 3000;
  if (
    !Number.isInteger(cacheTtlMs) ||
    cacheTtlMs < 0 ||
    cacheTtlMs > 300000 ||
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 50 ||
    timeoutMs > 5000
  )
    throw new Error("CONFIGURATION_INVALID");
  const { token, ...mapping } = input;
  if (JSON.stringify(mapping).includes(token))
    throw new Error("CONFIGURATION_INVALID");
  return {
    mapping: Object.freeze({ ...mapping, cacheTtlMs, timeoutMs }),
    credential: token,
  };
}
export function createLaunchProofIntegration(
  input: IntegrationConfig,
  authorize: Authorize,
) {
  if (typeof window !== "undefined") throw new Error("SERVER_ONLY_INTEGRATION");
  let parsed: ReturnType<typeof configuration> = null,
    invalid = false;
  try {
    parsed = configuration(input);
  } catch {
    invalid = true;
  }
  const mapping = parsed?.mapping;
  let credential: string | undefined = parsed?.credential;
  parsed = null;
  let disconnected = false;
  let cache:
    | { envelope: SummaryEnvelope; fetchedAt: number; expires: number }
    | undefined;
  let lastCheckedAt: string | null = null;
  let inFlight:
    | Promise<
        { envelope: SummaryEnvelope; fetchedAt: number } | { failure: Failure }
      >
    | undefined;
  let controller: AbortController | undefined;
  const unavailable = (reason: Failure): LaunchChecksStatus => ({
    state: "unavailable",
    label: "Launch checks unavailable",
    reason,
    lastCheckedAt,
  });
  async function authorized(organizationId: string) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const member = await Promise.race([
        authorize(organizationId),
        new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), mapping?.timeoutMs ?? 3000);
        }),
      ]);
      return (
        member?.organizationId === organizationId &&
        ["owner", "admin"].includes(member.role)
      );
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
  async function retrieve(): Promise<
    { envelope: SummaryEnvelope; fetchedAt: number } | { failure: Failure }
  > {
    controller = new AbortController();
    const active = controller;
    const timer = setTimeout(() => active.abort(), mapping!.timeoutMs!);
    try {
      const response = await fetch(
        `${mapping!.serviceOrigin}/api/v1/applications/${encodeURIComponent(mapping!.applicationId)}/summary`,
        {
          method: "GET",
          redirect: "manual",
          credentials: "omit",
          cache: "no-store",
          signal: active.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${credential}`,
          },
        },
      );
      if (response.status !== 200) {
        await response.body?.cancel();
        return {
          failure:
            response.status === 401
              ? "authentication"
              : [403, 404].includes(response.status)
                ? "mapping_or_scope"
                : response.status === 429
                  ? "rate_limited"
                  : response.status >= 300 && response.status < 400
                    ? "redirect"
                    : "service",
        };
      }
      if (
        !/^application\/json(?:\s*;|$)/i.test(
          response.headers.get("content-type") ?? "",
        ) ||
        Number(response.headers.get("content-length")) > MAX_BYTES
      ) {
        await response.body?.cancel();
        return { failure: "invalid_response" };
      }
      const reader = response.body?.getReader();
      if (!reader) return { failure: "invalid_response" };
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_BYTES) {
          await reader.cancel();
          return { failure: "invalid_response" };
        }
        chunks.push(value);
      }
      const text = new TextDecoder("utf-8", { fatal: true }).decode(
        Buffer.concat(chunks),
      );
      let envelope: SummaryEnvelope;
      try {
        // A compromised upstream must not reflect our token into a client-visible ID.
        const raw: unknown = JSON.parse(text);
        if (credential && JSON.stringify(raw).includes(credential))
          return { failure: "invalid_response" };
        envelope = parseSummary(raw, mapping!.applicationId);
      } catch {
        return { failure: "invalid_response" };
      }
      if (envelope.report && envelope.report.createdAt > Date.now() + 60000)
        return { failure: "invalid_response" };
      const fetchedAt = Date.now();
      if (!disconnected) {
        cache = {
          envelope,
          fetchedAt,
          expires: performance.now() + mapping!.cacheTtlMs!,
        };
        lastCheckedAt = new Date(fetchedAt).toISOString();
      }
      return { envelope, fetchedAt };
    } catch {
      return { failure: active.signal.aborted ? "timeout" : "service" };
    } finally {
      clearTimeout(timer);
      if (controller === active) controller = undefined;
    }
  }
  return {
    async read(inputCurrent: CurrentDeployment): Promise<LaunchChecksStatus> {
      const current = { ...inputCurrent };
      if (disconnected || (!mapping && !invalid)) return { state: "disabled" };
      // Never accept a client-supplied role. Recheck membership even for cached data.
      if (
        !current ||
        !id(current.organizationId) ||
        (mapping && current.organizationId !== mapping.targetOrganizationId) ||
        !(await authorized(current.organizationId))
      )
        return { state: "hidden" };
      if (disconnected) return { state: "disabled" };
      if (invalid || !mapping)
        return {
          state: "setup_required",
          label: "Launch checks setup required",
          reason: "configuration_invalid",
        };
      if (
        (current.commit !== undefined && !reference(current.commit)) ||
        (current.deploymentId !== undefined && !reference(current.deploymentId))
      )
        return {
          state: "setup_required",
          label: "Launch checks setup required",
          reason: "configuration_invalid",
        };
      const cached = !!cache && performance.now() < cache.expires;
      let value:
        { envelope: SummaryEnvelope; fetchedAt: number } | { failure: Failure };
      if (cached) value = cache!;
      else {
        cache = undefined;
        inFlight ??= retrieve().finally(() => {
          inFlight = undefined;
        });
        value = await inFlight;
        if (disconnected) return { state: "disabled" };
        if (!(await authorized(current.organizationId)))
          return { state: "hidden" };
      }
      if ("failure" in value) return unavailable(value.failure);
      const report = value.envelope.report;
      const fetchedAt = new Date(value.fetchedAt).toISOString();
      if (!report || report.expiresAt <= Date.now()) {
        if (report) cache = undefined;
        return {
          state: "missing",
          label: "No retained LaunchProof report",
          fetchedAt,
        };
      }
      const reasons: string[] = [];
      if (report.environmentId !== mapping.environmentId)
        reasons.push("environment_mismatch");
      if (report.target.origin !== mapping.targetOrigin)
        reasons.push("target_mismatch");
      const immutableCommit = (commit: string | undefined) =>
        !!commit && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(commit);
      if (
        immutableCommit(current.commit) &&
        immutableCommit(report.target.commit) &&
        current.commit !== report.target.commit
      )
        reasons.push("commit_mismatch");
      if (
        current.deploymentId &&
        report.target.deploymentId &&
        current.deploymentId !== report.target.deploymentId
      )
        reasons.push("deploymentId_mismatch");
      let state: "matching_claim" | "not_tested" | "comparison_unsupported" =
        reasons.length ? "not_tested" : "matching_claim";
      if (
        !reasons.length &&
        ((!current.commit && !current.deploymentId) ||
          (current.commit &&
            (!immutableCommit(current.commit) ||
              !immutableCommit(report.target.commit))) ||
          (current.deploymentId && !report.target.deploymentId))
      ) {
        state = "comparison_unsupported";
        reasons.push("deployment_identity_missing");
      }
      return {
        state: "available",
        contract: SUMMARY_CONTRACT,
        adapterVersion: INTEGRATION_VERSION,
        label:
          state === "not_tested"
            ? "Not tested for this deployment"
            : state === "comparison_unsupported"
              ? "Deployment comparison unavailable"
              : "Report matches declared deployment",
        deployment: { state, reasons },
        reportId: report._id,
        applicationId: mapping.applicationId,
        reportUrl: `${mapping.serviceOrigin}/app/${encodeURIComponent(mapping.reportingWorkspaceSlug)}/reports/${encodeURIComponent(report._id)}`,
        environmentId: report.environmentId,
        targetOrigin: report.target.origin,
        testedCommit: report.target.commit ?? null,
        testedDeploymentId: report.target.deploymentId ?? null,
        uploadedAt: new Date(report.createdAt).toISOString(),
        executionAt: null,
        retainedUntil: new Date(report.expiresAt).toISOString(),
        fetchedAt,
        cached,
        summary: structuredClone(report.summary),
        execution: report.provenance.execution,
        identityEvidence: "customer_declared",
        limitations: [
          "Customer-run report; not a certification.",
          "Commit and deployment identity are customer-declared, not independently verified.",
          "Execution time is absent from the summary API; upload time does not establish test freshness.",
          "The API selects the latest retained upload across all application environments; it may return an older retained upload after deletion or expiry.",
        ],
      };
    },
    disconnect() {
      disconnected = true;
      credential = undefined;
      cache = undefined;
      lastCheckedAt = null;
      controller?.abort();
    },
  };
}
