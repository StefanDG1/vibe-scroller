import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import schema from "../convex/schema";
import fixture from "../fixtures/insight.json";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.ts");
async function setup() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  const subjects = [
    "review-owner",
    "review-member",
    "review-viewer",
    "review-foreign",
  ];
  const users = await Promise.all(
    subjects.map((subject) =>
      t.mutation(internal.accounts.syncUser, {
        subject,
        email: `${subject}@example.test`,
        name: "Synthetic review test",
      }),
    ),
  );
  const [owner, member, viewer, foreign] = subjects.map((subject) =>
    t.withIdentity({ subject, auth_time: Math.floor(Date.now() / 1000) }),
  );
  const org = await owner.mutation(api.organizations.create, {
    name: "Synthetic review workspace",
  });
  const source = await t.run(async (ctx) => {
    await ctx.db.insert("memberships", {
      organizationId: org,
      userId: users[1],
      role: "member",
    });
    await ctx.db.insert("memberships", {
      organizationId: org,
      userId: users[2],
      role: "viewer",
    });
    return ctx.db.insert("sources", {
      organizationId: org,
      key: "synthetic-review",
      canonical: "synthetic-review",
      kind: "text",
      title: "Synthetic review control",
      state: "ready",
      coverage: "caption_only",
      tags: [],
      rightsAttested: true,
      generation: 1,
      analysis: fixture,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
  const detail = await owner.query(api.product.detail, { id: source });
  const args = {
    id: source,
    generation: 1,
    analysisHash: detail.analysisHash!,
    verdict: "unsure" as const,
    note: "Synthetic operator control; no human quality verdict.",
  };
  return { t, owner, member, viewer, foreign, org, source, args };
}
it("binds reviews to the actor, tenant and exact current analysis", async () => {
  const { t, owner, viewer, foreign, source, args } = await setup();
  for (const actor of [t, viewer, foreign])
    await expect(
      actor.mutation(api.product.reviewAnalysis, args),
    ).rejects.toThrow();
  await expect(
    owner.mutation(api.product.reviewAnalysis, { ...args, generation: 2 }),
  ).rejects.toThrow("APPROVAL_STALE");
  await expect(
    owner.mutation(api.product.reviewAnalysis, {
      ...args,
      analysisHash: "a".repeat(64),
    }),
  ).rejects.toThrow("APPROVAL_STALE");
  await t.run((ctx) =>
    ctx.db.patch(source, {
      analysis: { ...fixture, summary: "Changed synthetic summary" },
    }),
  );
  await expect(
    owner.mutation(api.product.reviewAnalysis, args),
  ).rejects.toThrow("APPROVAL_STALE");
  expect(await t.run((ctx) => ctx.db.query("feedback").collect())).toHaveLength(
    0,
  );
});
it("retains edit history, makes duplicate submission idempotent and keeps another member's review private", async () => {
  const { t, owner, member, viewer, source, args } = await setup();
  const first = await owner.mutation(api.product.reviewAnalysis, args);
  expect(await owner.mutation(api.product.reviewAnalysis, args)).toEqual(first);
  expect(
    (await owner.query(api.product.detail, { id: source })).analysisReview
      ?.note,
  ).toBe(args.note);
  expect(
    (await member.query(api.product.detail, { id: source })).analysisReview,
  ).toBeUndefined();
  expect(
    (await viewer.query(api.product.detail, { id: source })).analysisReview,
  ).toBeUndefined();
  await member.mutation(api.product.reviewAnalysis, {
    ...args,
    note: "Separate synthetic member opinion",
  });
  await owner.mutation(api.product.reviewAnalysis, {
    ...args,
    verdict: "missing_details",
    note: "Edited synthetic observation",
  });
  expect(
    (await member.query(api.product.detail, { id: source })).analysisReview
      ?.note,
  ).toBe("Separate synthetic member opinion");
  const rows = await t.run((ctx) => ctx.db.query("feedback").collect());
  expect(rows).toHaveLength(3);
  expect(
    rows.every(
      (r) =>
        r.benefit === "not_measured" &&
        r.sourceGeneration === 1 &&
        r.analysisHash === args.analysisHash,
    ),
  ).toBe(true);
  expect(
    await t.run((ctx) => ctx.db.query("reservations").collect()),
  ).toHaveLength(0);
  await t.run((ctx) => ctx.db.patch(source, { generation: 2 }));
  expect(
    (await owner.query(api.product.detail, { id: source })).analysisReview,
  ).toBeUndefined();
});
it("rejects credential notes and deletes review text when its source is deleted", async () => {
  const { t, owner, source, args } = await setup();
  for (const note of ["x".repeat(2001), `sk_live_${"a".repeat(32)}`])
    await expect(
      owner.mutation(api.product.reviewAnalysis, { ...args, note }),
    ).rejects.toThrow("INVALID_INPUT");
  await owner.mutation(api.product.reviewAnalysis, args);
  await owner.mutation(api.product.deleteSource, { id: source });
  expect(await t.run((ctx) => ctx.db.query("feedback").collect())).toHaveLength(
    0,
  );
  await expect(
    owner.mutation(api.product.reviewAnalysis, args),
  ).rejects.toThrow();
});
