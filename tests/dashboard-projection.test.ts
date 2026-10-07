import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

async function setup(count = 1) {
  vi.useFakeTimers();
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  const actor = await t.mutation(internal.accounts.syncUser, {
    subject: "dashboard-owner",
    email: "owner@example.test",
    name: "Synthetic owner",
  });
  const foreignId = await t.mutation(internal.accounts.syncUser, {
    subject: "foreign",
    email: "foreign@example.test",
    name: "Synthetic foreign",
  });
  const owner = t.withIdentity({ subject: "dashboard-owner" });
  const foreign = t.withIdentity({ subject: "foreign" });
  const organizationId = await owner.mutation(
    api.organizations.createPrivate,
    {},
  );
  const rows = await t.run(async (ctx) => {
    const base = {
      organizationId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const sources = [];
    for (let i = 0; i < count; i++)
      sources.push(
        await ctx.db.insert("sources", {
          ...base,
          key: `synthetic-${i}`,
          canonical: `synthetic-${i}`,
          title: `Synthetic source ${i}`,
          kind: "text",
          text: "PRIVATE_TRANSCRIPT".repeat(1000),
          state: "ready",
          coverage: "caption_only",
          tags: [],
          generation: 1,
          rightsAttested: true,
          analysis: {
            insights: [
              {
                id: "point",
                title: "Synthetic idea",
                body: "PRIVATE_INSIGHT_BODY",
              },
            ],
          },
        }),
      );
    const repo = await ctx.db.insert("repositories", {
      ...base,
      installationId: 1,
      providerId: 1,
      fullName: "synthetic/project",
      sha: "a".repeat(40),
      branch: "main",
      enabled: true,
      confirmed: true,
      profile: "PRIVATE_PROFILE",
      profileVersion: 1,
      context: "PRIVATE_CODE",
      manifest: [],
      status: "ready",
    });
    const proposal = await ctx.db.insert("proposals", {
      ...base,
      sourceId: sources[0],
      repositoryId: repo,
      baseSha: "a".repeat(40),
      profileVersion: 1,
      title: "Synthetic proposal",
      disposition: "useful",
      review: "unreviewed",
      version: 1,
      detail: { private: "PRIVATE_DETAIL" },
      references: [
        {
          sourceId: sources[0],
          generation: 1,
          revision: base.updatedAt,
          insightId: "point",
        },
      ],
    });
    await ctx.db.insert("proposals", {
      ...base,
      sourceId: sources[0],
      repositoryId: repo,
      baseSha: "a".repeat(40),
      profileVersion: 1,
      title: "Synthetic legacy idea",
      disposition: "useful",
      review: "unreviewed",
      version: 1,
      detail: {},
    });
    return { sources, repo, proposal };
  });
  async function migrate() {
    await t.mutation(internal.dashboard.backfill, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);
  }
  return {
    t,
    owner,
    foreign,
    actor,
    foreignId,
    organizationId,
    ...rows,
    migrate,
  };
}
it("backfills ten original records per transaction, resumes and returns bounded metadata without private payloads", async () => {
  const s = await setup(35);
  expect(
    await s.owner.query(api.dashboard.home, {
      organizationId: s.organizationId,
    }),
  ).toEqual({ ready: false });
  const first = await s.t.mutation(internal.dashboard.backfill, {});
  expect(first.processed).toBe(10);
  expect(
    await s.t.run((ctx) => ctx.db.query("dashboardCards").collect()),
  ).toHaveLength(10);
  await s.t.finishAllScheduledFunctions(vi.runAllTimers);
  const home = await s.owner.query(api.dashboard.home, {
    organizationId: s.organizationId,
  });
  expect(home.ready).toBe(true);
  if (!home.ready) throw new Error("Backfill incomplete");
  expect(home.sources).toHaveLength(30);
  expect(home.libraryNext).toBe("more");
  expect(home.proposals).toHaveLength(1);
  expect(JSON.stringify(home)).not.toContain("PRIVATE_");
  expect(
    JSON.stringify(
      await s.t.run((ctx) => ctx.db.query("dashboardCards").collect()),
    ),
  ).not.toContain("PRIVATE_");
  expect((await s.t.run((ctx) => ctx.db.get(s.sources[0])))?.text).toContain(
    "PRIVATE_TRANSCRIPT",
  );
  expect(await s.t.mutation(internal.dashboard.backfill, {})).toEqual({
    complete: true,
  });
});
it("atomically fences a proposal when an existing source mutation changes its revision and deletes its card on redaction", async () => {
  const s = await setup();
  await s.migrate();
  await s.owner.mutation(api.product.editSource, {
    id: s.sources[0],
    summary: "A manual correction",
    tags: [],
  });
  const home = await s.owner.query(api.dashboard.home, {
    organizationId: s.organizationId,
  });
  expect(home.ready && home.proposals).toEqual([]);
  const source = await s.t.run((ctx) => ctx.db.get(s.sources[0]));
  const card = await s.t.run((ctx) =>
    ctx.db
      .query("dashboardCards")
      .withIndex("by_entity", (q) => q.eq("entityId", s.sources[0]))
      .unique(),
  );
  expect(card?.updatedAt).toBe(source?.updatedAt);
  expect(source?.updatedAt).toBeGreaterThan(Date.now());
  await expect(
    s.owner.query(api.product.proposal, { id: s.proposal }),
  ).rejects.toThrow("evidence unavailable");
  await s.owner.mutation(api.product.deleteSource, { id: s.sources[0] });
  expect(
    await s.t.run((ctx) =>
      ctx.db
        .query("dashboardCards")
        .withIndex("by_entity", (q) => q.eq("entityId", s.sources[0]))
        .unique(),
    ),
  ).toBeNull();
  const after = await s.owner.query(api.dashboard.home, {
    organizationId: s.organizationId,
  });
  expect(after.ready && after.sources).toEqual([]);
});
it("rejects foreign/private-owner mismatches, membership revocation and restore locks on every compact read", async () => {
  const s = await setup();
  await s.migrate();
  await s.t.run((ctx) =>
    ctx.db.insert("memberships", {
      organizationId: s.organizationId,
      userId: s.foreignId,
      role: "owner",
    }),
  );
  await expect(
    s.foreign.query(api.dashboard.home, { organizationId: s.organizationId }),
  ).rejects.toThrow("unavailable");
  await s.t.run(async (ctx) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_pair", (q) =>
        q.eq("organizationId", s.organizationId).eq("userId", s.actor),
      )
      .unique();
    await ctx.db.delete(membership!._id);
  });
  await expect(
    s.owner.query(api.dashboard.home, { organizationId: s.organizationId }),
  ).rejects.toThrow("unavailable");
  vi.stubEnv("RESTORE_LOCK", "true");
  await expect(
    s.owner.query(api.dashboard.home, { organizationId: s.organizationId }),
  ).rejects.toThrow("Recovery");
  await expect(s.t.mutation(internal.dashboard.backfill, {})).rejects.toThrow(
    "Recovery",
  );
});
