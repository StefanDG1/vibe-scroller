import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { convexTest } from "convex-test";
import workflowTest from "@convex-dev/workflow/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import fixture from "../fixtures/insight.json";
import downloader from "../infra/downloader.json";
const modules = import.meta.glob("../convex/**/*.ts");
async function setup() {
  const t = convexTest(schema, modules);
  workflowTest.register(t);
  rateLimiterTest.register(t);
  for (const subject of ["link-a", "link-b"])
    await t.mutation(internal.accounts.syncUser, {
      subject,
      email: `${subject}@example.test`,
      name: "Synthetic link processing",
    });
  const a = t.withIdentity({ subject: "link-a" }),
    b = t.withIdentity({ subject: "link-b" });
  const org = await a.mutation(api.organizations.create, {
    name: "Synthetic cloud link",
  });
  const other = await b.mutation(api.organizations.create, {
    name: "Synthetic other",
  });
  const capture = (actor: typeof a, organizationId: typeof org, key: string) =>
    actor.mutation(api.product.capture, {
      organizationId,
      key: `synthetic-${key}`,
      kind: "url",
      url: "https://www.youtube.com/watch?v=abcdefghijk",
      title: "Synthetic public video",
      rightsAttested: true,
    });
  return { t, a, b, org, other, capture };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("ACQUISITION_VERIFIED", "true");
  vi.stubEnv("MEDIA_VERIFIED", "true");
  vi.stubEnv("MANAGED_INFERENCE_ROUTE", "cloudflare_free");
  vi.stubEnv("DISABLE_INFERENCE", "false");
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
describe("cloud public-link boundaries", () => {
  it("settles a stopped worker's confirmed cost after deletion without restoring metadata or content", async () => {
    const { t, a, org, capture } = await setup();
    const id = await capture(a, org, "delete-late");
    await a.mutation(api.product.processSource, { id, maxCredits: 10 });
    await a.mutation(api.product.deleteSource, { id });
    await t.mutation(internal.product.commitAnalysis, {
      id,
      generation: 1,
      credits: 2,
      error: "Synthetic stopped worker",
    });
    await t.mutation(internal.product.commitAnalysis, {
      id,
      generation: 1,
      credits: 2,
    });
    await t.run(async (ctx) => {
      const source = await ctx.db.get(id),
        hold = await ctx.db.query("reservations").first();
      expect(source?.state).toBe("deleted");
      expect(source?.url).toBeUndefined();
      expect(source?.analysis).toBeUndefined();
      expect(hold?.state).toBe("settled");
      expect(hold?.settled).toBe(2);
      expect(await ctx.db.query("notifications").collect()).toHaveLength(0);
    });
  });
  it("queues a supported saved link once with an atomic ten-credit reservation", async () => {
    const { t, a, org, capture } = await setup();
    const id = await capture(a, org, "one");
    await a.mutation(api.product.processBatch, { ids: [id], maxCredits: 10 });
    await a.mutation(api.product.processSource, { id, maxCredits: 10 });
    await t.run(async (ctx) => {
      const s = await ctx.db.get(id);
      expect(s?.state).toBe("queued");
      expect(s?.generation).toBe(1);
      const holds = await ctx.db.query("reservations").collect();
      expect(holds).toHaveLength(1);
      expect(holds[0].max).toBe(10);
    });
  });
  it("rolls back the entire batch on a foreign source, and rejects unverified acquisition before reserving", async () => {
    const { t, a, b, org, other, capture } = await setup();
    const id = await capture(a, org, "one"),
      foreign = await capture(b, other, "foreign");
    await expect(
      a.mutation(api.product.processBatch, {
        ids: [id, foreign],
        maxCredits: 10,
      }),
    ).rejects.toThrow();
    vi.stubEnv("ACQUISITION_VERIFIED", "false");
    await expect(
      a.mutation(api.product.processSource, { id, maxCredits: 10 }),
    ).rejects.toThrow("Public-link processing");
    await t.run(async (ctx) => {
      expect((await ctx.db.get(id))?.generation).toBe(0);
      expect(await ctx.db.query("reservations").collect()).toHaveLength(0);
    });
  });
  it("commits only retrieved caption evidence, preserves audio coverage, and removes acquisition on input replacement", async () => {
    const { t, a, org, capture } = await setup();
    const id = await capture(a, org, "caption");
    const manifest = {
      schemaVersion: "1.0.0",
      status: "acquired",
      downloaderVersion: downloader.version,
      extractor: "Synthetic",
      title: "Synthetic retrieved title",
      description: "Synthetic caption",
      durationSeconds: 8,
      byteLength: 100,
    };
    await t.run(async (ctx) => {
      await ctx.db.patch(id, { generation: 1, state: "queued" });
    });
    await t.mutation(internal.commerce.budgetFixture, {
      organizationId: org,
      key: `source:${id}:1`,
      max: 10,
    });
    const evidence = [
      { kind: "transcript", id: "synthetic-segment", startMs: 0, endMs: 1000 },
      { kind: "caption", id: "post_caption", startMs: null, endMs: null },
    ];
    await expect(
      t.mutation(internal.product.stageMedia, {
        id,
        generation: 1,
        transcript: "Synthetic speech",
        coverage: "audio_only",
        evidence,
      }),
    ).rejects.toThrow("Invalid evidence timing");
    expect(
      await t.mutation(internal.product.recordAcquisition, {
        id,
        generation: 0,
        manifest,
      }),
    ).toBe(false);
    expect(
      await t.mutation(internal.product.recordAcquisition, {
        id,
        generation: 1,
        manifest,
      }),
    ).toBe(true);
    expect(
      await t.mutation(internal.product.stageMedia, {
        id,
        generation: 1,
        transcript: "Synthetic speech",
        coverage: "audio_only",
        evidence,
      }),
    ).toBe(true);
    await t.mutation(internal.product.commitAnalysis, {
      id,
      generation: 1,
      output: {
        ...fixture,
        sourceId: id,
        processingRunId: `${id}:1`,
        coverage: "audio_only",
        insights: fixture.insights.map((i) => ({ ...i, evidence })),
      },
      credits: 2,
    });
    await t.run(async (ctx) => {
      expect((await ctx.db.get(id))?.state).toBe("ready");
    });
    await a.mutation(api.product.attachSource, {
      id,
      text: "Synthetic replacement",
      rightsAttested: true,
    });
    await t.run(async (ctx) => {
      expect((await ctx.db.get(id))?.acquisition).toBeUndefined();
    });
  });
});
