import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import workflowTest from "@convex-dev/workflow/test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import {
  synthesis,
  evaluation,
  assertReferences,
} from "../packages/knowledge/contracts";
import {
  createIssue,
  issueAccess,
  findIssue,
} from "../packages/providers/issues";
import { authorizeRepository } from "../convex/lib/githubAuthorization";
vi.mock("../packages/providers/issues", () => ({
  createIssue: vi.fn(),
  issueAccess: vi.fn(),
  findIssue: vi.fn(),
}));
vi.mock("../convex/lib/githubAuthorization", () => ({
  authorizeRepository: vi.fn(),
}));
const modules = import.meta.glob("../convex/**/*.ts");
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
async function setup() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  workflowTest.register(t);
  for (const subject of ["knowledge-owner", "knowledge-foreign"])
    await t.mutation(internal.accounts.syncUser, {
      subject,
      email: `${subject}@example.test`,
      name: subject,
    });
  const a = t.withIdentity({ subject: "knowledge-owner" }),
    b = t.withIdentity({ subject: "knowledge-foreign" });
  const org = await a.mutation(api.organizations.create, {
      name: "Synthetic knowledge",
    }),
    foreign = await b.mutation(api.organizations.create, {
      name: "Synthetic foreign",
    });
  const ownerId = await t.run(
    async (ctx) =>
      (await ctx.db
        .query("users")
        .withIndex("by_subject", (q) => q.eq("subject", "knowledge-owner"))
        .unique())!._id,
  );
  async function source(key: string, topic = "Review", organizationId = org) {
    return t.run((ctx) =>
      ctx.db.insert("sources", {
        organizationId,
        key,
        canonical: key,
        title: key,
        kind: "text",
        state: "ready",
        coverage: "caption_only",
        tags: [],
        rightsAttested: true,
        generation: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        analysis: {
          summary: key,
          insights: [
            {
              id: `point-${key}`,
              title: key,
              claim: `Claim ${key}`,
              interpretation: "Synthetic interpretation",
              topics: [topic],
              categories: ["engineering"],
              evidence: [
                {
                  id: "supplied_text",
                  kind: "user_note",
                  startMs: null,
                  endMs: null,
                },
              ],
            },
          ],
        },
      }),
    );
  }
  async function topic() {
    await t.mutation(internal.knowledge.backfill, {});
    return (await a.query(api.knowledge.list, { organizationId: org }))
      .items[0];
  }
  async function repo() {
    return t.run((ctx) =>
      ctx.db.insert("repositories", {
        organizationId: org,
        installationId: 42,
        providerId: 55,
        fullName: "owned/synthetic",
        branch: "main",
        sha: "a".repeat(40),
        enabled: true,
        confirmed: true,
        profile: "purpose: review synthetic ideas",
        profileVersion: 1,
        manifest: ["README.md"],
        status: "connected",
        context: "Synthetic context",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
  }
  return { t, a, b, org, foreign, ownerId, source, topic, repo };
}
it("rejects unknown serialized fields and fabricated/mixed-generation references", () => {
  const reference = {
    sourceId: "s",
    generation: 1,
    revision: 2,
    insightId: "i",
  };
  expect(() =>
    synthesis.parse({
      explanation: "Synthetic",
      claims: [],
      relations: [],
      uncertainty: "",
      extra: true,
    }),
  ).toThrow();
  expect(() => evaluation.parse({ injected: "permission" })).toThrow();
  expect(() =>
    assertReferences(
      [{ references: [{ ...reference, generation: 2 }] }],
      [reference],
    ),
  ).toThrow("INVALID_EVIDENCE");
});
it("keeps complete paginated libraries isolated, with no inference in backfill", async () => {
  const { t, a, b, org, foreign, source } = await setup();
  for (let i = 0; i < 37; i++) await source(`synthetic-${i}`, `Topic ${i}`);
  await source("secret-foreign", "Foreign only", foreign);
  let cursor: string | undefined;
  do {
    const page = await t.mutation(internal.knowledge.backfill, { cursor });
    cursor = page!.done ? undefined : page!.cursor;
  } while (cursor);
  const first = await a.query(api.knowledge.list, { organizationId: org });
  const second = await a.query(api.knowledge.list, {
    organizationId: org,
    cursor: first.next!,
  });
  expect(first.items.length + second.items.length).toBe(37);
  expect(
    new Set([...first.items, ...second.items].map((t) => t._id)).size,
  ).toBe(37);
  expect(first.items.some((t) => t.name === "Foreign only")).toBe(false);
  await expect(
    b.query(api.knowledge.list, { organizationId: org }),
  ).rejects.toThrow();
  await expect(
    b.mutation(api.knowledge.correct, {
      id: first.items[0]._id,
      version: first.items[0].version,
      name: "Forged",
    }),
  ).rejects.toThrow();
  expect(
    await t.run((ctx) => ctx.db.query("knowledgeJobs").collect()),
  ).toHaveLength(0);
});
it("preserves rename/pin/exclusion/split choices across repeated automatic backfills", async () => {
  const { t, a, source, topic, org } = await setup();
  await source("one");
  await source("two");
  const top = await topic();
  let d = await a.query(api.knowledge.detail, { id: top._id });
  await a.mutation(api.knowledge.correct, {
    id: top._id,
    version: d.topic.version,
    name: "My review",
    pinned: true,
    memberId: d.members[0]._id,
    splitName: "My separate idea",
  });
  d = await a.query(api.knowledge.detail, { id: top._id });
  expect(d.members[0].excluded).toBe(true);
  await t.mutation(internal.knowledge.backfill, {});
  await t.mutation(internal.knowledge.backfill, {});
  d = await a.query(api.knowledge.detail, { id: top._id });
  expect(d.topic.name).toBe("My review");
  expect(d.topic.pinned).toBe(true);
  expect(d.members[0].excluded).toBe(true);
  expect(d.topic.sourceCount).toBe(1);
  expect(d.topic.insightCount).toBe(1);
  const split = (
    await a.query(api.knowledge.list, { organizationId: org })
  ).items.find((t) => t.name === "My separate idea")!;
  expect(
    (await a.query(api.knowledge.detail, { id: split._id })).members.filter(
      (m) => !m.excluded,
    ),
  ).toHaveLength(1);
  expect(split.sourceCount).toBe(1);
  await expect(
    a.mutation(api.knowledge.correct, {
      id: top._id,
      version: top.version,
      name: "Late",
    }),
  ).rejects.toThrow("APPROVAL_STALE");
});
it("bounds organization reservations, prevents duplicate usage and rejects late correction results", async () => {
  const { t, a, org, source, topic } = await setup();
  await source("one");
  const top = await topic();
  await a.mutation(api.knowledge.configure, {
    organizationId: org,
    enabled: true,
    ceiling: 10,
  });
  await t.mutation(internal.knowledge.enqueue, { topicId: top._id });
  await t.mutation(internal.knowledge.enqueue, { topicId: top._id });
  const jobs = await t.run((ctx) => ctx.db.query("knowledgeJobs").collect());
  expect(jobs).toHaveLength(1);
  const claimed = await t.mutation(internal.knowledge.claim, {
    id: jobs[0]._id,
  });
  expect(claimed!.evidence).toHaveLength(1);
  expect(
    await t.mutation(internal.knowledge.claim, { id: jobs[0]._id }),
  ).toBeNull();
  const current = (await a.query(api.knowledge.detail, { id: top._id })).topic;
  await a.mutation(api.knowledge.correct, {
    id: top._id,
    version: current.version,
    name: "Corrected",
  });
  await t.mutation(internal.knowledge.finish, {
    id: jobs[0]._id,
    output: {
      explanation: "Late synthetic",
      claims: [{ text: "Claim", references: jobs[0].references }],
      relations: [],
      uncertainty: "Synthetic",
    },
    credits: 1,
  });
  const result = await t.run((ctx) => ctx.db.get(jobs[0]._id));
  expect(result!.state).toBe("stale");
  expect(result!.output).toBeUndefined();
  await t.mutation(internal.knowledge.enqueue, { topicId: top._id });
  expect(
    (await a.query(api.knowledge.detail, { id: top._id })).topic.state,
  ).toBe("budget_paused");
});
it("keeps unknown usage held, fences deletion and refuses recovery dispatch", async () => {
  const { t, a, org, source, topic } = await setup();
  const sourceId = await source("private-synthetic");
  const top = await topic();
  await a.mutation(api.knowledge.configure, {
    organizationId: org,
    enabled: true,
    ceiling: 20,
  });
  await t.mutation(internal.knowledge.enqueue, { topicId: top._id });
  const j = (await t.run((ctx) => ctx.db.query("knowledgeJobs").collect()))[0];
  await t.mutation(internal.knowledge.claim, { id: j._id });
  await t.mutation(internal.knowledge.finish, {
    id: j._id,
    credits: 0,
    retainReservation: true,
  });
  expect(
    (await t.run((ctx) =>
      ctx.db
        .query("reservations")
        .withIndex("by_key", (q) =>
          q.eq("organizationId", org).eq("key", j.key),
        )
        .unique(),
    ))!.state,
  ).toBe("active");
  expect(
    (await a.query(api.knowledge.detail, { id: top._id })).topic.state,
  ).toBe("unknown");
  await a.mutation(api.product.deleteSource, { id: sourceId });
  expect(
    (await a.query(api.knowledge.detail, { id: top._id })).members,
  ).toHaveLength(0);
  vi.stubEnv("RESTORE_LOCK", "true");
  expect(await t.mutation(internal.knowledge.claim, { id: j._id })).toBeNull();
  await expect(
    a.query(api.knowledge.list, { organizationId: org }),
  ).rejects.toThrow("Recovery");
});
export async function preparedIdea() {
  const s = await setup();
  await s.source("first");
  await s.source("second");
  const topic = await s.topic(),
    repositoryId = await s.repo();
  const queued = await s.a.mutation(api.knowledge.startEvaluation, {
    id: topic._id,
    repositoryId,
    maxCredits: 10,
  });
  const claim = (await s.t.mutation(internal.knowledge.claimEvaluation, {
    id: queued.id,
  }))!;
  const output = {
    disposition: "relevant",
    title: "Synthetic reviewed issue",
    rationale: "A synthetic owned project can test review.",
    problem: "Keep a reviewable synthetic decision.",
    approach: "Document the decision manually.",
    acceptance: ["Decision is reviewable."],
    tests: ["Inspect the decision."],
    risks: ["No benefit has been measured."],
    alternatives: ["Keep the idea in the library."],
    questions: ["Will this be useful?"],
    references: claim.evaluation.references,
    repositoryEvidence: [
      {
        path: "README.md",
        startLine: 1,
        endLine: 2,
        explanation: "Inspected context",
      },
    ],
  };
  await s.t.mutation(internal.knowledge.finishEvaluation, {
    id: queued.id,
    output,
    inspected: [{ path: "README.md", startLine: 1, endLine: 5 }],
    credits: 1,
  });
  return { ...s, evaluationId: queued.id, repositoryId, topic };
}
it("grounds multi-source evaluations, reuses completed requests and refuses changed repository context", async () => {
  const s = await preparedIdea();
  const repeated = await s.a.mutation(api.knowledge.startEvaluation, {
    id: s.topic._id,
    repositoryId: s.repositoryId,
    maxCredits: 10,
  });
  expect(repeated.id).toBe(s.evaluationId);
  expect(repeated.cached).toBe(true);
  const ideas = await s.a.query(api.knowledge.evaluations, {
    organizationId: s.org,
  });
  expect(ideas.items[0].references).toHaveLength(2);
  await s.t.run((ctx) => ctx.db.patch(s.repositoryId, { profileVersion: 2 }));
  expect(
    (await s.a.query(api.knowledge.evaluations, { organizationId: s.org }))
      .items[0].state,
  ).toBe("stale");
  await expect(
    s.a.mutation(api.issues.create, { id: s.evaluationId, followUp: false }),
  ).rejects.toThrow("APPROVAL_STALE");
});
it("requires separate exact-content issue approval and prevents blind retries", async () => {
  const s = await preparedIdea();
  const id = await s.a.mutation(api.issues.create, {
    id: s.evaluationId,
    followUp: false,
  });
  await expect(
    s.b.mutation(api.issues.edit, {
      id,
      version: 1,
      title: "Foreign",
      body: "Foreign",
      includePermittedExcerpts: false,
    }),
  ).rejects.toThrow();
  let d = (await s.a.query(api.issues.list, { organizationId: s.org }))
    .items[0];
  expect(d.body).toContain("## Acceptance criteria");
  expect(d.body).not.toContain("Claim first");
  await expect(
    s.a.mutation(api.issues.create, { id: s.evaluationId, followUp: false }),
  ).rejects.toThrow("DUPLICATE_ISSUE");
  await s.t.mutation(internal.issues.prepared, {
    id,
    hash: d.hash,
    visibility: "public",
  });
  const approve = {
    id,
    version: 1,
    hash: d.hash,
    visibility: "public" as const,
    publicationRights: true,
  };
  await expect(
    s.a.mutation(api.issues.approve, { ...approve, publicationRights: false }),
  ).rejects.toThrow("RIGHTS_REQUIRED");
  await expect(
    s.a.mutation(api.issues.approve, { ...approve, hash: "wrong" }),
  ).rejects.toThrow("APPROVAL_STALE");
  const attemptId = await s.a.mutation(api.issues.approve, approve);
  await s.t.mutation(internal.issues.claim, { id: attemptId });
  await expect(
    s.t.mutation(internal.issues.claim, { id: attemptId }),
  ).rejects.toThrow("PUBLICATION_UNKNOWN");
  await s.t.mutation(internal.issues.receipt, {
    id: attemptId,
    state: "unknown",
  });
  await expect(s.a.mutation(api.issues.approve, approve)).rejects.toThrow();
  expect(await s.t.run((ctx) => ctx.db.query("runs").collect())).toHaveLength(
    0,
  );
  d = (await s.a.query(api.issues.list, { organizationId: s.org })).items[0];
  expect(d.attempts).toHaveLength(1);
  expect(d.state).toBe("unknown");
});
it("invalidates approval after edits, refuses secrets/media links, and preserves external receipts after deletion", async () => {
  const s = await preparedIdea();
  const id = await s.a.mutation(api.issues.create, {
    id: s.evaluationId,
    followUp: false,
  });
  let d = (await s.a.query(api.issues.list, { organizationId: s.org }))
    .items[0];
  await expect(
    s.a.mutation(api.issues.edit, {
      id,
      version: 1,
      title: d.title,
      body: d.body + "\nhttps://private.test/file?X-Amz-Signature=synthetic",
      includePermittedExcerpts: true,
    }),
  ).rejects.toThrow("POLICY_BLOCKED");
  await expect(
    s.a.mutation(api.issues.edit, {
      id,
      version: 1,
      title: d.title,
      body: d.body + "\n```private code```",
      includePermittedExcerpts: false,
    }),
  ).rejects.toThrow("RIGHTS_REQUIRED");
  await s.t.mutation(internal.issues.prepared, {
    id,
    hash: d.hash,
    visibility: "private",
  });
  await s.a.mutation(api.issues.edit, {
    id,
    version: 1,
    title: "Corrected title",
    body: d.body,
    includePermittedExcerpts: false,
  });
  await expect(
    s.a.mutation(api.issues.approve, {
      id,
      version: 1,
      hash: d.hash,
      visibility: "private",
      publicationRights: true,
    }),
  ).rejects.toThrow("APPROVAL_STALE");
  d = (await s.a.query(api.issues.list, { organizationId: s.org })).items[0];
  await s.t.mutation(internal.issues.prepared, {
    id,
    hash: d.hash,
    visibility: "private",
  });
  const attemptId = await s.a.mutation(api.issues.approve, {
    id,
    version: 2,
    hash: d.hash,
    visibility: "private",
    publicationRights: true,
  });
  await s.t.mutation(internal.issues.claim, { id: attemptId });
  await s.t.mutation(internal.issues.receipt, {
    id: attemptId,
    state: "published",
    number: 42,
    url: "https://github.com/owned/synthetic/issues/42",
    externalState: "open",
  });
  await s.a.mutation(api.product.deleteSource, {
    id: d.references[0].sourceId,
  });
  expect(
    (await s.a.query(api.issues.list, { organizationId: s.org })).items[0].body,
  ).toBe("");
  expect(
    (await s.a.query(api.knowledge.evaluations, { organizationId: s.org }))
      .items[0].output,
  ).toBeUndefined();
  const exportPage = await s.a.query(api.jobs.exportPage, {
    organizationId: s.org,
    section: "issueDrafts",
    cursor: null,
    asOf: Date.now(),
  });
  expect(JSON.stringify(exportPage)).not.toContain("## Problem");
  expect((await s.t.run((ctx) => ctx.db.get(attemptId)))!.number).toBe(42);
});
it("selects only authorized identities, preserves confirmed context, and fences late snapshot saves", async () => {
  const s = await setup();
  const repositoryId = await s.repo();
  await s.t.mutation(internal.githubLinks.save, {
    organizationId: s.org,
    githubUserId: 7,
    installations: [
      {
        installationId: 42,
        repositories: [
          { id: 55, fullName: "owned/synthetic" },
          { id: 56, fullName: "owned/future" },
        ],
      },
    ],
  });
  await s.t.mutation(internal.jobs.storeSecret, {
    organizationId: s.org,
    provider: "github",
    ciphertext: "synthetic-encrypted",
    keyVersion: "synthetic",
  });
  const choice = {
    installationId: 42,
    providerId: 55,
    fullName: "owned/synthetic",
  };
  await expect(
    s.a.mutation(api.repositorySelection.save, {
      organizationId: s.org,
      choices: [{ ...choice, providerId: 999 }],
      draftContext: true,
      maxCredits: 0,
    }),
  ).rejects.toThrow("FORBIDDEN");
  const selected = await s.a.mutation(api.repositorySelection.save, {
    organizationId: s.org,
    choices: [choice],
    draftContext: true,
    maxCredits: 0,
  });
  expect(selected[0].draftContext).toBe(false);
  await s.t.mutation(internal.repositorySelection.preparationState, {
    id: repositoryId,
    actor: s.ownerId,
    version: selected[0].selectionVersion,
    state: "drafting_context",
  });
  expect((await s.t.run((ctx) => ctx.db.get(repositoryId)))!.status).toBe(
    "drafting_context",
  );
  expect(
    await s.a.query(api.product.repositories, { organizationId: s.org }),
  ).toHaveLength(1);
  await s.a.mutation(api.repositorySelection.save, {
    organizationId: s.org,
    choices: [],
    draftContext: true,
    maxCredits: 0,
  });
  await s.t.mutation(internal.repositorySelection.preparationState, {
    id: repositoryId,
    actor: s.ownerId,
    version: selected[0].selectionVersion,
    state: "connected",
  });
  expect((await s.t.run((ctx) => ctx.db.get(repositoryId)))!.status).toBe(
    "drafting_context",
  );
  await expect(
    s.t.mutation(internal.jobs.saveRepository, {
      organizationId: s.org,
      ...choice,
      selectionVersion: selected[0].selectionVersion,
      snapshotActor: s.ownerId,
      sha: "b".repeat(40),
      branch: "main",
      manifest: [],
      context: "late private content",
    }),
  ).rejects.toThrow("APPROVAL_STALE");
  expect((await s.t.run((ctx) => ctx.db.get(repositoryId)))!.profile).toBe(
    "purpose: review synthetic ideas",
  );
});
it("publishes exact reviewed bytes through the isolated issue path and reconciles edits/reopen without writing", async () => {
  const s = await preparedIdea();
  const id = await s.a.mutation(api.issues.create, {
    id: s.evaluationId,
    followUp: false,
  });
  vi.mocked(authorizeRepository).mockResolvedValue({});
  vi.mocked(issueAccess).mockResolvedValue({
    token: "synthetic-token",
    visibility: "private",
  });
  await s.a.action(api.issueActions.prepare, { id });
  const d = (await s.a.query(api.issues.list, { organizationId: s.org }))
    .items[0];
  vi.mocked(createIssue).mockResolvedValue({
    number: 7,
    url: "https://github.com/owned/synthetic/issues/7",
    state: "open",
  });
  await s.a.action(api.issueActions.publish, {
    id,
    version: d.version,
    hash: d.hash,
    visibility: "private",
    publicationRights: true,
  });
  expect(createIssue).toHaveBeenCalledExactlyOnceWith(
    "synthetic-token",
    "owned/synthetic",
    d.title,
    d.body,
  );
  expect(await s.t.run((ctx) => ctx.db.query("runs").collect())).toEqual([]);
  const attempt = (await s.a.query(api.issues.list, { organizationId: s.org }))
    .items[0].attempts[0];
  for (const state of ["closed", "open"]) {
    vi.mocked(findIssue).mockResolvedValue({
      number: 7,
      html_url: attempt.url,
      state,
      title: "Edited externally",
      body: "GitHub user's edits",
    });
    await s.a.action(api.issueActions.refresh, { id: attempt._id });
    expect(
      (await s.t.run((ctx) => ctx.db.get(attempt._id)))!.externalState,
    ).toBe(state);
    expect(
      (await s.t.run((ctx) => ctx.db.get(attempt._id)))!.externalEdited,
    ).toBe(true);
  }
  expect(createIssue).toHaveBeenCalledTimes(1);
  await s.t.mutation(internal.issues.enqueueWebhook, {
    installationId: 42,
    providerId: 55,
    number: 7,
    delivery: "synthetic-duplicate-delivery",
  });
  await s.t.mutation(internal.issues.enqueueWebhook, {
    installationId: 42,
    providerId: 55,
    number: 7,
    delivery: "synthetic-duplicate-delivery",
  });
  expect(
    (await s.t.run((ctx) => ctx.db.query("events").collect())).filter((e) =>
      e.eventId.startsWith("issue:"),
    ),
  ).toHaveLength(1);
});
it("blocks ambiguous network retries, permission downgrade and public visibility drift", async () => {
  for (const failure of ["network", "permission", "visibility"] as const) {
    const s = await preparedIdea();
    const id = await s.a.mutation(api.issues.create, {
      id: s.evaluationId,
      followUp: false,
    });
    vi.mocked(authorizeRepository).mockResolvedValue({});
    vi.mocked(issueAccess).mockResolvedValue({
      token: "synthetic-token",
      visibility: "private",
    });
    await s.a.action(api.issueActions.prepare, { id });
    const d = (await s.a.query(api.issues.list, { organizationId: s.org }))
      .items[0];
    if (failure === "permission")
      vi.mocked(issueAccess).mockRejectedValue(
        new Error("Issues permission removed"),
      );
    if (failure === "visibility")
      vi.mocked(issueAccess).mockResolvedValue({
        token: "synthetic-token",
        visibility: "public",
      });
    if (failure === "network")
      vi.mocked(createIssue).mockRejectedValue(
        new Error("Ambiguous socket timeout"),
      );
    await expect(
      s.a.action(api.issueActions.publish, {
        id,
        version: d.version,
        hash: d.hash,
        visibility: "private",
        publicationRights: true,
      }),
    ).rejects.toThrow(
      failure === "network" ? "PUBLICATION_UNKNOWN" : "FORBIDDEN",
    );
    const saved = (await s.a.query(api.issues.list, { organizationId: s.org }))
      .items[0];
    expect(saved.attempts[0].state).toBe(
      failure === "network" ? "unknown" : "denied",
    );
    expect(createIssue).toHaveBeenCalledTimes(failure === "network" ? 1 : 0);
    await expect(
      s.a.action(api.issueActions.publish, {
        id,
        version: d.version,
        hash: d.hash,
        visibility: "private",
        publicationRights: true,
      }),
    ).rejects.toThrow();
    vi.resetAllMocks();
  }
});

it("deduplicates normalized aliases, counts all sources, searches source titles and preserves merge totals", async () => {
  const s = await setup();
  const id = await s.source("Searchable original");
  await s.t.run(async (ctx) => {
    const source = (await ctx.db.get(id))!;
    await ctx.db.patch(id, {
      analysis: {
        ...source.analysis,
        insights: source.analysis.insights.map((i: any) => ({
          ...i,
          topics: ["Review", "review", " REVIEW "],
        })),
      },
    });
  });
  const top = await s.topic();
  expect(top.sourceCount).toBe(1);
  expect(top.insightCount).toBe(1);
  const found = await s.a.query(api.knowledge.list, {
    organizationId: s.org,
    sourceSearch: "Searchable",
  });
  expect(found.items.map((t) => t._id)).toEqual([top._id]);
  expect(
    (
      await s.b.query(api.knowledge.list, {
        organizationId: s.foreign,
        sourceSearch: "Searchable",
      })
    ).items,
  ).toEqual([]);
  await s.source("other", "Separate");
  await s.t.mutation(internal.knowledge.backfill, {});
  const destination = (
    await s.a.query(api.knowledge.list, { organizationId: s.org })
  ).items.find((t) => t.name === "Separate")!;
  await s.a.mutation(api.knowledge.correct, {
    id: top._id,
    version: top.version,
    mergeInto: destination._id,
  });
  await s.t.mutation(internal.knowledge.mergePage, {
    id: top._id,
    destination: destination._id,
    cursor: null,
  });
  const merged = await s.a.query(api.knowledge.detail, { id: destination._id });
  expect(merged.topic.sourceCount).toBe(2);
  expect(merged.topic.insightCount).toBe(2);
  await s.t.mutation(internal.knowledge.backfill, {});
  expect(
    (await s.a.query(api.knowledge.detail, { id: destination._id })).topic
      .sourceCount,
  ).toBe(2);
});
it("marks interrupted running synthesis unknown and keeps its reservation without redispatch", async () => {
  const s = await setup();
  await s.source("interrupted");
  const top = await s.topic();
  await s.a.mutation(api.knowledge.configure, {
    organizationId: s.org,
    enabled: true,
    ceiling: 10,
  });
  await s.t.mutation(internal.knowledge.enqueue, { topicId: top._id });
  const job = (
    await s.t.run((ctx) => ctx.db.query("knowledgeJobs").collect())
  )[0];
  await s.t.mutation(internal.knowledge.claim, { id: job._id });
  vi.setSystemTime(Date.now() + 300001);
  await s.t.mutation(internal.knowledge.recoverPage, {});
  expect((await s.t.run((ctx) => ctx.db.get(job._id)))!.state).toBe("unknown");
  expect(
    (await s.a.query(api.knowledge.detail, { id: top._id })).topic.state,
  ).toBe("unknown");
  expect(
    await s.t.mutation(internal.knowledge.claim, { id: job._id }),
  ).toBeNull();
  expect(
    (await s.t.run((ctx) =>
      ctx.db
        .query("reservations")
        .withIndex("by_key", (q) =>
          q.eq("organizationId", s.org).eq("key", job.key),
        )
        .unique(),
    ))!.state,
  ).toBe("active");
});

it("serializes each workspace's synthesis queue while preserving separate approved holds", async () => {
  const s = await setup();
  await s.source("first queue", "First topic");
  await s.source("second queue", "Second topic");
  await s.topic();
  const topics = (
    await s.a.query(api.knowledge.list, { organizationId: s.org })
  ).items;
  await s.a.mutation(api.knowledge.configure, {
    organizationId: s.org,
    enabled: true,
    ceiling: 20,
  });
  for (const topic of topics)
    await s.t.mutation(internal.knowledge.enqueue, { topicId: topic._id });
  const jobs = await s.t.run((ctx) => ctx.db.query("knowledgeJobs").collect());
  expect(jobs).toHaveLength(2);
  expect(
    await s.t.mutation(internal.knowledge.claim, { id: jobs[0]._id }),
  ).not.toBeNull();
  expect(
    await s.t.mutation(internal.knowledge.claim, { id: jobs[1]._id }),
  ).toBeNull();
  expect((await s.t.run((ctx) => ctx.db.get(jobs[1]._id)))!.state).toBe(
    "queued",
  );
  await s.t.mutation(internal.knowledge.finish, {
    id: jobs[0]._id,
    credits: 1,
    output: {
      explanation: "Synthetic queue completion",
      claims: [],
      relations: [],
      uncertainty: "No independent judgment",
    },
  });
  expect(
    await s.t.mutation(internal.knowledge.claim, { id: jobs[1]._id }),
  ).not.toBeNull();
  const reservations = await s.t.run((ctx) =>
    ctx.db.query("reservations").collect(),
  );
  expect(reservations.filter((r) => r.state === "active")).toHaveLength(1);
});

it("keeps legacy insights retrievable when topic labels are empty, absent or unusable", async () => {
  const s = await setup();
  for (const [key, categories] of [
    ["legacy categories", ["engineering"]],
    ["legacy unsorted", []],
  ] as const) {
    const id = await s.source(key);
    await s.t.run(async (ctx) => {
      const source = (await ctx.db.get(id))!;
      await ctx.db.patch(id, {
        analysis: {
          ...source.analysis,
          insights: source.analysis.insights.map((point: any) => ({
            ...point,
            topics: [],
            categories,
          })),
        },
      });
    });
  }
  await s.topic();
  const topics = (
    await s.a.query(api.knowledge.list, { organizationId: s.org })
  ).items;
  expect(topics.map((t) => t.name).sort()).toEqual([
    "Unsorted ideas",
    "engineering",
  ]);
  for (const topic of topics)
    expect(
      (await s.a.query(api.knowledge.detail, { id: topic._id })).members.filter(
        (m) => !!m.evidence,
      ),
    ).toHaveLength(1);
  await s.t.mutation(internal.knowledge.backfill, {});
  expect(
    await s.t.run((ctx) => ctx.db.query("knowledgeMembers").collect()),
  ).toHaveLength(2);
});
