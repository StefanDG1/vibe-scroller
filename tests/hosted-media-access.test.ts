import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import workflowTest from "@convex-dev/workflow/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { hostedMediaAllowed } from "../convex/lib/hostedMediaAccess";
import fixture from "../fixtures/insight.json";
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

it("separates bounded acceptance, model verification and public release", () => {
  vi.stubEnv("HOSTED_MEDIA_ANALYSIS_VERIFIED", "false");
  vi.stubEnv("HOSTED_MEDIA_PUBLIC_RELEASE_APPROVED", "false");
  vi.stubEnv("HOSTED_MEDIA_ACCEPTANCE_ENABLED", "true");
  vi.stubEnv("HOSTED_MEDIA_ANALYSIS_SUBJECTS_JSON", '["synthetic-owner"]');
  expect(hostedMediaAllowed("synthetic-owner")).toBe(true);
  expect(hostedMediaAllowed("synthetic-foreign")).toBe(false);
  for (const json of [
    "{}",
    '"synthetic-owner"',
    "invalid",
    '[""]',
    JSON.stringify(Array(11).fill("synthetic-owner")),
  ]) {
    vi.stubEnv("HOSTED_MEDIA_ANALYSIS_SUBJECTS_JSON", json);
    expect(hostedMediaAllowed("synthetic-owner")).toBe(false);
  }
  vi.stubEnv("HOSTED_MEDIA_PUBLIC_RELEASE_APPROVED", "true");
  expect(hostedMediaAllowed("synthetic-owner")).toBe(false);
  vi.stubEnv("HOSTED_MEDIA_ANALYSIS_VERIFIED", "true");
  expect(hostedMediaAllowed("synthetic-foreign")).toBe(true);
  vi.stubEnv("RESTORE_LOCK", "true");
  expect(hostedMediaAllowed("synthetic-owner")).toBe(false);
  vi.stubEnv("RESTORE_LOCK", "false");
  vi.stubEnv("DISABLE_INFERENCE", "true");
  expect(hostedMediaAllowed("synthetic-owner")).toBe(false);
});

it("binds queued media to its actual actor and rejects revoked evidence and output", async () => {
  vi.stubEnv("HOSTED_MEDIA_ANALYSIS_VERIFIED", "false");
  vi.stubEnv("HOSTED_MEDIA_PUBLIC_RELEASE_APPROVED", "false");
  vi.stubEnv("HOSTED_MEDIA_ACCEPTANCE_ENABLED", "true");
  vi.stubEnv("HOSTED_MEDIA_ANALYSIS_SUBJECTS_JSON", '["synthetic-owner"]');
  vi.stubEnv("MANAGED_INFERENCE_ROUTE", "cloudflare_free");
  vi.stubEnv("ACQUISITION_VERIFIED", "true");
  vi.stubEnv("MEDIA_VERIFIED", "true");
  const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
  workflowTest.register(t);
  rateLimiterTest.register(t);
  for (const subject of ["synthetic-owner", "synthetic-foreign"])
    await t.mutation(internal.accounts.syncUser, {
      subject,
      email: subject + "@example.test",
      name: subject,
    });
  const owner = t.withIdentity({ subject: "synthetic-owner" }),
    other = t.withIdentity({ subject: "synthetic-foreign" });
  const org = await owner.mutation(api.organizations.create, {
    name: "Synthetic acceptance",
  });
  const foreignOrg = await other.mutation(api.organizations.create, {
    name: "Synthetic other",
  });
  const capture = (client: typeof owner, organizationId: typeof org) =>
    client.mutation(api.product.capture, {
      organizationId,
      key: crypto.randomUUID(),
      kind: "url",
      url: "https://www.youtube.com/watch?v=abcdefghijk",
      title: "Synthetic",
      rightsAttested: true,
    });
  const id = await capture(owner, org),
    foreign = await capture(other, foreignOrg);
  await expect(
    other.mutation(api.product.processSource, { id: foreign, maxCredits: 10 }),
  ).rejects.toThrow("SETUP_REQUIRED");
  expect(
    await t.run((ctx) => ctx.db.query("reservations").collect()),
  ).toHaveLength(0);
  await owner.mutation(api.product.processSource, { id, maxCredits: 10 });
  expect(
    await t.query(internal.product.authorizeHostedMedia, { id, generation: 1 }),
  ).toBe(true);
  expect(
    await t.query(internal.product.authorizeHostedMedia, { id, generation: 2 }),
  ).toBe(false);
  const actor = await t.run((ctx) => ctx.db.get(id));
  expect(actor?.managedAnalysisActor).toBeTruthy();
  await t.run(async (ctx) => {
    const m = await ctx.db
      .query("memberships")
      .withIndex("by_pair", (q) =>
        q.eq("organizationId", org).eq("userId", actor!.managedAnalysisActor!),
      )
      .unique();
    await ctx.db.patch(m!._id, { role: "viewer" });
  });
  expect(
    await t.query(internal.product.authorizeHostedMedia, { id, generation: 1 }),
  ).toBe(false);
  expect(
    await t.mutation(internal.assets.registerEvidence, {
      sourceId: id,
      generation: 1,
      key: org + "/synthetic",
      size: 10,
      etag: "owned",
    }),
  ).toBeNull();
  expect(
    await t.mutation(internal.product.stageMedia, {
      id,
      generation: 1,
      transcript: "Owned",
      coverage: "audio_only",
      evidence: [],
    }),
  ).toBe(false);
  await expect(
    t.mutation(internal.product.commitAnalysis, {
      id,
      generation: 1,
      output: { ...fixture, sourceId: id, processingRunId: id + ":1" },
      credits: 1,
    }),
  ).rejects.toThrow("Media authorization changed");
  await t.mutation(internal.product.commitAnalysis, {
    id,
    generation: 1,
    error: "Synthetic revoked",
    credits: 1,
  });
  const s = await t.run((ctx) => ctx.db.get(id));
  expect(s?.state).toBe("failed");
  expect(s?.analysis).toBeUndefined();
  expect(await t.run((ctx) => ctx.db.query("assets").collect())).toHaveLength(
    0,
  );
  expect(
    await t.run((ctx) => ctx.db.query("objectDeletions").collect()),
  ).toHaveLength(1);
});
