import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { repositoryContent } from "../convex/lib/repositoryContent";
import { storageUsage, insertAsset } from "../convex/lib/storageUsage";
const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
async function setup() {
  const t = convexTest(schema, modules);
  const user = await t.mutation(internal.accounts.syncUser, {
    subject: "usage-owner",
    email: "usage@example.test",
    name: "Usage",
    verified: true,
  });
  const a = t.withIdentity({ subject: "usage-owner" });
  const org = await a.mutation(api.organizations.create, {
    name: "Usage test",
  });
  return { t, a, org, user };
}
it("checks provider freshness without writing and denies deleted or locked identities", async () => {
  vi.useFakeTimers();
  const s = await setup();
  expect(await s.a.query(api.accounts.bootstrapRequired, {})).toBe(false);
  const before = await s.t.run((ctx) => ctx.db.get(s.user));
  await s.a.query(api.accounts.bootstrapRequired, {});
  expect(await s.t.run((ctx) => ctx.db.get(s.user))).toEqual(before);
  vi.advanceTimersByTime(15 * 60000 + 1);
  expect(await s.a.query(api.accounts.bootstrapRequired, {})).toBe(true);
  await s.t.run((ctx) => ctx.db.patch(s.user, { status: "deleting" }));
  await expect(s.a.query(api.accounts.bootstrapRequired, {})).rejects.toThrow();
  vi.stubEnv("RESTORE_LOCK", "true");
  await expect(s.a.query(api.accounts.bootstrapRequired, {})).rejects.toThrow();
});
it("moves legacy repository bytes without changing versions, evidence locations or cache reuse", async () => {
  const s = await setup();
  const context = "Synthetic code evidence\n".repeat(12000);
  const id = await s.t.run((ctx) =>
    ctx.db.insert("repositories", {
      organizationId: s.org,
      installationId: 1,
      providerId: 1,
      fullName: "synthetic/repo",
      branch: "main",
      sha: "a".repeat(40),
      enabled: true,
      profile: "Synthetic",
      profileVersion: 3,
      confirmed: true,
      manifest: ["README.md"],
      context,
      contextExcerpts: [
        {
          path: "README.md",
          startLine: 1,
          endLine: 3,
          content: "Synthetic excerpt",
          blobSha: "b".repeat(40),
        },
      ],
      status: "connected",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
  const before = await s.t.run((ctx) => ctx.db.get(id));
  await s.t.mutation(internal.usageMaintenance.compactRepositories, {});
  const meta = (await s.t.run((ctx) => ctx.db.get(id)))!;
  expect(JSON.stringify(meta).length).toBeLessThan(
    JSON.stringify(before).length / 100,
  );
  expect(meta).toMatchObject({
    context: "",
    profileVersion: 3,
    confirmed: true,
    updatedAt: before!.updatedAt,
    contextEvidence: [{ path: "README.md", startLine: 1, endLine: 3 }],
  });
  expect((await s.t.run((ctx) => repositoryContent(ctx, meta)))?.context).toBe(
    context,
  );
  expect(
    (
      await s.t.query(internal.jobs.previousSnapshot, {
        organizationId: s.org,
        providerId: 1,
      })
    )?.contextExcerpts,
  ).toEqual(before!.contextExcerpts);
  await s.t.mutation(internal.usageMaintenance.compactRepositories, {});
  expect(
    await s.t.run((ctx) => ctx.db.query("repositoryContent").collect()),
  ).toHaveLength(1);
  await s.a.mutation(api.jobs.revoke, {
    organizationId: s.org,
    provider: "github",
  });
  expect(
    await s.t.run((ctx) => ctx.db.query("repositoryContent").collect()),
  ).toHaveLength(0);
  expect(
    (await s.t.run(async (ctx) => repositoryContent(ctx, await ctx.db.get(id))))
      ?.context,
  ).toBe("");
});
it("initializes legacy stored bytes once and releases capacity only once after deletion", async () => {
  const s = await setup();
  const asset = {
    organizationId: s.org,
    key: `${s.org}/legacy`,
    size: 100,
    type: "image/jpeg",
    state: "complete",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await s.t.run((ctx) => ctx.db.insert("assets", asset));
  const next = await s.t.run((ctx) =>
    insertAsset(ctx, {
      ...asset,
      key: `${s.org}/next`,
      size: 200,
      expiresAt: Date.now() - 1,
    }),
  );
  expect((await s.t.run((ctx) => storageUsage(ctx, s.org))).bytes).toBe(300);
  await s.t.mutation(internal.assets.deleteReceipt, { key: `${s.org}/next` });
  await s.t.mutation(internal.assets.deleteReceipt, { key: `${s.org}/next` });
  expect(await s.t.run((ctx) => ctx.db.get(next))).toBeNull();
  expect((await s.t.run((ctx) => storageUsage(ctx, s.org))).bytes).toBe(100);
});
it("reuses a retried evidence upload without allocating more storage", async () => {
  const s = await setup();
  const sourceId = await s.t.run((ctx) =>
    ctx.db.insert("sources", {
      organizationId: s.org,
      key: "source",
      canonical: "source",
      title: "Synthetic",
      kind: "text",
      coverage: "caption_only",
      state: "ready",
      tags: [],
      rightsAttested: true,
      generation: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
  const args = {
    sourceId,
    generation: 1,
    key: `${s.org}/frame`,
    size: 500,
    etag: "same",
  };
  const first = await s.t.mutation(internal.assets.registerEvidence, args);
  expect(await s.t.mutation(internal.assets.registerEvidence, args)).toBe(
    first,
  );
  expect((await s.t.run((ctx) => storageUsage(ctx, s.org))).bytes).toBe(500);
  await expect(
    s.t.mutation(internal.assets.registerEvidence, {
      ...args,
      etag: "different",
    }),
  ).rejects.toThrow();
});
it("keeps concurrent evidence uploads inside the storage allowance", async () => {
  vi.useFakeTimers();
  const s = await setup();
  const sourceId = await s.t.run((ctx) =>
    ctx.db.insert("sources", {
      organizationId: s.org,
      key: "quota",
      canonical: "quota",
      title: "Synthetic",
      kind: "text",
      coverage: "caption_only",
      state: "ready",
      tags: [],
      rightsAttested: true,
      generation: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
  await s.t.run((ctx) =>
    insertAsset(ctx, {
      organizationId: s.org,
      key: `${s.org}/large`,
      size: 999999600,
      type: "video/mp4",
      state: "complete",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
  const results = await Promise.all(
    ["first", "second"].map((name) =>
      s.t.mutation(internal.assets.registerEvidence, {
        sourceId,
        generation: 1,
        key: `${s.org}/${name}`,
        size: 300,
        etag: name,
      }),
    ),
  );
  expect(results.filter(Boolean)).toHaveLength(1);
  expect((await s.t.run((ctx) => storageUsage(ctx, s.org))).bytes).toBe(
    999999900,
  );
});
it("does not schedule provider reconciliation actions in an empty or locked deployment", async () => {
  const s = await setup();
  vi.stubEnv("STRIPE_SECRET_KEY", "synthetic-test-key");
  await s.t.mutation(internal.usageMaintenance.reconcileBilling, {});
  await s.t.mutation(internal.usageMaintenance.reconcilePRs, {});
  expect(
    await s.t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect(),
    ),
  ).toHaveLength(0);
  vi.stubEnv("RESTORE_LOCK", "true");
  await s.t.mutation(internal.usageMaintenance.reconcileBilling, {});
  await s.t.mutation(internal.usageMaintenance.reconcilePRs, {});
  expect(
    await s.t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect(),
    ),
  ).toHaveLength(0);
});
it("omits unused overview counts instead of reporting false zero totals", async () => {
  const s = await setup();
  await s.t.run((ctx) =>
    ctx.db.insert("sources", {
      organizationId: s.org,
      key: "overview",
      canonical: "overview",
      title: "Synthetic",
      kind: "text",
      coverage: "caption_only",
      state: "ready",
      tags: [],
      rightsAttested: true,
      generation: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
  expect(
    (await s.a.query(api.product.overview, { organizationId: s.org }))
      .processed,
  ).toBe(1);
  const activity = await s.a.query(api.product.overview, {
    organizationId: s.org,
    includeCounts: false,
  });
  expect(activity).not.toHaveProperty("processed");
  expect(activity).not.toHaveProperty("accepted");
  expect(activity).not.toHaveProperty("pending");
  expect(activity).toMatchObject({ runs: [], notifications: [], measured: 0 });
});
it("expires compacted code while preserving repository authority and versions", async () => {
  const s = await setup();
  const id = await s.t.mutation(internal.jobs.saveRepository, {
    organizationId: s.org,
    installationId: 1,
    providerId: 1,
    fullName: "synthetic/retention",
    branch: "main",
    sha: "a".repeat(40),
    manifest: ["README.md"],
    context: "Temporary code",
    contextExcerpts: [
      {
        path: "README.md",
        startLine: 1,
        endLine: 1,
        content: "Temporary code",
        blobSha: "b".repeat(40),
      },
    ],
  });
  await s.t.run((ctx) =>
    ctx.db.patch(id, { snapshotAt: Date.now() - 2 * 86400000 }),
  );
  const before = (await s.t.run((ctx) => ctx.db.get(id)))!;
  expect(before.contentStored).toBe(true);
  await s.t.mutation(internal.privacy.retentionPage, {
    section: "repositories",
    cursor: null,
  });
  expect(
    await s.t.run((ctx) => ctx.db.query("repositoryContent").collect()),
  ).toHaveLength(0);
  const after = (await s.t.run((ctx) => ctx.db.get(id)))!;
  expect(after).toMatchObject({
    context: "",
    sha: before.sha,
    profileVersion: before.profileVersion,
    updatedAt: before.updatedAt,
  });
});
