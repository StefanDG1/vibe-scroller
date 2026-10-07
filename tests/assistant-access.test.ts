import { afterEach, expect, it, vi } from "vitest";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { syncDashboardCard } from "../convex/lib/dashboardProjection";
const modules = import.meta.glob("../convex/**/*.ts");
const issuer = "https://synthetic-test.authkit.app";
const clientId = "client_01234567890123456789012345";
const subject = "user_01234567890123456789012345";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
async function setup() {
  vi.stubEnv("MCP_ENABLED", "true");
  vi.stubEnv("MCP_AUTH_ISSUER", issuer);
  vi.stubEnv(
    "MCP_CLIENTS",
    JSON.stringify([
      {
        id: clientId,
        name: "Synthetic client",
        scopes: [
          "knowledge:read",
          "context:read",
          "links:save",
          "jobs:read",
          "analysis:request",
          "feedback:write",
          "suggestions:draft",
        ],
      },
    ]),
  );
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  await t.mutation(internal.accounts.syncUser, {
    subject,
    email: "assistant@example.test",
    name: "Synthetic owner",
  });
  const owner = t.withIdentity({
    subject,
    issuer: "https://api.workos.com",
    auth_time: Math.floor(Date.now() / 1000),
  });
  const assistant = t.withIdentity({
    subject,
    issuer,
    client_id: clientId,
    scope:
      "knowledge:read context:read links:save jobs:read analysis:request feedback:write suggestions:draft",
    sid: "app_consent_01234567890123456789012345",
  });
  const organizationId = await owner.mutation(
    api.organizations.createPrivate,
    {},
  );
  const sourceId = await owner.mutation(api.product.capture, {
    organizationId,
    key: "assistant-synthetic-source",
    kind: "text",
    title: "Synthetic selected evidence",
    text: "PRIVATE transcript must never leave through assistant fetch",
    rightsAttested: true,
  });
  const source = (await t.run((ctx) => ctx.db.get(sourceId)))!;
  const args = {
    organizationId,
    clientId,
    sources: [
      { sourceId, generation: source.generation, revision: source.updatedAt },
    ],
    scopes: ["knowledge:read"],
    expectedVersion: 0,
    expiresAt: Date.now() + 86400000,
    acknowledged: true as const,
  };
  return { t, owner, assistant, organizationId, sourceId, args };
}
it("records explicit source judgments with replay-safe corrections while preserving manual reviews and denying stale or revoked writes", async () => {
  const s = await setup();
  const grant = await s.owner.mutation(api.assistantGrants.save, {
    ...s.args,
    scopes: ["feedback:write"],
  });
  const input = {
    profileId: s.organizationId,
    sourceId: s.sourceId,
    generation: s.args.sources[0].generation,
    revision: s.args.sources[0].revision,
    grantVersion: 1,
    key: "stable-feedback-key",
    expectedVersion: 0,
    explicitlyRequested: true as const,
    action: "useful" as const,
    note: "I found this relevant. Benefit has not been measured.",
  };
  const manual = await s.owner.mutation(api.product.feedback, {
    organizationId: s.organizationId,
    target: s.sourceId,
    action: "manual",
    benefit: "not_measured",
    note: "Keep my prior judgment",
  });
  const first = await s.assistant.mutation(
    internal.assistant.recordFeedback,
    input,
  );
  expect(first).toMatchObject({
    version: 1,
    benefit: "not_measured",
    status: "recorded",
  });
  expect(
    (await s.assistant.mutation(internal.assistant.recordFeedback, input))
      .feedback_id,
  ).toBe(first.feedback_id);
  await expect(
    s.assistant.mutation(internal.assistant.recordFeedback, {
      ...input,
      action: "later",
    }),
  ).rejects.toThrow("APPROVAL_STALE");
  const corrected = await s.assistant.mutation(
    internal.assistant.recordFeedback,
    { ...input, expectedVersion: 1, action: "later" },
  );
  expect(corrected.version).toBe(2);
  const rows = await s.t.run((ctx) => ctx.db.query("feedback").collect());
  expect(rows).toHaveLength(3);
  expect(rows.find((r) => r._id === manual)?.note).toBe(
    "Keep my prior judgment",
  );
  expect(
    rows
      .filter((r) => r.assistantClientId)
      .every((r) => r.benefit === "not_measured" && !r.qualityVerdict),
  ).toBe(true);
  const noScope = s.t.withIdentity({
    subject,
    issuer,
    client_id: clientId,
    scope: "knowledge:read",
    sid: "app_consent_01234567890123456789012345",
  });
  await expect(
    noScope.mutation(internal.assistant.recordFeedback, {
      ...input,
      expectedVersion: 2,
    }),
  ).rejects.toThrow("FORBIDDEN");
  await expect(
    s.assistant.mutation(internal.assistant.recordFeedback, {
      ...input,
      expectedVersion: 2,
      revision: input.revision + 1,
    }),
  ).rejects.toThrow("APPROVAL_STALE");
  await s.owner.mutation(api.assistantGrants.revoke, {
    id: grant.id,
    expectedVersion: 1,
  });
  await expect(
    s.assistant.mutation(internal.assistant.recordFeedback, {
      ...input,
      expectedVersion: 2,
    }),
  ).rejects.toThrow("FORBIDDEN");
  expect(
    await s.t.run((ctx) => ctx.db.query("reservations").collect()),
  ).toEqual([]);
  expect(await s.t.run((ctx) => ctx.db.query("outbox").collect())).toEqual([]);
});
it("keeps Connect identities out of ordinary app queries, captures and account bootstrap", async () => {
  const s = await setup();
  await expect(
    s.assistant.query(api.assistantGrants.setup, {
      organizationId: s.organizationId,
    }),
  ).rejects.toThrow("Sign in");
  await expect(
    s.assistant.mutation(api.product.capture, {
      organizationId: s.organizationId,
      key: "unauthorized-write",
      kind: "text",
      title: "Must not save",
      text: "untrusted",
      rightsAttested: true,
    }),
  ).rejects.toThrow("Sign in");
  await expect(
    s.assistant.query(api.accounts.bootstrapRequired, {}),
  ).rejects.toThrow();
  expect(
    (await s.t.run((ctx) => ctx.db.query("sources").collect())).length,
  ).toBe(1);
});
it("requires fresh owner review, current source versions and configured scopes without spending", async () => {
  const s = await setup();
  const old = s.t.withIdentity({
    subject,
    issuer: "https://api.workos.com",
    auth_time: Math.floor(Date.now() / 1000) - 301,
  });
  await expect(old.mutation(api.assistantGrants.save, s.args)).rejects.toThrow(
    "Sign in again",
  );
  await expect(
    s.owner.mutation(api.assistantGrants.save, {
      ...s.args,
      sources: [{ ...s.args.sources[0], revision: 0 }],
    }),
  ).rejects.toThrow("STALE_APPROVAL");
  await expect(
    s.owner.mutation(api.assistantGrants.save, {
      ...s.args,
      scopes: ["execution:write"],
    }),
  ).rejects.toThrow("INVALID_INPUT");
  await s.owner.mutation(api.assistantGrants.save, s.args);
  await expect(
    s.owner.mutation(api.assistantGrants.save, s.args),
  ).rejects.toThrow("STALE_APPROVAL");
  expect(
    await s.t.run((ctx) => ctx.db.query("reservations").collect()),
  ).toEqual([]);
  expect(await s.t.run((ctx) => ctx.db.query("outbox").collect())).toEqual([]);
});
it("retrieves only selected current metadata/citations and immediately denies revocation and source changes", async () => {
  const s = await setup();
  await expect(
    s.assistant.query(internal.assistant.fetch, {
      profileId: s.organizationId,
      id: s.sourceId,
    }),
  ).rejects.toThrow("FORBIDDEN");
  const grant = await s.owner.mutation(api.assistantGrants.save, s.args);
  const result = await s.assistant.query(internal.assistant.fetch, {
    profileId: s.organizationId,
    id: s.sourceId,
  });
  expect(JSON.stringify(result)).not.toContain("PRIVATE transcript");
  expect(result.url).toContain(
    `/app/${s.organizationId}/library/${s.sourceId}`,
  );
  await s.t.run((ctx) =>
    ctx.db.patch(s.sourceId, { updatedAt: s.args.sources[0].revision + 1 }),
  );
  await expect(
    s.assistant.query(internal.assistant.fetch, {
      profileId: s.organizationId,
      id: s.sourceId,
    }),
  ).rejects.toThrow("FORBIDDEN");
  await s.owner.mutation(api.assistantGrants.revoke, {
    id: grant.id,
    expectedVersion: 1,
  });
  await expect(
    s.assistant.query(internal.assistant.fetch, {
      profileId: s.organizationId,
      id: s.sourceId,
    }),
  ).rejects.toThrow("FORBIDDEN");
});
it("rejects wrong client, OAuth scope, machine subject, consent and private owner", async () => {
  const s = await setup();
  await s.owner.mutation(api.assistantGrants.save, s.args);
  for (const change of [
    { client_id: "client_98765432109876543210987654" },
    { scope: "openid" },
    { subject: clientId },
    { sid: "session_01234567890123456789012345" },
    { subject: "user_98765432109876543210987654" },
  ]) {
    const caller = s.t.withIdentity({
      subject,
      issuer,
      client_id: clientId,
      scope: "knowledge:read",
      sid: "app_consent_01234567890123456789012345",
      ...change,
    });
    await expect(
      caller.query(internal.assistant.fetch, {
        profileId: s.organizationId,
        id: s.sourceId,
      }),
    ).rejects.toThrow("FORBIDDEN");
  }
  vi.stubEnv("RESTORE_LOCK", "true");
  await expect(
    s.assistant.query(internal.assistant.fetch, {
      profileId: s.organizationId,
      id: s.sourceId,
    }),
  ).rejects.toThrow("FORBIDDEN");
});
it("saves explicit intake once in the approved space without fetching or analysis, fences ungranted retrieval and separates funding approval", async () => {
  const s = await setup();
  vi.stubEnv("LINK_PREVIEWS_ENABLED", "true");
  await s.owner.mutation(api.assistantGrants.save, {
    ...s.args,
    sources: [],
    scopes: ["links:save", "jobs:read", "analysis:request", "knowledge:read"],
    intakeSpace: "personal",
  });
  const args = {
    profileId: s.organizationId,
    url: "https://www.youtube.com/watch?v=synthetic-test",
    title: "Synthetic explicitly requested link",
    key: "explicit-intake-replay",
    rightsAttested: true as const,
    explicitlyRequested: true as const,
  };
  const first = await s.assistant.mutation(internal.assistant.saveLink, args);
  const replay = await s.assistant.mutation(internal.assistant.saveLink, args);
  expect(replay.source_id).toBe(first.source_id);
  expect(first.analysis_started).toBe(false);
  const source = (await s.t.run((ctx) => ctx.db.get(first.source_id)))!;
  expect(source.linkPreview).toBeUndefined();
  const filing = await s.t.run((ctx) => ctx.db.query("sourceSpaces").collect());
  expect(filing).toEqual([
    expect.objectContaining({ sourceId: first.source_id, space: "personal" }),
  ]);
  expect(
    (await s.t.run((ctx) => ctx.db.query("assistantIntakes").collect())).length,
  ).toBe(1);
  await expect(
    s.assistant.query(internal.assistant.fetch, {
      profileId: s.organizationId,
      id: first.source_id,
    }),
  ).rejects.toThrow("FORBIDDEN");
  const status = await s.assistant.query(internal.assistant.getJobStatus, {
    profileId: s.organizationId,
    sourceId: first.source_id,
  });
  expect(status.status).toBe("needs_upload");
  const analysis = await s.assistant.query(internal.assistant.requestAnalysis, {
    profileId: s.organizationId,
    sourceId: first.source_id,
  });
  expect(analysis).toMatchObject({
    status: "approval_required",
    analysis_started: false,
  });
  expect(
    await s.t.run((ctx) => ctx.db.query("reservations").collect()),
  ).toEqual([]);
  expect(await s.t.run((ctx) => ctx.db.query("outbox").collect())).toEqual([]);
  await s.t.run((ctx) =>
    ctx.db.patch(first.source_id, { rightsAttested: false }),
  );
  await expect(
    s.assistant.query(internal.assistant.getJobStatus, {
      profileId: s.organizationId,
      sourceId: first.source_id,
    }),
  ).rejects.toThrow("FORBIDDEN");
});
it("rejects network targets outside existing source policy and fences intake status after replacement or revocation", async () => {
  const s = await setup();
  const grant = await s.owner.mutation(api.assistantGrants.save, {
    ...s.args,
    sources: [],
    scopes: ["links:save", "jobs:read"],
  });
  const args = {
    profileId: s.organizationId,
    url: "https://youtu.be/synthetic",
    title: "Synthetic intake",
    key: "scope-replacement-intake",
    rightsAttested: true as const,
    explicitlyRequested: true as const,
  };
  for (const url of [
    "http://youtu.be/test",
    "https://127.0.0.1/test",
    "https://youtube.com.evil.test/test",
    "https://user:password@youtube.com/test",
    "https://youtube.com:8443/test",
  ])
    await expect(
      s.assistant.mutation(internal.assistant.saveLink, { ...args, url }),
    ).rejects.toThrow("UNSUPPORTED_SOURCE");
  const result = await s.assistant.mutation(internal.assistant.saveLink, args);
  await s.owner.mutation(api.assistantGrants.save, {
    ...s.args,
    sources: [],
    scopes: ["links:save", "jobs:read"],
    expectedVersion: 1,
  });
  await expect(
    s.assistant.query(internal.assistant.getJobStatus, {
      profileId: s.organizationId,
      sourceId: result.source_id,
    }),
  ).rejects.toThrow("FORBIDDEN");
  await s.owner.mutation(api.assistantGrants.revoke, {
    id: grant.id,
    expectedVersion: 2,
  });
  await expect(
    s.assistant.mutation(internal.assistant.saveLink, args),
  ).rejects.toThrow("FORBIDDEN");
});
it("inherits verified identity into HTTP internal calls, checks provider revocation each time and rechecks a concurrent app revocation", async () => {
  const s = await setup();
  const grant = await s.owner.mutation(api.assistantGrants.save, s.args);
  let active = true;
  let returnedSubject = subject;
  let revokeDuringCheck = false;
  const provider = vi.fn(async (url: string, init: RequestInit) => {
    expect(url).toBe(`${issuer}/oauth2/userinfo`);
    expect(init.redirect).toBe("error");
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer synthetic-access-token-0123456789",
    );
    expect(init.body).toBeUndefined();
    if (revokeDuringCheck)
      await s.owner.mutation(api.assistantGrants.revoke, {
        id: grant.id,
        expectedVersion: 1,
      });
    return active
      ? Response.json({ sub: returnedSubject })
      : Response.json({ error: "invalid_token" }, { status: 401 });
  });
  vi.stubGlobal("fetch", provider);
  const request = {
    method: "POST",
    headers: {
      authorization: "Bearer synthetic-access-token-0123456789",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      operation: "fetch",
      args: { profileId: s.organizationId, id: s.sourceId },
    }),
  };
  const first = await s.assistant.fetch("/assistant-tools", request);
  expect(first.status).toBe(200);
  expect(first.headers.get("cache-control")).toBe("no-store");
  expect(await first.json()).toMatchObject({ id: s.sourceId });
  returnedSubject = "user_99999999999999999999999999";
  expect((await s.assistant.fetch("/assistant-tools", request)).status).toBe(
    401,
  );
  returnedSubject = subject;
  active = false;
  expect((await s.assistant.fetch("/assistant-tools", request)).status).toBe(
    401,
  );
  active = true;
  revokeDuringCheck = true;
  expect((await s.assistant.fetch("/assistant-tools", request)).status).toBe(
    403,
  );
  expect(provider).toHaveBeenCalledTimes(4);
  expect((await s.owner.fetch("/assistant-tools", request)).status).toBe(403);
  expect(provider).toHaveBeenCalledTimes(4);
});
it("pages all grant choices with bounded metadata and refuses stale context without overwriting the owner's setup", async () => {
  const s = await setup();
  await s.t.run(async (ctx) => {
    const original = (await ctx.db.get(s.sourceId))!;
    const { _id: _sourceId, _creationTime: _time, ...copy } = original;
    for (let index = 0; index < 40; index++) {
      const id = await ctx.db.insert("sources", {
        ...copy,
        key: `synthetic-page-${index}`,
        canonical: `text:synthetic-page-${index}`,
        title: `Synthetic metadata ${index}`,
        updatedAt: original.updatedAt + index + 1,
      });
      await syncDashboardCard(ctx, "sources", id, await ctx.db.get(id));
    }
  });
  const seen = new Set<string>();
  let cursor: string | null = null;
  for (let page = 0; page < 3; page++) {
    const result: {
      sources: { sourceId: string }[];
      nextCursor: string | null;
    } = await s.owner.query(api.assistantGrants.setup, {
      organizationId: s.organizationId,
      cursor,
    });
    expect(result.sources.length).toBeLessThanOrEqual(20);
    expect(JSON.stringify(result.sources)).not.toContain("PRIVATE transcript");
    for (const source of result.sources) {
      expect(seen.has(source.sourceId)).toBe(false);
      seen.add(source.sourceId);
    }
    cursor = result.nextCursor;
  }
  expect(cursor).toBeNull();
  expect(seen.size).toBe(41);
  const context = await s.owner.mutation(api.librarySpaces.saveSetup, {
    organizationId: s.organizationId,
    expectedVersion: 0,
    focus: ["personal"],
    goal: "Synthetic confirmed goal",
    role: "Project owner",
    interests: ["Testing"],
    connectSpaces: false,
    confirmed: true,
    stage: 2,
  });
  await s.owner.mutation(api.assistantGrants.save, {
    ...s.args,
    scopes: ["knowledge:read", "context:read"],
    contextVersion: context.version,
  });
  expect(
    (await s.assistant.query(internal.assistant.getProfile, {})).profiles[0]
      .context?.goal,
  ).toBe(context.goal);
  await s.owner.mutation(api.librarySpaces.saveSetup, {
    organizationId: s.organizationId,
    expectedVersion: 1,
    focus: ["personal"],
    goal: "Corrected current goal",
    role: "Project owner",
    interests: ["Testing"],
    connectSpaces: false,
    confirmed: true,
    stage: 2,
  });
  const profile = (await s.assistant.query(internal.assistant.getProfile, {}))
    .profiles[0];
  expect(profile.context).toBeUndefined();
  expect(profile.context_changed).toBe(true);
  await expect(
    s.owner.mutation(api.assistantGrants.save, {
      ...s.args,
      expectedVersion: 1,
      scopes: ["context:read"],
      contextVersion: 1,
    }),
  ).rejects.toThrow("STALE_APPROVAL");
});

