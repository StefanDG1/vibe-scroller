import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { syncDashboardCard } from "../convex/lib/dashboardProjection";
const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => vi.unstubAllEnvs());
it("withholds browsing counts until atomic metadata is complete and never falls back to an unprojected source", async () => {
  const s = await setup();
  await s.t.run(async (ctx) => {
    const migration = (await ctx.db.query("dashboardMigrations").first())!;
    await ctx.db.patch(migration._id, { complete: false });
  });
  let list = await s.owner.query(api.knowledgeExplore.topics, {
    organizationId: s.args.organizationId,
  });
  expect(list.items).toEqual([]);
  expect(list.coverage).toContain("metadata is updating");
  await s.t.run(async (ctx) => {
    const migration = (await ctx.db.query("dashboardMigrations").first())!;
    await ctx.db.patch(migration._id, { complete: true });
    const card = (await ctx.db
      .query("dashboardCards")
      .withIndex("by_entity", (q) => q.eq("entityId", s.personal.sourceId))
      .unique())!;
    await ctx.db.delete(card._id);
  });
  list = await s.owner.query(api.knowledgeExplore.topics, {
    organizationId: s.args.organizationId,
  });
  expect(list.items).toEqual([]);
  expect(
    (await s.owner.query(api.knowledgeExplore.detail, s.args)).members,
  ).toHaveLength(1);
});
async function setup() {
  vi.stubEnv("DISABLE_KNOWLEDGE", "true");
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  for (const subject of ["explore-owner", "explore-other"])
    await t.mutation(internal.accounts.syncUser, {
      subject,
      email: `${subject}@example.test`,
      name: "Synthetic explorer",
    });
  const owner = t.withIdentity({ subject: "explore-owner" }),
    other = t.withIdentity({ subject: "explore-other" });
  const organizationId = await owner.mutation(
    api.organizations.createPrivate,
    {},
  );
  await t.run((ctx) =>
    ctx.db.insert("dashboardMigrations", {
      name: "dashboard-v1",
      table: 4,
      cursor: null,
      complete: true,
      updatedAt: 1,
    }),
  );
  const actor = (await t.run((ctx) =>
    ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", "explore-owner"))
      .unique(),
  ))!;
  const topicId = await t.run((ctx) =>
    ctx.db.insert("knowledgeTopics", {
      organizationId,
      key: "synthetic-review",
      name: "Synthetic review",
      pinned: false,
      version: 1,
      state: "ready",
      createdAt: 1,
      updatedAt: 1,
    }),
  );
  async function source(
    key: string,
    space: "personal" | "business",
    generation = 1,
  ) {
    const sourceId = await t.run((ctx) =>
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
        generation,
        createdAt: 1,
        updatedAt: 2,
        analysis: {
          summary: "Synthetic only",
          insights: [
            {
              id: key,
              claim: `Synthetic ${key}`,
              evidence: [{ kind: "user_note", startMs: null, endMs: null }],
            },
          ],
        },
      }),
    );
    await t.run(async (ctx) => {
      await syncDashboardCard(
        ctx,
        "sources",
        sourceId,
        (await ctx.db.get(sourceId))!,
      );
    });
    await owner.mutation(api.librarySpaces.fileSource, {
      organizationId,
      sourceId,
      spaces: [space],
    });
    const reference = { sourceId, generation, revision: 2, insightId: key };
    await t.run((ctx) =>
      ctx.db.insert("knowledgeMembers", {
        organizationId,
        topicId,
        ...reference,
        excluded: false,
        manual: false,
        createdAt: 1,
        updatedAt: 1,
      }),
    );
    return reference;
  }
  const personal = await source("personal-fixture", "personal"),
    business = await source("business-fixture", "business");
  await t.run((ctx) =>
    ctx.db.insert("knowledgeJobs", {
      organizationId,
      topicId,
      actor: actor._id,
      version: 1,
      policyVersion: 1,
      cursor: null,
      next: null,
      done: true,
      state: "ready",
      key: "synthetic-explore-job",
      references: [personal, business],
      processingVersion: "synthetic",
      createdAt: 1,
      updatedAt: 1,
      output: {
        relations: [
          {
            kind: "complementary",
            explanation: "Mixed fixture relation",
            references: [business, personal],
          },
        ],
      },
    }),
  );
  const args = { organizationId, topicId };
  async function connect(value: boolean, expectedVersion = 0) {
    return owner.mutation(api.librarySpaces.saveSetup, {
      organizationId,
      expectedVersion,
      focus: ["personal", "business"],
      goal: "",
      interests: [],
      role: "",
      connectSpaces: value,
      confirmed: true,
      stage: 2,
    });
  }
  return { t, owner, other, args, source, personal, business, actor, connect };
}
it("filters private counts, evidence and entire mixed summaries on the server without reserving work", async () => {
  const s = await setup();
  const topics = await s.owner.query(api.knowledgeExplore.topics, {
    organizationId: s.args.organizationId,
  });
  expect(topics.scope).toBe("personal");
  expect(topics.items).toEqual([
    expect.objectContaining({ ideas: 1, posts: 1 }),
  ]);
  const detail = await s.owner.query(api.knowledgeExplore.detail, {
    ...s.args,
    scope: "personal",
  });
  expect(detail.members.map((m) => m.evidence.reference.sourceId)).toEqual([
    s.personal.sourceId,
  ]);
  expect(detail.summaries).toEqual([]);
  await expect(
    s.owner.query(api.knowledgeExplore.detail, {
      ...s.args,
      scope: "workspace",
    }),
  ).rejects.toThrow("FORBIDDEN");
  await expect(
    s.owner.query(api.knowledgeExplore.detail, {
      ...s.args,
      scope: "connected",
    }),
  ).rejects.toThrow("FORBIDDEN");
  expect(
    await s.t.run((ctx) => ctx.db.query("reservations").collect()),
  ).toEqual([]);
  expect(await s.t.run((ctx) => ctx.db.query("outbox").collect())).toEqual([]);
});
it("reuses exact summaries only after confirmation and denies them again on disconnect, correction or loss of rights", async () => {
  const s = await setup();
  await s.connect(true);
  const args = { ...s.args, scope: "connected" as const };
  expect(
    (await s.owner.query(api.knowledgeExplore.detail, args)).summaries,
  ).toHaveLength(1);
  await s.connect(false, 1);
  await expect(
    s.owner.query(api.knowledgeExplore.detail, args),
  ).rejects.toThrow("FORBIDDEN");
  await s.connect(true, 2);
  await s.t.run((ctx) =>
    ctx.db.patch(s.business.sourceId, { rightsAttested: false }),
  );
  let detail = await s.owner.query(api.knowledgeExplore.detail, args);
  expect(detail.summaries).toEqual([]);
  expect(detail.members).toHaveLength(1);
  await s.t.run((ctx) => ctx.db.patch(s.personal.sourceId, { generation: 2 }));
  detail = await s.owner.query(api.knowledgeExplore.detail, args);
  await s.t.run(async (ctx) => {
    await syncDashboardCard(
      ctx,
      "sources",
      s.personal.sourceId,
      (await ctx.db.get(s.personal.sourceId))!,
    );
    await syncDashboardCard(
      ctx,
      "sources",
      s.business.sourceId,
      (await ctx.db.get(s.business.sourceId))!,
    );
  });
  expect(detail.topic).toBeNull();
  expect(detail.members).toEqual([]);
  expect(
    (
      await s.owner.query(api.knowledgeExplore.topics, {
        organizationId: s.args.organizationId,
        scope: "connected",
      })
    ).items,
  ).toEqual([]);
});
it("rejects foreign readers and recovery before returning private names or outcomes", async () => {
  const s = await setup();
  for (const operation of [
    api.knowledgeExplore.topics,
    api.knowledgeExplore.helped,
  ])
    await expect(
      s.other.query(operation, { organizationId: s.args.organizationId }),
    ).rejects.toThrow();
  for (const operation of [
    api.knowledgeExplore.detail,
    api.knowledgeExplore.journey,
  ])
    await expect(s.other.query(operation, s.args)).rejects.toThrow();
  vi.stubEnv("RESTORE_LOCK", "true");
  await expect(
    s.owner.query(api.knowledgeExplore.topics, {
      organizationId: s.args.organizationId,
    }),
  ).rejects.toThrow("Recovery");
});
it("bounds one branch, preserves its next page and never claims aggregate counts as corpus coverage", async () => {
  const s = await setup();
  for (let n = 0; n < 23; n++) await s.source(`bounded-${n}`, "personal");
  const first = await s.owner.query(api.knowledgeExplore.detail, {
    ...s.args,
    scope: "personal",
  });
  expect(first.members.length).toBeLessThanOrEqual(20);
  expect(first.next).not.toBeNull();
  const second = await s.owner.query(api.knowledgeExplore.detail, {
    ...s.args,
    scope: "personal",
    cursor: first.next!,
  });
  expect(first.members.length + second.members.length).toBe(24);
  expect(second.next).toBeNull();
  const list = await s.owner.query(api.knowledgeExplore.topics, {
    organizationId: s.args.organizationId,
  });
  expect(list.items[0].ideas).toBeLessThanOrEqual(20);
  expect(list.items[0].moreEvidence).toBe(true);
  expect(list.coverage).toContain("not whole-library totals");
});
it("does not invent evaluations, project actions or benefits from a saved topic", async () => {
  const s = await setup();
  expect(
    (await s.owner.query(api.knowledgeExplore.journey, s.args)).items,
  ).toEqual([]);
  expect(
    (
      await s.owner.query(api.knowledgeExplore.helped, {
        organizationId: s.args.organizationId,
      })
    ).items,
  ).toEqual([]);
});
it("keeps manual hierarchy and aliases independent from analysis, rejects cycles and stale edits, and backfills search without overwriting corrections", async () => {
  const s = await setup();
  const child = await s.t.run((ctx) =>
    ctx.db.insert("knowledgeTopics", {
      organizationId: s.args.organizationId,
      key: "child",
      name: "Child",
      pinned: false,
      version: 7,
      state: "ready",
      createdAt: 1,
      updatedAt: 1,
    }),
  );
  await s.owner.mutation(api.knowledgeExplore.organize, {
    topicId: child,
    layoutVersion: 0,
    parentId: s.args.topicId,
    aliases: ["First useful result"],
  });
  const topic = (await s.t.run((ctx) => ctx.db.get(child)))!;
  expect(topic).toMatchObject({
    version: 7,
    state: "ready",
    layoutVersion: 1,
    parentId: s.args.topicId,
    searchText: "Child First useful result",
  });
  await expect(
    s.owner.mutation(api.knowledgeExplore.organize, {
      topicId: s.args.topicId,
      layoutVersion: 0,
      parentId: child,
      aliases: [],
    }),
  ).rejects.toThrow("INVALID_INPUT");
  await expect(
    s.owner.mutation(api.knowledgeExplore.organize, {
      topicId: child,
      layoutVersion: 0,
      parentId: null,
      aliases: [],
    }),
  ).rejects.toThrow("APPROVAL_STALE");
  await expect(
    s.other.mutation(api.knowledgeExplore.organize, {
      topicId: child,
      layoutVersion: 1,
      parentId: null,
      aliases: [],
    }),
  ).rejects.toThrow();
  await s.t.mutation(internal.knowledgeExplore.backfillSearch, {});
  expect(await s.t.run((ctx) => ctx.db.get(child))).toEqual(topic);
  await s.owner.mutation(api.knowledgeExplore.organize, {
    topicId: s.args.topicId,
    layoutVersion: 0,
    aliases: ["Remembering advice"],
  });
  const matches = await s.owner.query(api.knowledgeExplore.topics, {
    organizationId: s.args.organizationId,
    search: "Remembering",
  });
  expect(matches.items.map((t) => t.id)).toEqual([s.args.topicId]);
  expect(
    await s.t.run((ctx) => ctx.db.query("reservations").collect()),
  ).toEqual([]);
});

