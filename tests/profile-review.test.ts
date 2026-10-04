import rateLimiterTest from "@convex-dev/rate-limiter/test";
import workflowTest from "@convex-dev/workflow/test";
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { BUSINESS_CONTEXT_VERSION } from "../packages/repositories/business-context";

const modules = import.meta.glob("../convex/**/*.ts");
async function setup() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  workflowTest.register(t);
  for (const subject of ["owner", "foreign", "member", "admin"])
    await t.mutation(internal.accounts.syncUser, {
      subject,
      email: `${subject}@example.test`,
      name: subject,
    });
  const owner = t.withIdentity({ subject: "owner" });
  const org = await owner.mutation(api.organizations.create, {
    name: "Synthetic review",
  });
  await t.run(async (ctx) => {
    for (const role of ["member", "admin"] as const) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_subject", (q) => q.eq("subject", role))
        .unique();
      await ctx.db.insert("memberships", {
        organizationId: org,
        userId: user!._id,
        role,
      });
    }
  });
  const id = await t.mutation(internal.jobs.saveRepository, {
    organizationId: org,
    installationId: 1,
    providerId: 1,
    fullName: "synthetic/context-review",
    sha: "a".repeat(40),
    branch: "main",
    manifest: ["README.md"],
    context: "Synthetic test only",
    contextExcerpts: [
      {
        path: "README.md",
        startLine: 1,
        endLine: 1,
        content: "Synthetic test only",
        blobSha: "b".repeat(40),
      },
    ],
  });
  await t.run((ctx) =>
    ctx.db.patch(id, {
      profile: "Confirmed owner correction",
      confirmed: true,
      profileDraft: "Unconfirmed proposal",
      profileDraftSha: "a".repeat(40),
      profileDraftVersion: 1,
      profileDraftProcessingVersion: BUSINESS_CONTEXT_VERSION,
    }),
  );
  const args = {
    id,
    sha: "a".repeat(40),
    version: 1,
    selectionVersion: 0,
    previousDraft: "Unconfirmed proposal",
    profile: "Evidence correction, still awaiting owner review",
  };
  return { t, owner, org, id, args };
}

describe("Unconfirmed context review", () => {
  it("persists review edits and reuses them without changing confirmed authority or wallet", async () => {
    const { t, owner, org, id, args } = await setup();
    const before = await t.run((ctx) => ctx.db.query("wallets").collect());
    expect(await owner.mutation(api.profiles.saveDraft, args)).toEqual({
      saved: true,
    });
    const r = await t.run((ctx) => ctx.db.get(id));
    expect(r).toMatchObject({
      profile: "Confirmed owner correction",
      confirmed: true,
      profileVersion: 1,
      profileDraft: args.profile,
      profileDraftSha: args.sha,
      profileDraftVersion: 1,
      profileDraftProcessingVersion: BUSINESS_CONTEXT_VERSION,
    });
    expect(await t.run((ctx) => ctx.db.query("wallets").collect())).toEqual(
      before,
    );
    expect(
      (
        await owner.mutation(api.profiles.start, {
          id,
          key: "synthetic-review-key",
          maxCredits: 10,
        })
      ).cached,
    ).toBe(true);
    const audit = await t.run((ctx) => ctx.db.query("audit").collect());
    expect(
      audit.some(
        (a) =>
          a.organizationId === org &&
          a.action === "repository.context_draft_saved" &&
          a.target === id,
      ),
    ).toBe(true);
    expect(JSON.stringify(audit)).not.toContain(args.profile);
    await expect(owner.mutation(api.profiles.saveDraft, args)).rejects.toThrow(
      "APPROVAL_STALE",
    );
    expect(
      await t
        .withIdentity({ subject: "admin" })
        .mutation(api.profiles.saveDraft, {
          ...args,
          previousDraft: args.profile,
          profile: "Admin review edit",
        }),
    ).toEqual({ saved: true });
  });
  it("denies foreign/member access, stale inputs, invalid text and unresolved usage without clearing holds", async () => {
    const { t, owner, id, args } = await setup();
    for (const subject of ["foreign", "member"])
      await expect(
        t.withIdentity({ subject }).mutation(api.profiles.saveDraft, args),
      ).rejects.toThrow();
    for (const change of [
      { sha: "b".repeat(40) },
      { version: 2 },
      { selectionVersion: 1 },
      { previousDraft: "A newer proposal" },
    ])
      await expect(
        owner.mutation(api.profiles.saveDraft, { ...args, ...change }),
      ).rejects.toThrow("APPROVAL_STALE");
    for (const profile of [
      " ",
      "x".repeat(8001),
      "-----BEGIN " + "PRIVATE KEY-----",
    ])
      await expect(
        owner.mutation(api.profiles.saveDraft, { ...args, profile }),
      ).rejects.toThrow("POLICY_BLOCKED");
    await t.run((ctx) => ctx.db.patch(id, { snapshotPaths: ["src"] }));
    await expect(owner.mutation(api.profiles.saveDraft, args)).rejects.toThrow(
      "APPROVAL_STALE",
    );
    await t.run((ctx) =>
      ctx.db.patch(id, {
        snapshotPaths: [],
        profileDraftKey: "unknown-usage-hold",
      }),
    );
    await expect(owner.mutation(api.profiles.saveDraft, args)).rejects.toThrow(
      "SOURCE_BUSY",
    );
    expect((await t.run((ctx) => ctx.db.get(id)))?.profileDraftKey).toBe(
      "unknown-usage-hold",
    );
    await t.run((ctx) => ctx.db.patch(id, { enabled: false }));
    await expect(owner.mutation(api.profiles.saveDraft, args)).rejects.toThrow(
      "FORBIDDEN",
    );
  });
});
