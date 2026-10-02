import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => vi.unstubAllEnvs());

async function setup() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  const users = await Promise.all(
    ["owner", "foreign", "viewer"].map((subject) =>
      t.mutation(internal.accounts.syncUser, {
        subject,
        email: `${subject}@example.test`,
        name: "Synthetic tenant test",
      }),
    ),
  );
  const owner = t.withIdentity({
    subject: "owner",
    auth_time: Math.floor(Date.now() / 1000),
  });
  const foreign = t.withIdentity({
    subject: "foreign",
    auth_time: Math.floor(Date.now() / 1000),
  });
  const viewer = t.withIdentity({
    subject: "viewer",
    auth_time: Math.floor(Date.now() / 1000),
  });
  const org = await owner.mutation(api.organizations.create, {
    name: "Synthetic private A",
  });
  const other = await foreign.mutation(api.organizations.create, {
    name: "Synthetic private B",
  });
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.insert("memberships", {
      organizationId: org,
      userId: users[2],
      role: "viewer",
    });
    const base = { organizationId: org, createdAt: now, updatedAt: now };
    const source = await ctx.db.insert("sources", {
      ...base,
      key: "synthetic-tenant-source",
      canonical: "synthetic-tenant-source",
      kind: "text",
      title: "Private source A",
      text: "Private text A",
      state: "ready",
      coverage: "caption_only",
      tags: [],
      rightsAttested: true,
      generation: 1,
    });
    const repo = await ctx.db.insert("repositories", {
      ...base,
      installationId: 1,
      providerId: 1,
      fullName: "synthetic/private-a",
      sha: "a".repeat(40),
      branch: "main",
      enabled: true,
      confirmed: true,
      profile: "Private profile A",
      profileVersion: 1,
      context: "Private repository A",
      manifest: ["README.md"],
      status: "ready",
    });
    const foreignRepo = await ctx.db.insert("repositories", {
      ...base,
      organizationId: other,
      installationId: 2,
      providerId: 2,
      fullName: "synthetic/private-b",
      sha: "a".repeat(40),
      branch: "main",
      enabled: true,
      confirmed: true,
      profile: "Private profile B",
      profileVersion: 1,
      context: "Foreign repository secret",
      manifest: ["README.md"],
      status: "ready",
    });
    const proposal = await ctx.db.insert("proposals", {
      ...base,
      sourceId: source,
      repositoryId: repo,
      baseSha: "a".repeat(40),
      profileVersion: 1,
      disposition: "useful",
      title: "Private proposal A",
      detail: {},
      review: "accepted",
      version: 1,
    });
    const run = await ctx.db.insert("runs", {
      ...base,
      proposalId: proposal,
      repositoryId: repo,
      approvedBy: users[0],
      planHash: "synthetic-plan",
      baseSha: "a".repeat(40),
      version: 1,
      executor: "cloud",
      fundingRoute: "managed_api",
      maxCredits: 0,
      allowedPaths: ["README.md"],
      highRisk: false,
      state: "queued",
      generation: 1,
      expiresAt: now + 60000,
      leaseUntil: 0,
      events: [],
    });
    const asset = await ctx.db.insert("assets", {
      ...base,
      sourceId: source,
      key: "synthetic-frame",
      type: "image/jpeg",
      size: 100,
      state: "complete",
      kind: "frame",
    });
    return { source, repo, foreignRepo, proposal, run, asset };
  });
  const reads = (client: typeof owner) =>
    [
      [
        "library",
        () => client.query(api.product.library, { organizationId: org }),
      ],
      [
        "overview",
        () => client.query(api.product.overview, { organizationId: org }),
      ],
      [
        "repositories",
        () => client.query(api.product.repositories, { organizationId: org }),
      ],
      [
        "proposals",
        () => client.query(api.product.proposals, { organizationId: org }),
      ],
      ["usage", () => client.query(api.product.usage, { organizationId: org })],
      [
        "categories",
        () => client.query(api.categories.list, { organizationId: org }),
      ],
      [
        "devices",
        () => client.query(api.devices.list, { organizationId: org }),
      ],
      [
        "connections",
        () => client.query(api.jobs.connections, { organizationId: org }),
      ],
      [
        "customer models",
        () => client.query(api.jobs.customerRoutes, { organizationId: org }),
      ],
      [
        "GitHub choices",
        () => client.query(api.githubLinks.choices, { organizationId: org }),
      ],
      [
        "AI preferences",
        () => client.query(api.aiPreferences.read, { organizationId: org }),
      ],
      [
        "workspace details",
        () => client.query(api.organizations.details, { organizationId: org }),
      ],
      ["source", () => client.query(api.product.detail, { id: ids.source })],
      [
        "proposal",
        () => client.query(api.product.proposal, { id: ids.proposal }),
      ],
      ["run", () => client.query(api.jobs.run, { id: ids.run })],
      ["evidence", () => client.query(api.assets.evidence, { id: ids.asset })],
    ] as const;
  return { t, owner, foreign, viewer, org, ids, reads, userId: users[0] };
}

