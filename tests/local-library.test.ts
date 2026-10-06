import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { sourceFingerprint } from "../convex/localLibrary";
import { createHash } from "node:crypto";
import { canonicalJson } from "../packages/contracts/canonical-json.mjs";
import { downloaderRelease } from "../packages/media/acquisition";
import { exportRecord } from "../packages/privacy/export";
const modules = import.meta.glob("../convex/**/*.ts");
const captionManifest = {
  schemaVersion: "1.0.0",
  status: "downloaded",
  title: "Saved video",
  description: "A caption contains a distinct useful idea missing from speech.",
  extractor: "youtube",
  downloaderVersion: downloaderRelease.version,
  byteLength: 100,
};
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("PERSONAL_ALPHA_SUBJECTS_JSON", '["owner","other"]');
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
async function setup(extra: Record<string, unknown> = {}) {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  for (const subject of ["owner", "other"])
    await t.mutation(internal.accounts.syncUser, {
      subject,
      email: subject + "@example.test",
      name: subject,
    });
  const a = t.withIdentity({
      subject: "owner",
      auth_time: Math.floor(Date.now() / 1000),
    }),
    b = t.withIdentity({
      subject: "other",
      auth_time: Math.floor(Date.now() / 1000),
    });
  const org = await a.mutation(api.organizations.create, { name: "A" }),
    other = await b.mutation(api.organizations.create, { name: "B" });
  const source = await a.mutation(api.product.capture, {
    organizationId: org,
    key: "local-synthetic-video",
    kind: "url",
    title: "Owned test video",
    url: "https://www.youtube.com/watch?v=abcdefghijk",
    rightsAttested: true,
  });
  const prepare = (extra: any = {}) =>
    a.mutation(api.localLibrary.prepare, {
      organizationId: org,
      sources: [source],
      repositories: [],
      useOwnPlan: true,
      ...extra,
    });
  const run = await prepare();
  const s = (await t.run((ctx) => ctx.db.get(source)))!;
  const sourceArgs = {
    ...extra,
    runId: run,
    sourceId: source,
    generation: s.generation,
    revision: s.updatedAt,
    inputHash: await sourceFingerprint(s),
    transcript: {
      durationMs: 1000,
      segments: [
        {
          index: 0,
          startMs: 0,
          endMs: 1000,
          text: "Review source evidence before coding.",
        },
      ],
    },
    frames: [
      { id: "frame-1.jpg", timestampMs: 0, sha256: "a".repeat(64), size: 100 },
    ],
  };
  const job = await a.mutation(api.localLibrary.sourcePrepare, sourceArgs);
  const asset = await t.run((ctx) =>
    ctx.db.insert("assets", {
      organizationId: org,
      sourceId: source,
      key: org + "/frame-fixture",
      size: 100,
      type: "image/jpeg",
      state: "complete",
      kind: "evidence",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
  await a.mutation(internal.localLibrary.recordFrame, {
    id: job,
    frameId: "frame-1.jpg",
    assetId: asset,
    sha256: "a".repeat(64),
  });
  const output = {
    schemaVersion: "1.0.0",
    sourceId: source,
    processingRunId: source + ":" + s.generation,
    coverage: "full_sampled",
    summary: "Review evidence before coding.",
    warnings: ["Frames are samples."],
    insights: [
      {
        id: "one",
        title: "Review evidence",
        claim: "Review source evidence before coding.",
        interpretation: "Check facts before an implementation.",
        categories: ["coding"],
        topics: ["Evidence and verification"],
        evidence: [
          { kind: "frame", id: "frame-1.jpg", startMs: 0, endMs: 0 },
          { kind: "transcript", id: "segment-0", startMs: 0, endMs: 1000 },
        ],
        confidence: "supported",
        verificationNeeds: [],
      },
    ],
  };
  const receipt = (o = output) => ({
    state: "completed",
    model: "gpt-6.1-sol",
    effort: "medium",
    appCredits: 0,
    separateApiCall: false,
    inputHash: "b".repeat(64),
    outputHash: hash(canonicalJson(o)),
  });
  const finish = (o = output) =>
    a.mutation(api.localLibrary.sourceFinish, {
      id: job,
      output: o,
      receipt: receipt(o),
    });
  return {
    t,
    a,
    b,
    org,
    other,
    source,
    run,
    job,
    asset,
    sourceArgs,
    output,
    receipt,
    prepare,
    finish,
  };
}
it("imports bounded fetched captions as cited evidence and clears the staging copy", async () => {
  const s = await setup({ acquisition: captionManifest });
  const output = structuredClone(s.output);
  output.insights[0].evidence.push({
    kind: "caption",
    id: "post_caption",
    startMs: null,
    endMs: null,
  } as any);
  await s.finish(output);
  const source = await s.t.run((ctx) => ctx.db.get(s.source));
  expect(source?.acquisition?.description).toBe(captionManifest.description);
  expect(source?.acquisition?.downloaderVersion).toBe(
    downloaderRelease.version,
  );
  expect(source?.title).toBe("Owned test video");
  expect(
    (await s.t.run((ctx) => ctx.db.get(s.job)))?.acquisition,
  ).toBeUndefined();
  expect(
    exportRecord("localSourceImports", {
      acquisition: captionManifest,
      transcript: {},
      frames: [],
      state: "prepared",
    }),
  ).toEqual({ state: "prepared" });
});
it("refuses invented captions and changed or out-of-bounds fetch metadata", async () => {
  const s = await setup();
  const output = structuredClone(s.output);
  output.insights[0].evidence.push({
    kind: "caption",
    id: "post_caption",
    startMs: null,
    endMs: null,
  } as any);
  await expect(s.finish(output)).rejects.toThrow("INVALID_EVIDENCE");
  await expect(
    s.a.mutation(api.localLibrary.sourcePrepare, {
      ...s.sourceArgs,
      acquisition: captionManifest,
    }),
  ).rejects.toThrow("APPROVAL_STALE");
  await expect(
    s.a.mutation(api.localLibrary.sourcePrepare, {
      ...s.sourceArgs,
      acquisition: { ...captionManifest, description: "x".repeat(6001) },
    }),
  ).rejects.toThrow();
});
it("imports exact owned evidence into the canonical library without touching credits or paid dispatch", async () => {
  const s = await setup(),
    walletsBefore = await s.t.run((ctx) => ctx.db.query("wallets").collect()),
    holdsBefore = await s.t.run((ctx) =>
      ctx.db.query("reservations").collect(),
    );
  await s.t.run(async (ctx) => {
    const actor = (await ctx.db.get(s.run))!.actor;
    await ctx.db.insert("knowledgePolicies", {
      organizationId: s.org,
      actor,
      enabled: true,
      ceiling: 100,
      used: 0,
      period: "2026-10",
      version: 1,
      state: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
  expect(await s.finish()).toEqual({ saved: true, cached: false });
  const source = await s.t.run((ctx) => ctx.db.get(s.source));
  expect(source?.state).toBe("ready");
  expect(source?.analysis.insights[0].evidence[0].id).toBe(s.asset);
  expect(source?.localAnalysisReceipt?.model).toBe("gpt-6.1-sol");
  expect(
    await s.t.run((ctx) => ctx.db.query("knowledgeMembers").collect()),
  ).toHaveLength(1);
  expect(await s.t.run((ctx) => ctx.db.query("wallets").collect())).toEqual(
    walletsBefore,
  );
  expect(
    await s.t.run((ctx) => ctx.db.query("reservations").collect()),
  ).toEqual(holdsBefore);
  expect(await s.finish()).toEqual({ saved: true, cached: true });
  expect(
    await s.t.run((ctx) => ctx.db.query("knowledgeJobs").collect()),
  ).toEqual([]);
});
it("rejects foreign membership, actor reuse, changed source inputs and revoked run consent", async () => {
  const s = await setup();
  await expect(
    s.b.mutation(api.localLibrary.sourceFinish, {
      id: s.job,
      output: s.output,
      receipt: s.receipt(),
    }),
  ).rejects.toThrow();
  await expect(
    s.prepare({ sources: [s.source], organizationId: s.other }),
  ).rejects.toThrow();
  await s.t.run(async (ctx) =>
    ctx.db.patch(s.source, {
      updatedAt: (await ctx.db.get(s.source))!.updatedAt + 1,
    }),
  );
  await expect(s.finish()).rejects.toThrow("APPROVAL_STALE");
  await s.a.mutation(api.localLibrary.cancel, { runId: s.run });
  await expect(
    s.a.mutation(api.localLibrary.sourcePrepare, s.sourceArgs),
  ).rejects.toThrow("APPROVAL_STALE");
});
it("rejects forged timestamps, missing private frames, changed model and expired authorization", async () => {
  const s = await setup();
  const bad = structuredClone(s.output);
  bad.insights[0].evidence[0].startMs = 1;
  await expect(s.finish(bad)).rejects.toThrow("INVALID_EVIDENCE");
  await expect(
    s.a.mutation(api.localLibrary.sourceFinish, {
      id: s.job,
      output: s.output,
      receipt: { ...s.receipt(), model: "other" },
    }),
  ).rejects.toThrow("INVALID_EVIDENCE");
  await s.t.run((ctx) => ctx.db.patch(s.asset, { state: "deleted" }));
  await expect(s.finish()).rejects.toThrow("INVALID_EVIDENCE");
  vi.advanceTimersByTime(4 * 3600000 + 1);
  await expect(s.finish()).rejects.toThrow("APPROVAL_STALE");
});
it("keeps corrected source text and manual topic memberships through a new analysis", async () => {
  const s = await setup();
  const owner = await s.t.run((ctx) =>
    ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", "owner"))
      .unique(),
  );
  await s.t.run(async (ctx) => {
    await ctx.db.patch(s.source, {
      text: "Owner correction",
      originalText: "Earlier text",
      correctionAuthor: owner!._id,
    });
    const src = (await ctx.db.get(s.source))!;
    await ctx.db.patch(s.job, { inputHash: await sourceFingerprint(src) });
    const topic = await ctx.db.insert("knowledgeTopics", {
      organizationId: s.org,
      key: "manual",
      name: "My reviewed topic",
      pinned: true,
      version: 1,
      state: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.insert("knowledgeMembers", {
      organizationId: s.org,
      topicId: topic,
      sourceId: s.source,
      generation: src.generation,
      revision: src.updatedAt,
      insightId: "one",
      excluded: true,
      manual: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
  const renamed = structuredClone(s.output);
  renamed.insights[0].id = "different";
  await expect(s.finish(renamed)).rejects.toThrow("APPROVAL_STALE");
  await s.finish();
  const src = await s.t.run((ctx) => ctx.db.get(s.source));
  expect(src?.text).toBe("Owner correction");
  expect(src?.originalText).toBe("Earlier text");
  const manual = await s.t.run((ctx) =>
    ctx.db
      .query("knowledgeMembers")
      .withIndex("by_source", (q) => q.eq("sourceId", s.source))
      .collect(),
  );
  expect(manual.find((m) => m.manual)?.excluded).toBe(true);
});
it("never restores a deleted source and removes pending derived source content", async () => {
  const s = await setup({ acquisition: captionManifest });
  await s.a.mutation(api.product.deleteSource, { id: s.source });
  await expect(s.finish()).rejects.toThrow("APPROVAL_STALE");
  await s.t.mutation(internal.localLibrary.redactSource, {
    sourceId: s.source,
    cursor: null,
  });
  const j = await s.t.run((ctx) => ctx.db.get(s.job));
  expect(j?.state).toBe("deleted");
  expect(j?.frames).toEqual([]);
  expect(j?.transcript.segments).toEqual([]);
  expect(j?.acquisition).toBeUndefined();
  expect((await s.t.run((ctx) => ctx.db.get(s.source)))?.state).toBe("deleted");
});
it("expires pending private inputs and retires unused frames without altering canonical knowledge", async () => {
  const s = await setup({ acquisition: captionManifest });
  vi.advanceTimersByTime(4 * 3600000 + 1);
  await s.t.mutation(internal.localLibrary.expire, { runId: s.run });
  await s.t.mutation(internal.localLibrary.cleanPending, {
    runId: s.run,
    cursor: null,
  });
  const job = await s.t.run((ctx) => ctx.db.get(s.job));
  expect(job?.transcript.segments).toEqual([]);
  expect(job?.frames).toEqual([]);
  expect(job?.acquisition).toBeUndefined();
  expect((await s.t.run((ctx) => ctx.db.get(s.asset)))?.state).toBe("deleting");
  expect((await s.t.run((ctx) => ctx.db.get(s.source)))?.state).not.toBe(
    "ready",
  );
  expect(
    await s.t.run((ctx) => ctx.db.query("objectDeletions").collect()),
  ).toHaveLength(1);
});
it("synthesizes every bounded page, rejects forged references and fences late source corrections", async () => {
  const s = await setup();
  await s.finish();
  const topic = (await s.a.query(api.knowledge.list, { organizationId: s.org }))
    .items[0];
  await s.t.run(async (ctx) => {
    const source = (await ctx.db.get(s.source))!;
    const insights = Array.from({ length: 25 }, (_, n) => ({
      ...source.analysis.insights[0],
      id: "extra-" + n,
    }));
    await ctx.db.patch(s.source, {
      analysis: {
        ...source.analysis,
        insights: [...source.analysis.insights, ...insights],
      },
    });
    for (const i of insights)
      await ctx.db.insert("knowledgeMembers", {
        organizationId: s.org,
        topicId: topic._id,
        sourceId: s.source,
        generation: source.generation,
        revision: source.updatedAt,
        insightId: i.id,
        manual: false,
        excluded: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
  });
  let cursor: string | undefined;
  let count = 0;
  let last: any;
  do {
    const p = await s.a.mutation(api.localLibrary.summaryPrepare, {
      runId: s.run,
      topicId: topic._id,
      cursor,
    });
    count += p.evidence.length;
    const output = {
      explanation: "A bounded evidence batch.",
      claims: [
        { text: "Check evidence.", references: [p.evidence[0].reference] },
      ],
      relations: [],
      uncertainty: "Source claims are not independent proof.",
    };
    await expect(
      s.a.mutation(api.localLibrary.summaryFinish, {
        id: p.id,
        output: {
          ...output,
          claims: [
            {
              text: "Invented",
              references: [
                { ...p.evidence[0].reference, insightId: "missing" },
              ],
            },
          ],
        },
      }),
    ).rejects.toThrow("INVALID_EVIDENCE");
    await s.a.mutation(api.localLibrary.summaryFinish, { id: p.id, output });
    last = { id: p.id, output };
    cursor = p.next ?? undefined;
  } while (cursor);
  expect(count).toBe(26);
  expect(
    await s.t.run((ctx) => ctx.db.query("knowledgeJobs").collect()),
  ).toHaveLength(3);
  await s.t.run(async (ctx) =>
    ctx.db.patch(s.source, {
      updatedAt: (await ctx.db.get(s.source))!.updatedAt + 1,
    }),
  );
  await expect(
    s.a.mutation(api.localLibrary.summaryFinish, last),
  ).rejects.toThrow("APPROVAL_STALE");
});
it("binds repository evaluation to inspected lines, confirmed context, feedback and the current commit", async () => {
  const s = await setup();
  await s.finish();
  const topic = (await s.a.query(api.knowledge.list, { organizationId: s.org }))
    .items[0];
  const repo = await s.t.run(async (ctx) => {
    const id = await ctx.db.insert("repositories", {
      organizationId: s.org,
      installationId: 1,
      providerId: 2,
      fullName: "owned/fixture",
      branch: "main",
      sha: "a".repeat(40),
      enabled: true,
      confirmed: true,
      profile: "Owner confirmed purpose",
      profileVersion: 1,
      selectionVersion: 1,
      manifest: ["README.md"],
      status: "connected",
      context: "Current excerpt",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.patch(s.run, { repositories: [id] });
    return id;
  });
  const p = await s.a.mutation(api.localLibrary.evaluationPrepare, {
    runId: s.run,
    topicId: topic._id,
    repositoryId: repo,
  });
  expect((await s.t.run((ctx) => ctx.db.get(p.id)))!.key).toContain(
    "insight-first-project-context-v3",
  );
  await s.a.mutation(internal.localLibrary.recordInspection, {
    id: p.id,
    inspected: [{ path: "README.md", startLine: 1, endLine: 5 }],
  });
  const output = {
    disposition: "relevant",
    title: "Review sources",
    rationale: "Evidence helps.",
    problem: "Source citations are absent.",
    approach: "Add verified citations.",
    acceptance: ["Citations open the correct source."],
    tests: ["Reject invented references."],
    risks: [],
    alternatives: [],
    questions: [],
    references: [p.evidence[0].reference],
    repositoryEvidence: [
      {
        path: "README.md",
        startLine: 1,
        endLine: 6,
        explanation: "Outside inspected lines.",
      },
    ],
  };
  await expect(
    s.a.mutation(api.localLibrary.evaluationFinish, { id: p.id, output }),
  ).rejects.toThrow("INVALID_EVIDENCE");
  output.repositoryEvidence[0].endLine = 5;
  await s.a.mutation(api.localLibrary.evaluationFinish, { id: p.id, output });
  await s.t.run((ctx) => ctx.db.patch(p.id, { decision: "rejected" }));
  const again = await s.a.mutation(api.localLibrary.evaluationPrepare, {
    runId: s.run,
    topicId: topic._id,
    repositoryId: repo,
  });
  expect(again.reviewHistory[0].decision).toBe("rejected");
  const otherTopic = await s.t.run(async (ctx) => {
    const id = await ctx.db.insert("knowledgeTopics", {
      organizationId: s.org,
      key: "secondary",
      name: "A secondary topic",
      pinned: false,
      version: 1,
      state: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const source = (await ctx.db.get(s.source))!;
    await ctx.db.patch(s.source, {
      analysis: {
        ...source.analysis,
        insights: [
          ...source.analysis.insights,
          { ...source.analysis.insights[0], id: "secondary" },
        ],
      },
    });
    return {
      id,
      member: await ctx.db.insert("knowledgeMembers", {
        organizationId: s.org,
        topicId: id,
        sourceId: s.source,
        generation: source.generation,
        revision: source.updatedAt,
        insightId: "secondary",
        manual: true,
        excluded: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    };
  });
  const firstMember = await s.t.run(
    async (ctx) =>
      (await ctx.db
        .query("knowledgeMembers")
        .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
        .first())!._id,
  );
  const group = await s.a.mutation(api.localLibrary.evaluationPrepare, {
    runId: s.run,
    topicId: topic._id,
    repositoryId: repo,
    members: [firstMember, otherTopic.member],
  });
  expect(group.evidence).toHaveLength(2);
  await s.a.mutation(internal.localLibrary.recordInspection, {
    id: group.id,
    inspected: [{ path: "README.md", startLine: 1, endLine: 5 }],
  });
  await s.t.run((ctx) => ctx.db.patch(otherTopic.id, { version: 2 }));
  await expect(
    s.a.mutation(api.localLibrary.evaluationFinish, { id: group.id, output }),
  ).rejects.toThrow("APPROVAL_STALE");
  await s.t.run((ctx) => ctx.db.patch(otherTopic.member, { excluded: true }));
  await expect(
    s.a.mutation(api.localLibrary.evaluationPrepare, {
      runId: s.run,
      topicId: topic._id,
      repositoryId: repo,
      members: [firstMember, otherTopic.member],
    }),
  ).rejects.toThrow("FORBIDDEN");
  await s.t.run((ctx) => ctx.db.patch(repo, { sha: "b".repeat(40) }));
  await expect(
    s.a.mutation(api.localLibrary.evaluationFinish, { id: p.id, output }),
  ).rejects.toThrow("APPROVAL_STALE");
  await expect(
    s.b.mutation(api.localLibrary.evaluationPrepare, {
      runId: s.run,
      topicId: topic._id,
      repositoryId: repo,
    }),
  ).rejects.toThrow();
});
