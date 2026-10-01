import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => vi.unstubAllEnvs());
async function setup() {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(internal.accounts.syncUser, {
    subject: "default-owner",
    email: "owner@example.test",
    name: "Owner",
  });
  const owner = t.withIdentity({ subject: "default-owner" });
  return { t, userId, owner };
}
it("creates one owned default across concurrent first visits without purchasing or granting paid access", async () => {
  const { t, userId, owner } = await setup();
  const ids = await Promise.all(
    Array.from({ length: 4 }, () =>
      owner.mutation(api.organizations.ensureDefault, {}),
    ),
  );
  expect(new Set(ids).size).toBe(1);
  const data = await owner.query(api.accounts.current, {});
  expect(data.organizations).toEqual([
    { id: ids[0], name: "Personal workspace", role: "owner" },
  ]);
  await t.run(async (ctx) => {
    expect((await ctx.db.get(userId))?.defaultWorkspaceId).toBe(ids[0]);
    expect(await ctx.db.query("billing").collect()).toEqual([]);
    expect(
      (await ctx.db.query("audit").collect()).filter(
        (x) => x.action === "organization.created",
      ),
    ).toHaveLength(1);
  });
});
it("uses existing memberships, remembers a selected workspace and rechecks lost access", async () => {
  const { t, owner, userId } = await setup();
  const first = await owner.mutation(api.organizations.create, {
    name: "Existing",
  });
  expect(await owner.mutation(api.organizations.ensureDefault, {})).toBe(first);
  const second = await owner.mutation(api.organizations.create, {
    name: "Second",
  });
  expect(
    await owner.mutation(api.organizations.ensureDefault, {
      preferredId: second,
    }),
  ).toBe(second);
  expect(await owner.mutation(api.organizations.ensureDefault, {})).toBe(
    second,
  );
  await t.run(async (ctx) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_pair", (q) =>
        q.eq("organizationId", second).eq("userId", userId),
      )
      .unique();
    await ctx.db.delete(membership!._id);
  });
  await expect(
    owner.mutation(api.organizations.ensureDefault, { preferredId: second }),
  ).rejects.toThrow("unavailable");
  expect(await owner.mutation(api.organizations.ensureDefault, {})).toBe(first);
  await t.run(async (ctx) => {
    await ctx.db.patch(first, { status: "deleting" });
  });
  const replacement = await owner.mutation(api.organizations.ensureDefault, {});
  expect(replacement).not.toBe(first);
  expect((await t.run((ctx) => ctx.db.get(first)))?.status).toBe("deleting");
});
it("rejects foreign selections, anonymous access, deleting accounts and recovery lock", async () => {
  const { t, owner, userId } = await setup();
  await t.mutation(internal.accounts.syncUser, {
    subject: "other",
    email: "other@example.test",
    name: "Other",
  });
  const foreign = await t
    .withIdentity({ subject: "other" })
    .mutation(api.organizations.create, { name: "Foreign" });
  await t.run((ctx) => ctx.db.patch(userId, { defaultWorkspaceId: foreign }));
  await expect(
    owner.mutation(api.organizations.ensureDefault, { preferredId: foreign }),
  ).rejects.toThrow("unavailable");
  expect(await owner.mutation(api.organizations.ensureDefault, {})).not.toBe(
    foreign,
  );
  await expect(t.mutation(api.organizations.ensureDefault, {})).rejects.toThrow(
    "Sign in",
  );
  vi.stubEnv("RESTORE_LOCK", "true");
  await expect(
    owner.mutation(api.organizations.ensureDefault, {}),
  ).rejects.toThrow("Recovery");
  vi.stubEnv("RESTORE_LOCK", "false");
  await t.run((ctx) => ctx.db.patch(userId, { status: "deleting" }));
  await expect(
    owner.mutation(api.organizations.ensureDefault, {}),
  ).rejects.toThrow("Account unavailable");
});