async function projectSuggestion() {
  const s = await setup();
  const data = await s.t.run(async (ctx) => {
    const now = Date.now();
    const actor = (await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique())!;
    await ctx.db.patch(s.sourceId, {
      state: "ready",
      analysis: {
        summary: "Synthetic",
        insights: [
          {
            id: "point-owned",
            title: "Review",
            claim: "A synthetic owned claim",
            topics: ["Review"],
            evidence: [],
          },
        ],
      },
    });
    const repositoryId = await ctx.db.insert("repositories", {
      organizationId: s.organizationId,
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
      context: "PRIVATE CODE MUST NOT BE DISCLOSED",
      createdAt: now,
      updatedAt: now,
    });
    const topicId = await ctx.db.insert("knowledgeTopics", {
      organizationId: s.organizationId,
      key: "review",
      name: "Review",
      pinned: false,
      version: 1,
      state: "ready",
      createdAt: now,
      updatedAt: now,
    });
    const references = [{ ...s.args.sources[0], insightId: "point-owned" }];
    const output = {
      disposition: "relevant",
      title: "Synthetic project suggestion",
      rationale: "An owned review task",
      problem: "Review a decision",
      approach: "Document it",
      acceptance: ["Reviewable"],
      tests: ["Inspect decision"],
      risks: ["Benefit unmeasured"],
      alternatives: [],
      questions: [],
      references,
      repositoryEvidence: [],
    };
    const evaluationId = await ctx.db.insert("knowledgeEvaluations", {
      organizationId: s.organizationId,
      topicId,
      repositoryId,
      actor: actor._id,
      topicVersion: 1,
      baseSha: "a".repeat(40),
      profileVersion: 1,
      selectionVersion: 0,
      references,
      sourceSetHash: "synthetic",
      key: "synthetic-evaluation",
      state: "ready",
      decision: "relevant",
      output,
      processingVersion: "synthetic",
      covered: 1,
      omitted: true,
      createdAt: now,
      updatedAt: now,
    });
    return { repositoryId, evaluationId, output };
  });
  const repositories = [
    {
      repositoryId: data.repositoryId,
      baseSha: "a".repeat(40),
      profileVersion: 1,
      selectionVersion: 0,
    },
  ];
  const grant = await s.owner.mutation(api.assistantGrants.save, {
    ...s.args,
    repositories,
    scopes: ["context:read", "suggestions:draft"],
  });
  const profile = await s.assistant.query(internal.assistant.getProfile, {
    profileId: s.organizationId,
  });
  const input = {
    profileId: s.organizationId,
    evaluationId: data.evaluationId,
    evaluationHash:
      profile.profiles[0].projects[0].evaluations![0].evaluation_hash,
    grantVersion: grant.version,
    explicitlyRequested: true as const,
  };
  return { ...s, ...data, repositories, input, profile, grant };
}
it("shares only selected current project context and reuses private cited drafts without overwriting edits or granting publication", async () => {
  const s = await projectSuggestion();
  expect(JSON.stringify(s.profile)).not.toContain("PRIVATE CODE");
  expect(s.profile.profiles[0].projects[0]).toMatchObject({
    context: "purpose: review synthetic ideas",
    selection_version: 0,
  });
  expect(
    (await s.assistant.query(internal.assistant.getProfile, {})).profiles[0]
      .projects,
  ).toEqual([]);
  const first = await s.assistant.mutation(
    internal.assistant.draftProjectSuggestion,
    s.input,
  );
  expect(first).toMatchObject({
    draft_created: true,
    publication_started: false,
    coding_started: false,
    status: "draft",
  });
  const draft = (await s.t.run((ctx) => ctx.db.get(first.draft_id!)))!;
  expect(draft.body).toContain(`/library/${s.sourceId}`);
  expect(draft.body).toContain("Benefit and effort remain hypotheses");
  await s.t.run((ctx) =>
    ctx.db.patch(draft._id, {
      title: "My manual correction",
      body: "My private manual body",
      version: 2,
    }),
  );
  const replay = await s.assistant.mutation(
    internal.assistant.draftProjectSuggestion,
    s.input,
  );
  expect(replay).toMatchObject({ draft_id: draft._id, draft_created: false });
  expect((await s.t.run((ctx) => ctx.db.get(draft._id)))!.body).toBe(
    "My private manual body",
  );
  for (const table of ["issueAttempts", "reservations", "runs"] as const)
    expect(await s.t.run((ctx) => ctx.db.query(table).collect())).toEqual([]);
});
it("requires exact current evaluation, project, grant and all selected evidence for assistant project drafts", async () => {
  const s = await projectSuggestion();
  await expect(
    s.assistant.mutation(internal.assistant.draftProjectSuggestion, {
      ...s.input,
      evaluationHash: "b".repeat(64),
    }),
  ).rejects.toThrow("APPROVAL_STALE");
  await expect(
    s.assistant.mutation(internal.assistant.draftProjectSuggestion, {
      ...s.input,
      grantVersion: 2,
    }),
  ).rejects.toThrow("APPROVAL_STALE");
  await s.t.run((ctx) => ctx.db.patch(s.repositoryId, { profileVersion: 2 }));
  await expect(
    s.assistant.mutation(internal.assistant.draftProjectSuggestion, s.input),
  ).rejects.toThrow("APPROVAL_STALE");
  expect(
    (
      await s.assistant.query(internal.assistant.getProfile, {
        profileId: s.organizationId,
      })
    ).profiles[0].projects[0],
  ).toMatchObject({ context_changed: true });
  await s.t.run((ctx) => ctx.db.patch(s.repositoryId, { profileVersion: 1 }));
  await s.t.run((ctx) => ctx.db.patch(s.sourceId, { rightsAttested: false }));
  await expect(
    s.assistant.mutation(internal.assistant.draftProjectSuggestion, s.input),
  ).rejects.toThrow("APPROVAL_STALE");
  expect(await s.t.run((ctx) => ctx.db.query("issueDrafts").collect())).toEqual(
    [],
  );
});
it("keeps non-fit judgments distinct and denies unselected context or a revoked project grant", async () => {
  const s = await projectSuggestion();
  for (const disposition of [
    "no_fit",
    "already_implemented",
    "unsupported_claim",
    "needs_context",
    "defer",
  ]) {
    await s.t.run((ctx) =>
      ctx.db.patch(s.evaluationId, { output: { ...s.output, disposition } }),
    );
    const current = await s.assistant.query(internal.assistant.getProfile, {
      profileId: s.organizationId,
    });
    const result = await s.assistant.mutation(
      internal.assistant.draftProjectSuggestion,
      {
        ...s.input,
        evaluationHash:
          current.profiles[0].projects[0].evaluations![0].evaluation_hash,
      },
    );
    expect(result).toMatchObject({ status: disposition, draft_created: false });
  }
  expect(await s.t.run((ctx) => ctx.db.query("issueDrafts").collect())).toEqual(
    [],
  );
  await expect(
    s.owner.mutation(api.assistantGrants.save, {
      ...s.args,
      expectedVersion: 1,
      repositories: s.repositories,
      scopes: ["suggestions:draft"],
    }),
  ).rejects.toThrow("INVALID_INPUT");
  await expect(
    s.owner.mutation(api.assistantGrants.save, {
      ...s.args,
      expectedVersion: 1,
      repositories: [{ ...s.repositories[0], baseSha: "b".repeat(40) }],
      scopes: ["context:read"],
    }),
  ).rejects.toThrow("STALE_APPROVAL");
  await s.owner.mutation(api.assistantGrants.revoke, {
    id: s.grant.id,
    expectedVersion: 1,
  });
  await expect(
    s.assistant.query(internal.assistant.getProfile, {
      profileId: s.organizationId,
    }),
  ).rejects.toThrow("FORBIDDEN");
});

