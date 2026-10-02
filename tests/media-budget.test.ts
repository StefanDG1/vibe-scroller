import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { internal } from "../convex/_generated/api";
const preparation = vi.hoisted(() => vi.fn());
vi.mock("../packages/providers/media", async (original) => ({
  ...(await original<typeof import("../packages/providers/media")>()),
  prepareMedia: preparation,
}));
afterEach(() => {
  vi.unstubAllEnvs();
  preparation.mockReset();
});
it("refuses unknown compute rates and unverified hosted analysis before creating any media worker", async () => {
  const cases = [
    ...["", "NaN", "0", "-1", "0.04"].map((rate) => ({
      rate,
      verified: "true",
      category: "QUOTE_CHANGED",
    })),
    { rate: "0.02", verified: "false", category: "SETUP_REQUIRED" },
  ];
  for (const { rate, verified, category } of cases) {
    vi.stubEnv("HOSTED_MEDIA_ANALYSIS_VERIFIED", verified);
    vi.stubEnv("SANDBOX_CREDITS_PER_SECOND", rate);
    const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
    const id = await t.run(async (ctx) => {
      const now = Date.now();
      const user = await ctx.db.insert("users", {
        subject: "synthetic-budget",
        email: "synthetic@example.test",
        name: "Synthetic",
        status: "active",
        createdAt: now,
      });
      const organizationId = await ctx.db.insert("organizations", {
        name: "Synthetic",
        status: "active",
        createdBy: user,
        createdAt: now,
      });
      return ctx.db.insert("sources", {
        organizationId,
        createdAt: now,
        updatedAt: now,
        key: "synthetic",
        canonical: "synthetic",
        kind: "upload",
        objectKey: organizationId + "/owned",
        title: "Synthetic owned",
        state: "queued",
        coverage: "metadata_only",
        tags: [],
        rightsAttested: true,
        generation: 1,
      });
    });
    await t.action(internal.media.analyze, { id, generation: 1 });
    expect(preparation).not.toHaveBeenCalled();
    const source = await t.run((ctx) => ctx.db.get(id));
    expect(source?.state).toBe("failed");
    expect(source?.error).toContain(category);
  }
});
