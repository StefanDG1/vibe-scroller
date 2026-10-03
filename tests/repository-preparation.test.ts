import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import workflowTest from "@convex-dev/workflow/test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { snapshot } from "../packages/providers/github";
vi.mock("../packages/providers/github", () => ({ snapshot: vi.fn() }));
vi.mock("../convex/lib/githubAuthorization", () => ({
  authorizeRepository: vi.fn(async () => ({ private: true })),
}));
const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});
it("routes legacy connection through bounded preparation and records each failure without stranding other selected projects", async () => {
  vi.useFakeTimers();
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  workflowTest.register(t);
  await t.mutation(internal.accounts.syncUser, {
    subject: "scope-owner",
    email: "scope-owner@example.test",
    name: "Synthetic",
  });
  const a = t.withIdentity({ subject: "scope-owner" });
  const organizationId = await a.mutation(api.organizations.create, {
    name: "Synthetic scope",
  });
  await t.mutation(internal.githubLinks.save, {
    organizationId,
    githubUserId: 7,
    installations: [
      {
        installationId: 42,
        repositories: [
          { id: 55, fullName: "owned/first" },
          { id: 56, fullName: "owned/large" },
        ],
      },
    ],
  });
  await t.mutation(internal.jobs.storeSecret, {
    organizationId,
    provider: "github",
    ciphertext: "synthetic-encrypted",
    keyVersion: "synthetic",
  });
  await t.run((ctx) =>
    ctx.db.insert("repositories", {
      organizationId,
      installationId: 42,
      providerId: 55,
      fullName: "owned/first",
      branch: "main",
      sha: "a".repeat(40),
      enabled: true,
      confirmed: true,
      profile: "Manual corrections",
      profileVersion: 5,
      manifest: ["src/main.ts"],
      context: "synthetic",
      snapshotPaths: ["src"],
      status: "connected",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
  vi.mocked(snapshot).mockImplementation(async (_installation, provider) => {
    if (provider === 56)
      throw new Error("REPO_TOO_LARGE: private upstream diagnostic");
    return {
      sha: "b".repeat(40),
      branch: "main",
      manifest: ["src/main.ts"],
      manifestEntries: [],
      context: "synthetic",
      contextFiles: [],
      contextExcerpts: [],
      contextTree: "",
      extractionVersion: "synthetic",
      snapshotSummary: {},
      snapshotDelta: {},
    } as any;
  });
  await expect(
    a.action(api.integrations.connectRepository, {
      organizationId,
      installationId: 42,
      providerId: 56,
      fullName: "owned/large",
    }),
  ).rejects.toThrow("REPO_TOO_LARGE");
  const projects = await a.query(api.product.repositories, { organizationId });
  expect(projects.find((p) => p.providerId === 55)).toMatchObject({
    status: "connected",
    confirmed: true,
    profileVersion: 5,
    profile: "Manual corrections",
    snapshotPaths: ["src"],
  });
  expect(projects.find((p) => p.providerId === 56)).toMatchObject({
    status: "needs_attention",
    preparationError: "REPO_TOO_LARGE",
  });
  expect(projects.some((p) => p.status === "preparing")).toBe(false);
  expect(
    vi.mocked(snapshot).mock.calls.find((call) => call[1] === 55)?.[4],
  ).toEqual(["src"]);
});