it("persists idempotent authored hierarchy without paid work, preserves corrections and scopes ancestors through current leaves", async () => {
  const s = await setup();
  await s.t.run((ctx) =>
    ctx.db.patch(s.args.topicId, { name: "Interface design" }),
  );
  const args = {
    organizationId: s.args.organizationId,
    topicIds: [s.args.topicId],
  };
  const beforeJobs = await s.t.run((ctx) =>
    ctx.db.query("knowledgeJobs").collect(),
  );
  expect(
    await s.owner.mutation(api.knowledgeExplore.autoOrganize, args),
  ).toEqual({ changed: 1 });
  expect(
    await s.owner.mutation(api.knowledgeExplore.autoOrganize, args),
  ).toEqual({ changed: 0 });
  const listed = await s.owner.query(api.knowledgeExplore.topics, {
    organizationId: args.organizationId,
  });
  const categories = listed.items.filter(
    (t) => "autoCategory" in t && t.autoCategory,
  );
  expect(categories.map((t) => t.name).sort()).toEqual(["Business", "Product"]);
  expect(categories.every((t) => t.ideas === 0 && t.posts === 0)).toBe(true);
  const leaf = listed.items.find((t) => t.id === s.args.topicId)!;
  expect(leaf.ideas).toBe(1);
  expect(leaf.parentId).toBe(categories.find((t) => t.name === "Product")!.id);
  expect(
    await s.t.run((ctx) => ctx.db.query("reservations").collect()),
  ).toEqual([]);
  expect(
    await s.t.run((ctx) => ctx.db.query("knowledgeJobs").collect()),
  ).toEqual(beforeJobs);
  await s.owner.mutation(api.knowledgeExplore.organize, {
    topicId: s.args.topicId,
    parentId: null,
    aliases: [],
    layoutVersion: leaf.layoutVersion,
  });
  expect(
    await s.owner.mutation(api.knowledgeExplore.autoOrganize, args),
  ).toEqual({ changed: 0 });
  const corrected = await s.owner.query(api.knowledgeExplore.topics, {
    organizationId: args.organizationId,
  });
  expect(corrected.items).toHaveLength(1);
  expect(corrected.items[0].parentId).toBeUndefined();
  await expect(
    s.other.mutation(api.knowledgeExplore.autoOrganize, args),
  ).rejects.toThrow();
});
it("hides authored ancestors when every descendant loses current source rights and blocks cross-tenant category writes", async () => {
  const s = await setup();
  await s.t.run((ctx) =>
    ctx.db.patch(s.args.topicId, { name: "AI workflows" }),
  );
  await s.owner.mutation(api.knowledgeExplore.autoOrganize, {
    organizationId: s.args.organizationId,
    topicIds: [s.args.topicId],
  });
  expect(
    (
      await s.owner.query(api.knowledgeExplore.topics, {
        organizationId: s.args.organizationId,
      })
    ).items.length,
  ).toBeGreaterThan(1);
  await s.t.run(async (ctx) => {
    for (const sourceId of [s.personal.sourceId, s.business.sourceId]) {
      await ctx.db.patch(sourceId, { rightsAttested: false });
      await syncDashboardCard(
        ctx,
        "sources",
        sourceId,
        (await ctx.db.get(sourceId))!,
      );
    }
  });
  expect(
    (
      await s.owner.query(api.knowledgeExplore.topics, {
        organizationId: s.args.organizationId,
      })
    ).items,
  ).toEqual([]);
  const foreign = await s.other.mutation(api.organizations.createPrivate, {});
  await expect(
    s.other.mutation(api.knowledgeExplore.autoOrganize, {
      organizationId: foreign,
      topicIds: [s.args.topicId],
    }),
  ).rejects.toThrow("FORBIDDEN");
});

it("projects existing titles and icons only through current permitted insight evidence", async () => {
  const s = await setup();
  await s.t.run(async (ctx) => {
    const source = (await ctx.db.get(s.personal.sourceId))!;
    await ctx.db.patch(source._id, {
      analysis: {
        ...source.analysis,
        insights: source.analysis.insights.map((insight: any) => ({
          ...insight,
          title: "Review source evidence",
          icon: "shield",
        })),
      },
    });
  });
  const detail = await s.owner.query(api.knowledgeExplore.detail, {
    ...s.args,
    scope: "personal",
  });
  expect(detail.members).toHaveLength(1);
  expect(detail.members[0].evidence.insight).toMatchObject({
    title: "Review source evidence",
    icon: "shield",
    claim: "Synthetic personal-fixture",
  });
  await expect(
    s.other.query(api.knowledgeExplore.detail, s.args),
  ).rejects.toThrow();
});