it("pages project choices independently and rejects foreign or duplicate project bindings without broadening source approval", async () => {
  const s = await projectSuggestion();
  const foreign = await s.owner.mutation(api.organizations.create, {
    name: "Other owned workspace",
  });
  await s.t.run(async (ctx) => {
    const existing = (await ctx.db.get(s.repositoryId))!;
    const { _id, _creationTime, ...record } = existing;
    for (let n = 0; n < 22; n++)
      await ctx.db.insert("repositories", {
        ...record,
        providerId: 100 + n,
        fullName: `owned/other-${n}`,
      });
    await ctx.db.patch(s.repositoryId, { organizationId: foreign });
  });
  const first = await s.owner.query(api.assistantGrants.projectChoices, {
    organizationId: s.organizationId,
  });
  const second = await s.owner.query(api.assistantGrants.projectChoices, {
    organizationId: s.organizationId,
    cursor: first.repositoryNextCursor,
  });
  expect(first.repositories.length + second.repositories.length).toBe(22);
  expect(
    first.repositories.some((r) => r.repositoryId === s.repositoryId),
  ).toBe(false);
  await expect(
    s.owner.mutation(api.assistantGrants.save, {
      ...s.args,
      expectedVersion: 1,
      repositories: s.repositories,
      scopes: ["context:read"],
    }),
  ).rejects.toThrow("STALE_APPROVAL");
  await s.t.run((ctx) =>
    ctx.db.patch(s.repositoryId, { organizationId: s.organizationId }),
  );
  await expect(
    s.owner.mutation(api.assistantGrants.save, {
      ...s.args,
      expectedVersion: 1,
      repositories: [...s.repositories, ...s.repositories],
      scopes: ["context:read"],
    }),
  ).rejects.toThrow("INVALID_INPUT");
  await s.owner.mutation(api.assistantGrants.save, {
    ...s.args,
    expectedVersion: 1,
    sources: [],
    repositories: s.repositories,
    scopes: ["context:read", "links:save"],
  });
  expect(
    (
      await s.assistant.query(internal.assistant.getProfile, {
        profileId: s.organizationId,
      })
    ).profiles[0].projects[0].evaluations,
  ).toEqual([]);
});