it("denies the library-to-PR private read matrix to foreign, unsigned and removed identities while preserving viewer reads", async () => {
  const { t, owner, foreign, viewer, org, reads, userId } = await setup();
  for (const [name, read] of reads(owner))
    expect(await read(), name).toBeDefined();
  for (const [name, read] of reads(viewer))
    expect(await read(), name).toBeDefined();
  for (const client of [foreign, t])
    for (const [name, read] of reads(client))
      await expect(read(), name).rejects.toThrow();
  await t.run(async (ctx) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_pair", (q) =>
        q.eq("organizationId", org).eq("userId", userId),
      )
      .unique();
    await ctx.db.delete(membership!._id);
  });
  for (const [name, read] of reads(owner))
    await expect(read(), name).rejects.toThrow();
});

it("blocks viewer writes, then closes private access for inactive accounts and restore lock", async () => {
  const { t, owner, viewer, org, ids, reads, userId } = await setup();
  const writes = [
    () =>
      viewer.mutation(api.product.editSource, {
        id: ids.source,
        summary: "Changed",
        tags: [],
      }),
    () =>
      viewer.mutation(api.categories.assign, {
        id: ids.source,
        names: ["Design"],
      }),
    () => viewer.mutation(api.product.deleteSource, { id: ids.source }),
    () =>
      viewer.mutation(api.product.saveProfile, {
        id: ids.repo,
        profile: "Changed",
        confirmed: true,
        enabled: true,
      }),
    () =>
      viewer.mutation(api.product.decide, {
        id: ids.proposal,
        version: 1,
        decision: "rejected",
        note: "Changed",
      }),
    () => viewer.mutation(api.jobs.cancel, { id: ids.run }),
    () =>
      viewer.mutation(api.jobs.revoke, {
        organizationId: org,
        provider: "github",
      }),
    () =>
      viewer.mutation(api.organizations.rename, {
        organizationId: org,
        name: "Changed",
      }),
  ];
  for (const write of writes) await expect(write()).rejects.toThrow();
  expect(
    (await owner.query(api.product.detail, { id: ids.source })).title,
  ).toBe("Private source A");
  await t.run(async (ctx) => ctx.db.patch(userId, { status: "deleting" }));
  for (const [name, read] of reads(owner))
    await expect(read(), name).rejects.toThrow();
  vi.stubEnv("RESTORE_LOCK", "true");
  for (const [name, read] of reads(viewer))
    await expect(read(), name).rejects.toThrow("Recovery");
});

it("refuses cross-workspace joins in corrupted restored proposal/run references before returning repository context", async () => {
  const { t, owner, ids } = await setup();
  await t.run(async (ctx) =>
    ctx.db.patch(ids.proposal, { repositoryId: ids.foreignRepo }),
  );
  await expect(
    owner.query(api.product.proposal, { id: ids.proposal }),
  ).rejects.toThrow();
  await expect(owner.query(api.jobs.run, { id: ids.run })).rejects.toThrow();
  expect(await t.query(internal.jobs.workerRun, { id: ids.run })).toBeNull();
  await expect(
    owner.mutation(api.planning.start, {
      id: ids.proposal,
      version: 1,
      key: "test000000000000",
      maxCredits: 10,
    }),
  ).rejects.toThrow("FORBIDDEN");
  await expect(
    owner.mutation(api.jobs.approve, {
      id: ids.proposal,
      version: 1,
      planHash: "synthetic-plan",
      baseSha: "a".repeat(40),
      executor: "cloud",
      fundingRoute: "managed_api",
      maxCredits: 0,
      allowedPaths: ["README.md"],
      highRisk: false,
    }),
  ).rejects.toThrow("FORBIDDEN");
});
