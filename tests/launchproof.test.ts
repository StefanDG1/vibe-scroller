// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import {
  createLaunchProofIntegration,
  integrationConfigFromEnv,
} from "../packages/launchproof-integration/server.ts";
import type { SummaryEnvelope } from "../packages/launchproof-integration/contract.ts";
import { parseSummary } from "../packages/launchproof-integration/contract.ts";

vi.mock("server-only", () => ({}));
const session = vi.hoisted(() => ({ backend: vi.fn() }));
vi.mock("../apps/starter/lib/backend", async () => ({
  backend: session.backend,
  api: (await import("../convex/_generated/api")).api,
}));
import { readLaunchChecks } from "../apps/starter/lib/launchproof";

const modules = import.meta.glob("../convex/**/*.ts");
const token = `lp_${"a".repeat(64)}`;
const commit = "b".repeat(40);
function envelope(): SummaryEnvelope {
  return {
    applicationId: "app_a",
    report: {
      _id: "report_a",
      applicationId: "app_a",
      createdAt: Date.now() - 1000,
      expiresAt: Date.now() + 60000,
      environmentId: "staging",
      target: {
        origin: "https://target.convex.cloud",
        commit,
        identityEvidence: "customer_declared",
      },
      summary: {
        outcome: "PASSED_FOR_DECLARED_SCOPE",
        required: 3,
        passed: 3,
        failed: 0,
        unverified: 0,
      },
      provenance: {
        execution: "customer_local",
        runnerVersion: "0.1.1",
        adapterId: "companynerve-v1",
        adapterVersion: "0.1.0",
        planDigest: `sha256:${"a".repeat(64)}`,
        policyDigest: `sha256:${"b".repeat(64)}`,
      },
    },
  };
}
function enable(organizationId: string) {
  for (const [key, value] of Object.entries({
    LP_INTEGRATION_ENABLED: "true",
    LP_INTEGRATION_SUMMARY_TOKEN: token,
    LP_INTEGRATION_ORIGIN: "https://launch.companynerve.com",
    LP_INTEGRATION_APPLICATION_ID: "app_a",
    LP_INTEGRATION_WORKSPACE_SLUG: "reporting-a",
    LP_INTEGRATION_TARGET_ORGANIZATION_ID: organizationId,
    LP_INTEGRATION_TARGET_ORIGIN: "https://target.convex.cloud",
    LP_INTEGRATION_ENVIRONMENT_ID: "staging",
    LP_INTEGRATION_CURRENT_COMMIT: commit,
    LP_INTEGRATION_CURRENT_DEPLOYMENT_ID: "",
    LP_INTEGRATION_TIMEOUT_MS: "50",
    LP_INTEGRATION_CACHE_TTL_MS: "60000",
  }))
    vi.stubEnv(key, value);
}
async function fixture() {
  const t = convexTest(schema, modules);
  const ownerId = await t.mutation(internal.accounts.syncUser, {
    subject: "lp-owner",
    email: "owner@example.test",
    name: "Owner",
  });
  const memberId = await t.mutation(internal.accounts.syncUser, {
    subject: "lp-member",
    email: "member@example.test",
    name: "Member",
  });
  const owner = t.withIdentity({ subject: "lp-owner" });
  const member = t.withIdentity({ subject: "lp-member" });
  const org = await owner.mutation(api.organizations.create, {
    name: "Mapped",
  });
  const other = await owner.mutation(api.organizations.create, {
    name: "Unmapped",
  });
  const membershipId = await t.run((ctx) =>
    ctx.db.insert("memberships", {
      organizationId: org,
      userId: memberId,
      role: "admin",
    }),
  );
  session.backend.mockResolvedValue(owner);
  enable(org);
  return { t, owner, member, org, other, membershipId, ownerId };
}
beforeEach(() => {
  session.backend.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("CompanyNerve optional LaunchProof wrapper", () => {
  it.each([
    ["0.1.0", "0.1.0", true],
    ["0.1.1", "0.1.0", true],
    ["0.1.2", "0.1.0", false],
    ["9.0.0", "0.1.0", false],
    ["0.1.1-beta", "0.1.0", false],
    ["0.1.1", "0.1.1", false],
  ])(
    "validates runner %s and check adapter %s compatibility",
    (runnerVersion, adapterVersion, accepted) => {
      const body = envelope();
      const payload = {
        ...body,
        report: {
          ...body.report!,
          provenance: {
            ...body.report!.provenance,
            runnerVersion,
            adapterVersion,
          },
        },
      };
      if (accepted)
        expect(parseSummary(payload, body.applicationId)).toEqual(payload);
      else
        expect(() => parseSummary(payload, body.applicationId)).toThrow(
          "INVALID_RESPONSE",
        );
    },
  );
  it("does not read secrets, authorize, or fetch when disabled", async () => {
    const env = new Proxy(
      {},
      {
        get: (_target, key) => {
          if (key === "LP_INTEGRATION_ENABLED") return "false";
          throw new Error("disabled config read a secret");
        },
      },
    );
    expect(integrationConfigFromEnv(env)).toEqual({ enabled: false });
    vi.stubEnv("LP_INTEGRATION_ENABLED", "false");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(await readLaunchChecks("org_a")).toEqual({ state: "disabled" });
    expect(session.backend).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("reads only the mapped summary with no cookies or credential serialization", async () => {
    const { org } = await fixture();
    const fetcher = vi.fn(async () => Response.json(envelope()));
    vi.stubGlobal("fetch", fetcher);
    const result = await readLaunchChecks(org);
    expect(result).toMatchObject({
      state: "available",
      contract: "launchproof-summary-v1",
      adapterVersion: "0.1.1",
      deployment: { state: "matching_claim" },
      reportUrl:
        "https://launch.companynerve.com/app/reporting-a/reports/report_a",
    });
    expect(JSON.stringify(result)).not.toContain(token);
    expect(fetcher).toHaveBeenCalledWith(
      "https://launch.companynerve.com/api/v1/applications/app_a/summary",
      expect.objectContaining({
        method: "GET",
        credentials: "omit",
        redirect: "manual",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }),
    );
    expect(session.backend).toHaveBeenCalledTimes(2);
  });

  it("denies other organizations, members, anonymous sessions, and removed membership", async () => {
    const { t, member, owner, org, other, membershipId } = await fixture();
    const fetcher = vi.fn(async () => Response.json(envelope()));
    vi.stubGlobal("fetch", fetcher);
    expect(await readLaunchChecks(other)).toEqual({ state: "hidden" });
    session.backend.mockResolvedValue(member);
    expect(await readLaunchChecks(org)).toMatchObject({ state: "available" });
    await owner.mutation(api.organizations.changeMember, {
      organizationId: org,
      membershipId,
      role: "member",
    });
    fetcher.mockClear();
    expect(await readLaunchChecks(org)).toEqual({ state: "hidden" });
    await owner.mutation(api.organizations.changeMember, {
      organizationId: org,
      membershipId,
      role: "remove",
    });
    expect(await readLaunchChecks(org)).toEqual({ state: "hidden" });
    session.backend.mockResolvedValue(t);
    expect(await readLaunchChecks(org)).toEqual({ state: "hidden" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rechecks actual membership after a fetch and never shares an owner's result with another session", async () => {
    const { member, owner, org, membershipId } = await fixture();
    session.backend.mockResolvedValue(member);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        await owner.mutation(api.organizations.changeMember, {
          organizationId: org,
          membershipId,
          role: "remove",
        });
        return Response.json(envelope());
      }),
    );
    expect(await readLaunchChecks(org)).toEqual({ state: "hidden" });
    session.backend.mockResolvedValue(owner);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(envelope())),
    );
    expect(await readLaunchChecks(org)).toMatchObject({ state: "available" });
    session.backend.mockResolvedValue(member);
    expect(await readLaunchChecks(org)).toEqual({ state: "hidden" });
  });

  it.each([
    [401, "authentication"],
    [403, "mapping_or_scope"],
    [404, "mapping_or_scope"],
    [429, "rate_limited"],
    [503, "service"],
    [302, "redirect"],
  ])(
    "contains HTTP %s failure and keeps target projects usable",
    async (code, reason) => {
      const { owner, org } = await fixture();
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response(null, { status: Number(code) })),
      );
      expect(await readLaunchChecks(org)).toMatchObject({
        state: "unavailable",
        reason,
      });
      expect(
        await owner.query(api.projects.list, { organizationId: org }),
      ).toEqual([]);
    },
  );

  it("drops previous success after token revocation, and disconnects without further requests", async () => {
    const { org } = await fixture();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json(envelope()))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetcher);
    expect(await readLaunchChecks(org)).toMatchObject({ state: "available" });
    expect(await readLaunchChecks(org)).toMatchObject({
      state: "unavailable",
      reason: "authentication",
    });
    vi.stubEnv("LP_INTEGRATION_ENABLED", "false");
    expect(await readLaunchChecks(org)).toEqual({ state: "disabled" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("bounds network timeout and contains missing, mismatched, reflected, oversized, and invalid responses", async () => {
    const { org } = await fixture();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, init) =>
          new Promise((_resolve, reject) =>
            init.signal.addEventListener("abort", () =>
              reject(new Error("aborted")),
            ),
          ),
      ),
    );
    expect(await readLaunchChecks(org)).toMatchObject({
      state: "unavailable",
      reason: "timeout",
    });
    for (const raw of [
      { ...envelope(), applicationId: "another_app" },
      { ...envelope(), extra: token },
      { ...envelope(), extra: "a".repeat(17000) },
    ]) {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => Response.json(raw)),
      );
      expect(await readLaunchChecks(org)).toMatchObject({
        state: "unavailable",
        reason: "invalid_response",
      });
    }
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ applicationId: "app_a", report: null }),
      ),
    );
    expect(await readLaunchChecks(org)).toMatchObject({ state: "missing" });
    const mismatch = envelope();
    mismatch.report!.environmentId = "production";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(mismatch)),
    );
    expect(await readLaunchChecks(org)).toMatchObject({
      state: "available",
      deployment: { state: "not_tested" },
    });
    vi.stubEnv("LP_INTEGRATION_CURRENT_COMMIT", "");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(envelope())),
    );
    expect(await readLaunchChecks(org)).toMatchObject({
      state: "available",
      deployment: { state: "comparison_unsupported" },
    });
  });

  it("checks membership even on adapter cache hits and clears an in-flight read on disconnect", async () => {
    const authorize = vi.fn(async () => ({
      organizationId: "org_a",
      role: "owner",
    }));
    enable("org_a");
    const integration = createLaunchProofIntegration(
      integrationConfigFromEnv(process.env),
      authorize,
    );
    const fetcher = vi.fn(async () => Response.json(envelope()));
    vi.stubGlobal("fetch", fetcher);
    expect(
      await integration.read({ organizationId: "org_a", commit }),
    ).toMatchObject({ state: "available" });
    authorize.mockResolvedValue({ organizationId: "org_a", role: "member" });
    expect(await integration.read({ organizationId: "org_a", commit })).toEqual(
      { state: "hidden" },
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    integration.disconnect();
    expect(await integration.read({ organizationId: "org_a" })).toEqual({
      state: "disabled",
    });
    authorize.mockResolvedValue({ organizationId: "org_a", role: "owner" });
    const pending = createLaunchProofIntegration(
      integrationConfigFromEnv(process.env),
      authorize,
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        pending.disconnect();
        return Response.json(envelope());
      }),
    );
    expect(await pending.read({ organizationId: "org_a" })).toEqual({
      state: "disabled",
    });
  });
});
