import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => vi.unstubAllEnvs());
it("requires deployment opt-in and the approved workspace owner, grants free expiring QA credits idempotently and never creates payment evidence", async () => {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  await t.mutation(internal.accounts.syncUser, {
    subject: "synthetic-acceptance-owner",
    email: "acceptance@example.test",
    name: "Synthetic operator",
  });
  const owner = t.withIdentity({ subject: "synthetic-acceptance-owner" });
  const org = await owner.mutation(api.organizations.create, {
    name: "Synthetic acceptance workspace",
  });
  const args = {
    organizationId: org,
    subject: "synthetic-acceptance-owner",
    credits: 40,
    key: "owner-quality-review:synthetic:2026-10-02",
  };
  await expect(
    t.mutation(internal.operatorAcceptance.grantQualityReviewCredits, args),
  ).rejects.toThrow("FORBIDDEN");
  vi.stubEnv("OWNER_QUALITY_REVIEW_CREDITS_ENABLED", "true");
  vi.stubEnv("PERSONAL_ALPHA_SUBJECTS_JSON", JSON.stringify([args.subject]));
  await expect(
    t.mutation(internal.operatorAcceptance.grantQualityReviewCredits, {
      ...args,
      subject: "synthetic-foreign",
    }),
  ).rejects.toThrow("FORBIDDEN");
  await expect(
    t.mutation(internal.operatorAcceptance.grantQualityReviewCredits, {
      ...args,
      credits: 101,
    }),
  ).rejects.toThrow("INVALID_INPUT");
  expect(
    await t.mutation(
      internal.operatorAcceptance.grantQualityReviewCredits,
      args,
    ),
  ).toEqual({ granted: 40, duplicate: false });
  expect(
    await t.mutation(
      internal.operatorAcceptance.grantQualityReviewCredits,
      args,
    ),
  ).toEqual({ granted: 40, duplicate: true });
  await expect(
    t.mutation(internal.operatorAcceptance.grantQualityReviewCredits, {
      ...args,
      credits: 41,
    }),
  ).rejects.toThrow("INVALID_INPUT");
  const pools = await t.run((ctx) => ctx.db.query("creditPools").collect());
  expect(pools).toHaveLength(1);
  expect(pools[0].kind).toBe("operator_quality_review");
  expect(pools[0].expiresAt).toBeGreaterThan(Date.now());
  const wallets = await t.run((ctx) => ctx.db.query("wallets").collect());
  expect(wallets[0].purchased).toBe(0);
  expect(
    await t.run((ctx) => ctx.db.query("creditFunding").collect()),
  ).toHaveLength(0);
});
