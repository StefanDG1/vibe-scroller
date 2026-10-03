import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { reserve, settle } from "../convex/product";

afterEach(() => vi.unstubAllEnvs());
async function setup({ mixed = false, expired = false, allSpent = 100 } = {}) {
  vi.stubEnv("PERSONAL_ALPHA_SUBJECTS_JSON", '["owned-budget-review"]');
  const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
  const month = new Date().toISOString().slice(0, 7);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const owner = await ctx.db.insert("users", {
      subject: "owned-budget-review",
      email: "owned@example.test",
      name: "Synthetic budget owner",
      status: "active",
      createdAt: now,
    });
    const organizationId = await ctx.db.insert("organizations", {
      name: "Synthetic funded review",
      createdBy: owner,
      status: "active",
      createdAt: now,
    });
    await ctx.db.insert("wallets", {
      organizationId,
      createdAt: now,
      updatedAt: now,
      granted: 40,
      purchased: 0,
      spent: 0,
      reserved: 0,
      periodEnd: now + 86400000,
      tier: "trial",
      interval: "trial",
    });
    const pool = await ctx.db.insert("creditPools", {
      organizationId,
      key: "owner-quality-review:owned-budget-review",
      kind: "operator_quality_review",
      granted: mixed ? 5 : 40,
      spent: 0,
      reserved: 0,
      expiresAt: now + (expired ? -1 : 86400000),
      createdAt: now,
      updatedAt: now,
    });
    if (mixed || expired)
      await ctx.db.insert("creditPools", {
        organizationId,
        key: "trial:owned-budget-review",
        kind: "included",
        granted: 40,
        spent: 0,
        reserved: 0,
        expiresAt: now + 2 * 86400000,
        createdAt: now,
        updatedAt: now,
      });
    const trial = await ctx.db.insert("operatorBudgets", {
      key: `trial:${month}`,
      ceiling: 200,
      spent: 200,
      reserved: 0,
      updatedAt: now,
    });
    const all = await ctx.db.insert("operatorBudgets", {
      key: `all:${month}`,
      ceiling: 1000,
      spent: allSpent,
      reserved: 0,
      updatedAt: now,
    });
    return { organizationId, pool, trial, all };
  });
  return { t, ids, month };
}
it("reserves and settles owner QA against overall exposure without changing exhausted customer trial exposure", async () => {
  const { t, ids, month } = await setup();
  await t.run((ctx) => reserve(ctx, ids.organizationId, "owned-review", 10));
  const held = await t.run(async (ctx) => ({
    trial: await ctx.db.get(ids.trial),
    all: await ctx.db.get(ids.all),
    reservations: await ctx.db.query("reservations").collect(),
  }));
  expect(held.trial).toMatchObject({ ceiling: 200, spent: 200, reserved: 0 });
  expect(held.all).toMatchObject({ ceiling: 1000, spent: 100, reserved: 10 });
  expect(held.reservations[0].operatorKeys).toEqual([`all:${month}`]);
  await t.run((ctx) => settle(ctx, ids.organizationId, "owned-review", 3));
  const settled = await t.run(async (ctx) => ({
    trial: await ctx.db.get(ids.trial),
    all: await ctx.db.get(ids.all),
    pool: await ctx.db.get(ids.pool),
    funding: await ctx.db.query("creditFunding").collect(),
  }));
  expect(settled.trial).toMatchObject({
    ceiling: 200,
    spent: 200,
    reserved: 0,
  });
  expect(settled.all).toMatchObject({ ceiling: 1000, spent: 103, reserved: 0 });
  expect(settled.pool).toMatchObject({ spent: 3, reserved: 0 });
  expect(settled.funding).toHaveLength(0);
});
it.each(["mixed", "expired", "removed-owner", "overall-exhausted"])(
  "cannot exempt %s funding from its required budget",
  async (mode) => {
    const { t, ids } = await setup({
      mixed: mode === "mixed",
      expired: mode === "expired",
      allSpent: mode === "overall-exhausted" ? 995 : 100,
    });
    if (mode === "removed-owner")
      vi.stubEnv("PERSONAL_ALPHA_SUBJECTS_JSON", "[]");
    await expect(
      t.run((ctx) => reserve(ctx, ids.organizationId, "blocked-review", 10)),
    ).rejects.toThrow("OPERATOR_BUDGET_REACHED");
    expect(
      await t.run((ctx) => ctx.db.query("reservations").collect()),
    ).toHaveLength(0);
    expect(await t.run((ctx) => ctx.db.get(ids.trial))).toMatchObject({
      ceiling: 200,
      spent: 200,
      reserved: 0,
    });
  },
);
