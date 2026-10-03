import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { internal } from "../convex/_generated/api";
const speech = vi.hoisted(() => vi.fn());
vi.mock("../convex/lib/googleMedia", () => ({
  googleSpeech: speech,
  googleFrames: vi.fn(),
}));
vi.mock("../packages/providers/media", async (original) => ({
  ...(await original<typeof import("../packages/providers/media")>()),
  prepareMedia: async () => ({
    computeSeconds: 1,
    manifest: { durationSeconds: 1 },
    audio: new Uint8Array([1]),
    frames: [],
  }),
}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  speech.mockReset();
});
it.each([true, false])(
  "settles only confirmed media usage; measured=%s",
  async (measured) => {
    vi.stubEnv("MANAGED_INFERENCE_ROUTE", "google_metered");
    vi.stubEnv("HOSTED_MEDIA_ANALYSIS_VERIFIED", "true");
    vi.stubEnv("HOSTED_MEDIA_PUBLIC_RELEASE_APPROVED", "true");
    vi.stubEnv("SANDBOX_CREDITS_PER_SECOND", "0.02");
    vi.spyOn(console, "error").mockImplementation(() => {});
    speech.mockImplementation(async (_ctx, _audio, _duration, _max, record) => {
      if (measured)
        record({ costMicros: 1234, inputTokens: 100, outputTokens: 20 });
      throw new Error(
        measured
          ? "INVALID_EVIDENCE: owned malformed output"
          : "PROVIDER_ERROR: missing response",
      );
    });
    const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
    const ids = await t.run(async (ctx) => {
      const now = Date.now();
      const actor = await ctx.db.insert("users", {
        subject: "owned-media-settlement",
        email: "owned@example.test",
        name: "Owned",
        status: "active",
        createdAt: now,
      });
      const organizationId = await ctx.db.insert("organizations", {
        name: "Synthetic settlement",
        status: "active",
        createdBy: actor,
        createdAt: now,
      });
      await ctx.db.insert("memberships", {
        organizationId,
        userId: actor,
        role: "owner",
      });
      const wallet = await ctx.db.insert("wallets", {
        organizationId,
        createdAt: now,
        updatedAt: now,
        granted: 10,
        purchased: 0,
        spent: 0,
        reserved: 10,
        periodEnd: now + 86400000,
        tier: "trial",
        interval: "trial",
      });
      const pool = await ctx.db.insert("creditPools", {
        organizationId,
        key: "owned",
        kind: "included",
        granted: 10,
        spent: 0,
        reserved: 10,
        createdAt: now,
        updatedAt: now,
      });
      const source = await ctx.db.insert("sources", {
        managedAnalysisActor: actor,
        organizationId,
        createdAt: now,
        updatedAt: now,
        key: "owned",
        canonical: "owned",
        kind: "upload",
        objectKey: organizationId + "/owned",
        title: "Synthetic owned",
        state: "queued",
        coverage: "metadata_only",
        tags: [],
        rightsAttested: true,
        generation: 1,
      });
      const reservation = await ctx.db.insert("reservations", {
        organizationId,
        createdAt: now,
        updatedAt: now,
        key: `source:${source}:1`,
        max: 10,
        settled: 0,
        state: "active",
        expiresAt: now + 86400000,
        allocations: [{ poolId: pool, credits: 10 }],
        operatorKeys: [],
      });
      return { source, reservation, wallet, pool };
    });
    await t.action(internal.media.analyze, { id: ids.source, generation: 1 });
    const result = await t.run(async (ctx) => ({
      source: await ctx.db.get(ids.source),
      reservation: await ctx.db.get(ids.reservation),
      wallet: await ctx.db.get(ids.wallet),
      pool: await ctx.db.get(ids.pool),
    }));
    expect(result.source?.state).toBe("failed");
    expect(result.source?.analysis).toBeUndefined();
    expect(speech).toHaveBeenCalledTimes(1);
    expect(result.reservation?.state).toBe(measured ? "settled" : "active");
    expect(result.reservation?.settled).toBe(measured ? 2 : 0);
    expect(result.wallet?.spent).toBe(measured ? 2 : 0);
    expect(result.pool?.reserved).toBe(measured ? 0 : 10);
  },
);
