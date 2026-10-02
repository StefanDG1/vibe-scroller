import { expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { reserve } from "../convex/product";
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
it("releases a known unstarted authorization failure once without reviving cancellation or overwriting completed output", async () => {
  const { t, a, org, owner, proposalId, repositories } = await setup();
  const seed = async (state: string, events: string[] = []) =>
    t.run(async (ctx) => {
      const now = Date.now();
      const id = await ctx.db.insert("runs", {
        organizationId: org,
        createdAt: now,
        updatedAt: now,
        proposalId,
        repositoryId: repositories[0],
        approvedBy: owner,
        planHash: "b".repeat(64),
        baseSha: "a".repeat(40),
        version: 1,
        executor: "cloud",
        fundingRoute: "managed_api",
        maxCredits: 10,
        allowedPaths: ["README.md"],
        highRisk: false,
        state,
        generation: 1,
        expiresAt: now + 60000,
        leaseUntil: now + 60000,
        events,
      });
      await reserve(ctx, org, `run:${id}`, 10);
      return id;
    });
  const running = await seed("running");
  await t.run((ctx) =>
    ctx.db.patch(running, {
      fundingRoute: "customer_api_key",
      providerRequestState: "reserved",
      maxProviderUsdCents: 100,
    }),
  );
  const receipt = {
    id: running,
    generation: 1,
    credits: 0,
    error: "Synthetic authorization refusal",
    beforeSandboxCreation: true,
  };
  await t.mutation(internal.jobs.failCloud, receipt);
  await t.mutation(internal.jobs.failCloud, receipt);
  expect(
    (await a.query(api.product.usage, { organizationId: org })).wallet,
  ).toMatchObject({ reserved: 0, spent: 0 });
  expect((await t.run((ctx) => ctx.db.get(running)))!.events).toHaveLength(1);
  expect(
    (await t.run((ctx) => ctx.db.get(running)))!.providerRequestState,
  ).toBeUndefined();
  const canceled = await seed("running");
  await a.mutation(api.jobs.cancel, { id: canceled });
  await t.mutation(internal.jobs.failCloud, { ...receipt, id: canceled });
  expect(await t.run((ctx) => ctx.db.get(canceled))).toMatchObject({
    state: "canceled",
    generation: 2,
  });
  expect(
    (await a.query(api.product.usage, { organizationId: org })).wallet!
      .reserved,
  ).toBe(0);
  const started = await seed("running", [
    "Isolated sandbox started: vercel:synthetic-exposure",
  ]);
  await expect(
    t.mutation(internal.jobs.failCloud, { ...receipt, id: started }),
  ).rejects.toThrow("COST_RECONCILIATION_REQUIRED");
  expect(
    (await a.query(api.product.usage, { organizationId: org })).wallet!
      .reserved,
  ).toBe(10);
  const completed = await seed("awaiting_review");
  await t.mutation(internal.jobs.failCloud, {
    id: completed,
    generation: 1,
    credits: 0,
    error: "Late duplicate failure",
  });
  expect((await t.run((ctx) => ctx.db.get(completed)))!.state).toBe(
    "awaiting_review",
  );
});
it("restricts verified cloud workers to acceptance subjects until a separate public release approval", async () => {
  const { t, a, b, org, proposalId } = await setup();
  const query = () => a.query(api.jobs.customerRoutes, { organizationId: org });
  vi.stubEnv("CLOUD_VERIFIED", "true");
  vi.stubEnv("CLOUD_PUBLIC_RELEASE_APPROVED", "false");
  try {
    expect((await query()).execution.cloudReady).toBe(false);
    await a.mutation(api.product.editPlan, {
      id: proposalId,
      version: 1,
      plan: syntheticPlan,
    });
    const proposal = await a.query(api.product.proposal, { id: proposalId });
    await expect(
      a.mutation(api.jobs.approve, {
        id: proposalId,
        version: proposal.version,
        planHash: proposal.planHash!,
        baseSha: proposal.baseSha,
        executor: "cloud",
        fundingRoute: "managed_api",
        maxCredits: 25,
        allowedPaths: ["README.md"],
        highRisk: false,
      }),
    ).rejects.toThrow("ISOLATION_UNAVAILABLE");
    expect(
      await t.run(async (ctx) => (await ctx.db.query("runs").collect()).length),
    ).toBe(0);
    vi.stubEnv(
      "CLOUD_EXECUTION_SUBJECTS_JSON",
      JSON.stringify(["synthetic-planning-b"]),
    );
    expect((await query()).execution.cloudReady).toBe(false);
    vi.stubEnv(
      "CLOUD_EXECUTION_SUBJECTS_JSON",
      JSON.stringify(["synthetic-planning-a"]),
    );
    expect((await query()).execution.cloudReady).toBe(true);
    await expect(
      b.query(api.jobs.customerRoutes, { organizationId: org }),
    ).rejects.toThrow();
    vi.stubEnv("CLOUD_EXECUTION_SUBJECTS_JSON", "invalid");
    expect((await query()).execution.cloudReady).toBe(false);
    vi.stubEnv("CLOUD_PUBLIC_RELEASE_APPROVED", "true");
    expect((await query()).execution.cloudReady).toBe(true);
    vi.stubEnv("DISABLE_CLOUD", "true");
    expect((await query()).execution.cloudReady).toBe(false);
  } finally {
    vi.unstubAllEnvs();
  }
});
it("keeps cancellation fenced and reserved until matching teardown evidence, then settles exactly once", async () => {
  const { t, a, org, owner, proposalId, repositories } = await setup();
  const id = await t.run(async (ctx) => {
    const now = Date.now();
    const id = await ctx.db.insert("runs", {
      organizationId: org,
      createdAt: now,
      updatedAt: now,
      proposalId,
      repositoryId: repositories[0],
      approvedBy: owner,
      planHash: "b".repeat(64),
      baseSha: "a".repeat(40),
      version: 1,
      executor: "cloud",
      fundingRoute: "managed_api",
      maxCredits: 10,
      allowedPaths: ["README.md"],
      highRisk: false,
      state: "running",
      generation: 1,
      expiresAt: now + 60000,
      leaseUntil: now + 60000,
      events: ["Isolated sandbox started: vercel:synthetic-cancel"],
    });
    await reserve(ctx, org, `run:${id}`, 10);
    return id;
  });
  await a.mutation(api.jobs.cancel, { id });
  await t.mutation(internal.jobs.failCloud, {
    id,
    generation: 1,
    credits: 0,
    error: "Synthetic provider failure",
  });
  expect(
    (await a.query(api.product.usage, { organizationId: org })).wallet!
      .reserved,
  ).toBe(10);
  const receipt = {
    id,
    generation: 1,
    sandboxId: "vercel:synthetic-cancel",
    credits: 3,
  };
  await expect(
    t.mutation(internal.jobs.reconcileTerminatedCloud, {
      ...receipt,
      sandboxId: "vercel:foreign",
    }),
  ).rejects.toThrow("APPROVAL_STALE");
  await expect(
    t.mutation(internal.jobs.reconcileTerminatedCloud, {
      ...receipt,
      credits: 11,
    }),
  ).rejects.toThrow("BUDGET_EXCEEDED");
  await t.mutation(internal.jobs.reconcileTerminatedCloud, receipt);
  await t.mutation(internal.jobs.reconcileTerminatedCloud, receipt);
  await expect(
    t.mutation(internal.jobs.reconcileTerminatedCloud, {
      ...receipt,
      credits: 2,
    }),
  ).rejects.toThrow("COST_RECONCILIATION_REQUIRED");
  expect(
    (await a.query(api.product.usage, { organizationId: org })).wallet,
  ).toMatchObject({ reserved: 0, spent: 3 });
  expect(
    await t.mutation(internal.jobs.completeCloud, {
      id,
      generation: 1,
      patch: "late",
      changes: [],
      report: "late",
      credits: 3,
    }),
  ).toBe(false);
  const run = await t.run((ctx) => ctx.db.get(id));
  expect(run).toMatchObject({ state: "canceled", generation: 2 });
  expect(run!.patch).toBeUndefined();
  expect(
    run!.events.filter((e) => e.startsWith("Teardown confirmed")),
  ).toHaveLength(1);
});
it("denies foreign tenant read/write routes and rejects an asset linked across workspaces", async () => {
  const { t, a, b, org, sourceId, proposalId, foreign } = await setup();
  const workspace = { organizationId: org };
  const calls = [
    () => b.query(api.product.library, workspace),
    () => b.query(api.product.overview, workspace),
    () => b.query(api.product.repositories, workspace),
    () => b.query(api.product.proposals, workspace),
    () => b.query(api.product.usage, workspace),
    () => b.query(api.product.detail, { id: sourceId }),
    () => b.query(api.product.proposal, { id: proposalId }),
    () => b.query(api.jobs.connections, workspace),
    () => b.query(api.jobs.customerRoutes, workspace),
    () => b.query(api.devices.list, workspace),
    () => b.query(api.commerce.invoiceTasks, workspace),
    () =>
      b.query(api.jobs.exportPage, {
        ...workspace,
        section: "sources",
        cursor: null,
        asOf: Date.now(),
      }),
    () =>
      b.mutation(api.product.editSource, {
        id: sourceId,
        summary: "Foreign edit",
        tags: [],
      }),
    () => b.mutation(api.product.deleteSource, { id: sourceId }),
    () =>
      b.mutation(api.commerce.preferences, {
        ...workspace,
        email: true,
        telegram: false,
        analytics: false,
        legalVersion: "synthetic",
      }),
  ];
  for (const call of calls) {
    await expect(call()).rejects.toThrow();
  }
  expect((await a.query(api.product.detail, { id: sourceId })).title).toBe(
    "Synthetic main point",
  );
  const asset = await t.run(async (ctx) => {
    const repo = (await ctx.db.get(foreign))!;
    return ctx.db.insert("assets", {
      organizationId: repo.organizationId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      key: "synthetic-private-object",
      sourceId,
      size: 1,
      type: "image/png",
      state: "complete",
    });
  });
  await expect(a.query(api.assets.evidence, { id: asset })).rejects.toThrow();
  await expect(b.query(api.assets.evidence, { id: asset })).rejects.toThrow(
    "Evidence unavailable",
  );
});
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
it("binds dynamic plan inspection to the current immutable manifest without persisting raw context", async () => {
  const { t, a, org, proposalId, repositories } = await setup();
  const blobSha = "d".repeat(40);
  await t.run((ctx) =>
    ctx.db.patch(repositories[0], {
      manifestEntries: [
        { path: "src/uninspected.ts", blobSha, mode: "100644", size: 5000 },
      ],
    }),
  );
  const started = await a.mutation(api.planning.start, {
    id: proposalId,
    version: 1,
    maxCredits: 10,
    key: "test000000000000",
  });
  const inspectedContext = [
    {
      path: "src/uninspected.ts",
      blobSha,
      startLine: 100,
      endLine: 101,
      content:
        "// Owned synthetic late implementation\nexport function removeSource() {}",
    },
  ];
  const finish = {
    id: proposalId,
    organizationId: org,
    key: started.key,
    version: 1,
    baseSha: "a".repeat(40),
    credits: 0,
    plan: {
      ...syntheticPlan,
      files: [{ path: "src/uninspected.ts", isNew: false }],
    },
    inspectedContext,
  };
  await expect(
    t.mutation(internal.planning.finish, {
      ...finish,
      inspectedContext: [{ ...inspectedContext[0], blobSha: "e".repeat(40) }],
    }),
  ).rejects.toThrow("INVALID_EVIDENCE");
  await t.mutation(internal.planning.finish, finish);
  const proposal = await a.query(api.product.proposal, { id: proposalId });
  expect(proposal.planDraft.files[0].path).toBe("src/uninspected.ts");
  expect(
    JSON.stringify(await t.run((ctx) => ctx.db.get(proposalId))),
  ).not.toContain("late implementation");
});