it("preserves owner/admin drafting authority when current membership loses that role", async () => {
  const s = await projectSuggestion();
  await s.t.run(async (ctx) => {
    const actor = (await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique())!;
    const member = (await ctx.db
      .query("memberships")
      .withIndex("by_pair", (q) =>
        q.eq("organizationId", s.organizationId).eq("userId", actor._id),
      )
      .unique())!;
    await ctx.db.patch(member._id, { role: "member" });
  });
  await expect(
    s.assistant.mutation(internal.assistant.draftProjectSuggestion, s.input),
  ).rejects.toThrow("FORBIDDEN");
  expect(await s.t.run((ctx) => ctx.db.query("issueDrafts").collect())).toEqual(
    [],
  );
});

it("withholds derived evaluation metadata from a context-only grant or OAuth scope", async () => {
  const s = await projectSuggestion();
  const contextOnly = s.t.withIdentity({
    subject,
    issuer,
    client_id: clientId,
    scope: "context:read",
    sid: "app_consent_01234567890123456789012345",
  });
  expect(
    (
      await contextOnly.query(internal.assistant.getProfile, {
        profileId: s.organizationId,
      })
    ).profiles[0].projects[0].evaluations,
  ).toEqual([]);
  await s.owner.mutation(api.assistantGrants.save, {
    ...s.args,
    expectedVersion: 1,
    repositories: s.repositories,
    scopes: ["context:read"],
  });
  const profile = await s.assistant.query(internal.assistant.getProfile, {
    profileId: s.organizationId,
  });
  expect(profile.profiles[0].projects[0].context).toBe(
    "purpose: review synthetic ideas",
  );
  expect(profile.profiles[0].projects[0].evaluations).toEqual([]);
});
