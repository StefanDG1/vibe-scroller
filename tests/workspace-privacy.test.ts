import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { actorCurrent } from "../convex/knowledge";
import { hostedSourceAllowed } from "../convex/lib/hostedMediaAccess";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => vi.unstubAllEnvs());
async function setup() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  const ownerId = await t.mutation(internal.accounts.syncUser, {
    subject: "private-owner",
    email: "owner@example.test",
    name: "Owner",
  });
  const otherId = await t.mutation(internal.accounts.syncUser, {
    subject: "other-owner",
    email: "other@example.test",
    name: "Other",
  });
  return {
    t,
    ownerId,
    otherId,
    owner: t.withIdentity({ subject: "private-owner" }),
    other: t.withIdentity({ subject: "other-owner" }),
  };
}
it("creates one private scope concurrently without moving legacy shared data or renewing the trial", async () => {
  const { t, owner, ownerId, otherId, other } = await setup();
  const shared = await owner.mutation(api.organizations.create, {
    name: "Personal workspace",
  });
  await t.run((ctx) =>
    ctx.db.insert("memberships", {
      organizationId: shared,
      userId: otherId,
      role: "member",
    }),
  );
  const ids = await Promise.all(
    Array.from({ length: 4 }, () =>
      owner.mutation(api.organizations.createPrivate, {}),
    ),
  );
  expect(new Set(ids).size).toBe(1);
  expect((await t.run((ctx) => ctx.db.get(ids[0])))?.privateOwnerId).toBe(
    ownerId,
  );
  expect(
    (await t.run((ctx) => ctx.db.get(shared)))?.privateOwnerId,
  ).toBeUndefined();
  expect(
    (await other.query(api.organizations.details, { organizationId: shared }))
      .name,
  ).toBe("Personal workspace");
  expect(await owner.mutation(api.organizations.ensureDefault, {})).toBe(
    shared,
  );
  expect(await t.run((ctx) => ctx.db.query("wallets").collect())).toEqual([]);
});
it("denies private reads, writes, exports and listing even with an accidental owner membership", async () => {
  const { t, owner, other, otherId } = await setup();
  const id = await owner.mutation(api.organizations.createPrivate, {});
  await t.run((ctx) =>
    ctx.db.insert("memberships", {
      organizationId: id,
      userId: otherId,
      role: "owner",
    }),
  );
  for (const request of [
    () => other.query(api.organizations.details, { organizationId: id }),
    () => other.query(api.organizations.exportData, { organizationId: id }),
    () => other.query(api.product.library, { organizationId: id }),
    () =>
      other.query(api.product.overview, {
        organizationId: id,
        includeCounts: false,
      }),
    () =>
      other.mutation(api.organizations.rename, {
        organizationId: id,
        name: "Changed",
      }),
    () => other.mutation(api.organizations.ensureDefault, { preferredId: id }),
  ])
    await expect(request()).rejects.toThrow("unavailable");
  expect((await other.query(api.accounts.current, {})).organizations).toEqual(
    [],
  );
  expect(
    (await other.query(api.accounts.exportAccount, {})).memberships,
  ).toEqual([]);
});
it("rejects invitation and ownership transfer including forged preexisting invitations", async () => {
  const { t, owner, other, otherId } = await setup();
  const id = await owner.mutation(api.organizations.createPrivate, {});
  const hash = "a".repeat(64);
  await expect(
    owner.mutation(api.organizations.invite, {
      organizationId: id,
      email: "other@example.test",
      role: "viewer",
      tokenHash: hash,
    }),
  ).rejects.toThrow("private");
  const member = await t.run((ctx) =>
    ctx.db.insert("memberships", {
      organizationId: id,
      userId: otherId,
      role: "viewer",
    }),
  );
  await expect(
    owner.mutation(api.organizations.changeMember, {
      organizationId: id,
      membershipId: member,
      role: "owner",
    }),
  ).rejects.toThrow("cannot be transferred");
  await t.run((ctx) =>
    ctx.db.insert("invitations", {
      organizationId: id,
      email: "other@example.test",
      role: "admin",
      tokenHash: hash,
      expiresAt: Date.now() + 60000,
      createdBy: otherId,
    }),
  );
  await expect(
    other.mutation(api.organizations.acceptInvite, { tokenHash: hash }),
  ).rejects.toThrow("unavailable");
  await expect(
    owner.mutation(api.accounts.deleteAccount, {
      confirmation: "owner@example.test",
    }),
  ).rejects.toThrow("private library");
});
it("keeps recovery and deletion locks on private creation and reads", async () => {
  const { t, owner } = await setup();
  const id = await owner.mutation(api.organizations.ensureDefault, {});
  expect(
    (await owner.query(api.organizations.details, { organizationId: id! }))
      .private,
  ).toBe(true);
  vi.stubEnv("RESTORE_LOCK", "true");
  await expect(
    owner.mutation(api.organizations.createPrivate, {}),
  ).rejects.toThrow("Recovery");
  vi.stubEnv("RESTORE_LOCK", "false");
  await t.run((ctx) => ctx.db.patch(id!, { status: "deleting" }));
  await expect(
    owner.mutation(api.organizations.createPrivate, {}),
  ).rejects.toThrow("deletion");
  await expect(
    owner.query(api.product.library, { organizationId: id! }),
  ).rejects.toThrow("unavailable");
});

it("rechecks the private boundary for queued knowledge and hosted media actors", async () => {
  const { t, owner, ownerId, otherId } = await setup();
  const id = await owner.mutation(api.organizations.createPrivate, {});
  await t.run((ctx) =>
    ctx.db.insert("memberships", {
      organizationId: id,
      userId: otherId,
      role: "owner",
    }),
  );
  expect(await t.run((ctx) => actorCurrent(ctx, id, ownerId))).toBe(true);
  expect(await t.run((ctx) => actorCurrent(ctx, id, otherId))).toBe(false);
  vi.stubEnv("HOSTED_MEDIA_ANALYSIS_VERIFIED", "true");
  vi.stubEnv("HOSTED_MEDIA_PUBLIC_RELEASE_APPROVED", "true");
  const source = await owner.mutation(api.product.capture, {
    organizationId: id,
    key: "privacy-worker",
    kind: "text",
    title: "Private",
    text: "Private text",
    rightsAttested: true,
  });
  await t.run(async (ctx) => {
    await ctx.db.patch(source, { managedAnalysisActor: otherId });
    expect(await hostedSourceAllowed(ctx, (await ctx.db.get(source))!)).toBe(
      false,
    );
    await ctx.db.patch(source, { managedAnalysisActor: ownerId });
    expect(await hostedSourceAllowed(ctx, (await ctx.db.get(source))!)).toBe(
      true,
    );
  });
});
