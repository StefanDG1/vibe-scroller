import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { expect, it } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.ts");
it("reopens completed deletion for late bytes and schedules bounded final checks", async () => {
  const t = convexTest(schema, modules),
    key = "synthetic-org/retired-object";
  await t.mutation(internal.assets.queueEvidenceDeletion, { key });
  await t.mutation(internal.assets.deleteReceipt, { key });
  await t.mutation(internal.assets.queueEvidenceDeletion, { key });
  await t.run(async (ctx) => {
    const job = await ctx.db.query("objectDeletions").first();
    expect(job?.state).toBe("pending");
    const scheduled = await ctx.db.system
      .query("_scheduled_functions")
      .collect();
    expect(
      scheduled.some(
        (j) =>
          j.name === "assets:recheckDeletion" &&
          j.scheduledTime >= Date.now() + 19 * 60000,
      ),
    ).toBe(true);
  });
  await t.mutation(internal.assets.deleteReceipt, { key });
  await t.mutation(internal.assets.recheckDeletion, { key });
  expect(
    await t.run(
      async (ctx) => (await ctx.db.query("objectDeletions").first())?.state,
    ),
  ).toBe("pending");
});
it("never reuses retired upload or evidence keys for a new source", async () => {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  await t.mutation(internal.accounts.syncUser, {
    subject: "synthetic-retirement",
    email: "retirement@example.test",
    name: "Synthetic",
  });
  const user = t.withIdentity({ subject: "synthetic-retirement" }),
    organizationId = await user.mutation(api.organizations.create, {
      name: "Synthetic retirement",
    });
  const key = organizationId + "/retired-frame";
  await t.mutation(internal.assets.queueEvidenceDeletion, { key });
  await t.mutation(internal.assets.deleteReceipt, { key });
  await expect(
    user.mutation(api.assets.grant, {
      organizationId,
      key,
      size: 32,
      type: "video/mp4",
    }),
  ).rejects.toThrow("Retired upload keys");
  const sourceId = await user.mutation(api.product.capture, {
    organizationId,
    key: "synthetic-capture-retirement",
    kind: "text",
    title: "Synthetic new source",
    text: "Synthetic test content",
    rightsAttested: true,
  });
  expect(
    await t.mutation(internal.assets.registerEvidence, {
      sourceId,
      generation: 0,
      key,
      size: 32,
      etag: "synthetic",
    }),
  ).toBeNull();
  expect(await t.run((ctx) => ctx.db.query("assets").collect())).toEqual([]);
  expect(
    await t.run(
      async (ctx) => (await ctx.db.query("objectDeletions").first())?.state,
    ),
  ).toBe("pending");
});
