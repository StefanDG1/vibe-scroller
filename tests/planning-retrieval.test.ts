import { expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.ts");
const syntheticPlan = {
  scope: "Owned synthetic change",
  nonGoals: ["No merge"],
  files: [{ path: "README.md", isNew: false }],
  steps: ["Update documentation"],
  tests: ["printf synthetic"],
  risks: [],
  rollout: "Review PR",
  rollback: "Revert",
  unknowns: [],
};
async function setup() {
  const t = convexTest(schema, modules);
  const owner = await t.mutation(internal.accounts.syncUser, {
    subject: "synthetic-planning-a",
    email: "planning-a@example.test",
    name: "Synthetic",
  });
  await t.mutation(internal.accounts.syncUser, {
    subject: "synthetic-planning-b",
    email: "planning-b@example.test",
    name: "Synthetic",
  });
  const a = t.withIdentity({ subject: "synthetic-planning-a" }),
    b = t.withIdentity({ subject: "synthetic-planning-b" });
  const org = await a.mutation(api.organizations.create, {
      name: "Synthetic A",
    }),
    other = await b.mutation(api.organizations.create, { name: "Synthetic B" });
  const data = await t.run(async (ctx) => {
    const now = Date.now();
    const sourceId = await ctx.db.insert("sources", {
      organizationId: org,
      createdAt: now,
      updatedAt: now,
      key: "synthetic-selection",
      canonical: "synthetic-selection",
      kind: "text",
      title: "Synthetic main point",
      state: "ready",
      coverage: "caption_only",
      tags: [],
      rightsAttested: true,
      generation: 1,
      analysis: {
        insights: [
          { id: "synthetic-main-point", claim: "Owned synthetic claim" },
        ],
      },
    });
    const make = (organizationId: typeof org, index: number) =>
      ctx.db.insert("repositories", {
        organizationId,
        createdAt: now,
        updatedAt: now,
        installationId: index + 1,
        providerId: index + 1,
        fullName: `owned/synthetic-${index}`,
        sha: "a".repeat(40),
        branch: "main",
        manifest: ["README.md", "src/uninspected.ts"],
        context: "Owned synthetic excerpt",
        contextExcerpts: [
          {
            path: "README.md",
            startLine: 1,
            endLine: 1,
            blobSha: "b".repeat(40),
            content: "Owned synthetic excerpt",
          },
        ],
        enabled: true,
        confirmed: true,
        profile: "Owned synthetic confirmed business profile",
        profileVersion: 1,
        status: "connected",
      });
    const repositories = [];
    for (let index = 0; index < 6; index++)
      repositories.push(await make(org, index));
    const foreign = await make(other, 9);
    const proposalId = await ctx.db.insert("proposals", {
      organizationId: org,
      createdAt: now,
      updatedAt: now,
      sourceId,
      repositoryId: repositories[0],
      baseSha: "a".repeat(40),
      profileVersion: 1,
      disposition: "relevant",
      title: "Owned synthetic accepted proposal",
      detail: {},
      review: "accepted",
      version: 1,
    });
    return { sourceId, repositories, foreign, proposalId };
  });
  return { t, a, b, org, owner, ...data };
}
it("deduplicates exact approvals, invalidates unpublished work on edits and retains an authorized late PR receipt", async () => {
  vi.stubEnv("LOCAL_ISOLATION_VERIFIED", "true");
  try {
    const { t, a, proposalId } = await setup();
    await a.mutation(api.product.editPlan, {
      id: proposalId,
      version: 1,
      plan: syntheticPlan,
    });
    const proposal = await a.query(api.product.proposal, { id: proposalId });
    const args = {
      id: proposalId,
      version: proposal.version,
      planHash: proposal.planHash!,
      baseSha: proposal.baseSha,
      executor: "local",
      fundingRoute: "local_codex_subscription",
      maxCredits: 0,
      allowedPaths: ["README.md"],
      highRisk: false,
    };
    const first = await a.mutation(api.jobs.approve, args);
    expect(await a.mutation(api.jobs.approve, args)).toBe(first);
    await expect(
      a.mutation(api.jobs.approve, { ...args, highRisk: true }),
    ).rejects.toThrow("SOURCE_BUSY");
    expect(
      await t.run(async (ctx) => (await ctx.db.query("runs").collect()).length),
    ).toBe(1);
    await a.mutation(api.product.editPlan, {
      id: proposalId,
      version: proposal.version,
      plan: { ...syntheticPlan, scope: "New explicit scope" },
    });
    const canceled = await t.run((ctx) => ctx.db.get(first));
    expect(canceled!.state).toBe("canceled");
    expect(canceled!.generation).toBe(2);
    const receipt = {
      id: first,
      generation: 1,
      number: 7,
      url: "https://github.com/owned/synthetic-0/pull/7",
      state: "draft",
    };
    await t.mutation(internal.jobs.recordPR, receipt);
    expect((await t.run((ctx) => ctx.db.get(first)))!.prNumber).toBeUndefined();
    await t.run((ctx) => ctx.db.patch(first, { publicationGeneration: 1 }));
    await expect(
      t.mutation(internal.jobs.recordPR, {
        ...receipt,
        url: "https://github.com/foreign/repo/pull/7",
      }),
    ).rejects.toThrow("INVALID_EVIDENCE");
    await t.mutation(internal.jobs.recordPR, receipt);
    await t.mutation(internal.jobs.recordPR, receipt);
    const reconciled = await t.run((ctx) => ctx.db.get(first));
    expect(reconciled!.state).toBe("completed");
    expect(reconciled!.prNumber).toBe(7);
    expect(
      reconciled!.events.filter((event) =>
        event.includes("after cancellation"),
      ),
    ).toHaveLength(1);
  } finally {
    vi.unstubAllEnvs();
  }
});
it("filters tenants before selection, bounds results to five, deduplicates a quote and invalidates stale profiles", async () => {
  const { t, a, b, sourceId, repositories, foreign } = await setup();
  const args = {
    id: sourceId,
    insightId: "synthetic-main-point",
    maxCredits: 10,
    key: "synthetic-selection-001",
  };
  await expect(b.mutation(api.retrieval.start, args)).rejects.toThrow();
  await expect(
    a.mutation(api.retrieval.start, { ...args, maxCredits: 1 }),
  ).rejects.toThrow("QUOTE_CHANGED");
  const started = await a.mutation(api.retrieval.start, args);
  expect(started.bases).toHaveLength(6);
  expect(started.bases.some((base) => base.repositoryId === foreign)).toBe(
    false,
  );
  await expect(
    a.mutation(api.retrieval.start, {
      ...args,
      key: "synthetic-selection-002",
    }),
  ).rejects.toThrow("SOURCE_BUSY");
  const finish = {
    id: sourceId,
    key: started.key,
    semanticKey: started.semanticKey,
    generation: 1,
    insightId: args.insightId,
    bases: started.bases,
    credits: 0,
    noFitReason: "",
  };
  await expect(
    t.mutation(internal.retrieval.finish, {
      ...finish,
      candidates: repositories.map((repositoryId) => ({
        repositoryId,
        reason: "Synthetic plausible fit",
      })),
    }),
  ).rejects.toThrow("INVALID_EVIDENCE");
  await expect(
    t.mutation(internal.retrieval.finish, {
      ...finish,
      candidates: [{ repositoryId: foreign, reason: "Foreign" }],
    }),
  ).rejects.toThrow("INVALID_EVIDENCE");
  await t.mutation(internal.retrieval.finish, {
    ...finish,
    candidates: repositories.slice(0, 5).map((repositoryId) => ({
      repositoryId,
      reason: "Synthetic tentative fit, no implementation claim",
    })),
  });
  expect(
    (await a.query(api.product.detail, { id: sourceId })).repositorySelection
      .candidates,
  ).toHaveLength(5);
  expect((await a.mutation(api.retrieval.start, args)).cached).toBe(true);
  await t.run(async (ctx) => {
    await ctx.db.patch(repositories[0], { profileVersion: 2 });
  });
  expect(
    (await a.query(api.product.detail, { id: sourceId })).repositorySelection,
  ).toBeUndefined();
  const next = await a.mutation(api.retrieval.start, {
    ...args,
    key: "synthetic-selection-003",
  });
  await expect(
    t.mutation(internal.retrieval.finish, {
      ...finish,
      key: next.key,
      semanticKey: next.semanticKey,
      bases: next.bases,
      candidates: [],
    }),
  ).rejects.toThrow("INVALID_EVIDENCE");
  await t.mutation(internal.retrieval.finish, {
    ...finish,
    key: next.key,
    semanticKey: next.semanticKey,
    bases: next.bases,
    candidates: [],
    noFitReason: "No confirmed profile establishes a useful relationship.",
  });
  expect(
    (await a.query(api.product.detail, { id: sourceId })).repositorySelection
      .candidates,
  ).toEqual([]);
});
it("drafts no executable approval, rejects uninspected or unsafe files and discards late plans after edits", async () => {
  const { t, a, b, org, proposalId } = await setup();
  const args = {
    id: proposalId,
    version: 1,
    maxCredits: 10,
    key: "synthetic-planning-001", // gitleaks:allow synthetic request identifier
  };
  await expect(b.mutation(api.planning.start, args)).rejects.toThrow();
  const started = await a.mutation(api.planning.start, args);
  await expect(
    a.mutation(api.planning.start, { ...args, key: "synthetic-planning-002" }), // gitleaks:allow synthetic request identifier
  ).rejects.toThrow("SOURCE_BUSY");
  const finish = {
    id: proposalId,
    organizationId: org,
    key: started.key,
    version: 1,
    baseSha: "a".repeat(40),
    credits: 0,
  };
  const plan = {
    scope: "Owned synthetic change",
    nonGoals: ["No automatic merge"],
    files: [{ path: "README.md", isNew: false }],
    steps: ["Update documented behavior"],
    tests: ["printf synthetic"],
    risks: [],
    rollout: "Review draft PR",
    rollback: "Revert reviewed change",
    unknowns: ["Outcome remains unmeasured"],
  };
  await expect(
    t.mutation(internal.planning.finish, {
      ...finish,
      plan: { ...plan, files: [{ path: "src/uninspected.ts", isNew: false }] },
    }),
  ).rejects.toThrow("INVALID_EVIDENCE");
  await expect(
    t.mutation(internal.planning.finish, {
      ...finish,
      plan: { ...plan, files: [{ path: "../escape", isNew: true }] },
    }),
  ).rejects.toThrow("POLICY_BLOCKED");
  await t.mutation(internal.planning.finish, { ...finish, plan });
  const draft = await a.query(api.product.proposal, { id: proposalId });
  expect(draft.planDraft).toEqual(plan);
  expect(draft.plan).toBeUndefined();
  expect(draft.planHash).toBeUndefined();
  expect((await a.mutation(api.planning.start, args)).cached).toBe(true);
  await a.mutation(api.product.editPlan, { id: proposalId, version: 1, plan });
  const saved = await a.query(api.product.proposal, { id: proposalId });
  expect(saved.version).toBe(2);
  expect(saved.planHash).toHaveLength(64);
  const second = await a.mutation(api.planning.start, {
    ...args,
    version: 2,
    key: "synthetic-planning-003", // gitleaks:allow synthetic request identifier
  });
  await a.mutation(api.product.editPlan, {
    id: proposalId,
    version: 2,
    plan: { ...plan, scope: "Explicit newer owner edit" },
  });
  await t.mutation(internal.planning.finish, {
    ...finish,
    key: second.key,
    version: 2,
    plan,
  });
  const current = await a.query(api.product.proposal, { id: proposalId });
  expect(current.plan.scope).toBe("Explicit newer owner edit");
  expect(current.planDraftVersion).toBe(1);
});
