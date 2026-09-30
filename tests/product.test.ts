import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { reserve } from "../convex/product";
import {
  safeSourceUrl,
  safePath,
  validatePaths,
  prState,
  monthlyAnchor,
  taxTreatment,
  invoiceDeadline,
  containsSecret,
} from "../packages/policy";
import {
  insightOutput,
  proposalOutput,
  runnerJob,
} from "../packages/contracts";
import fixture from "../fixtures/insight.json";
import proposalFixture from "../fixtures/proposal.json";
import jobFixture from "../fixtures/runner-job.json";
const modules = import.meta.glob("../convex/**/*.ts");
async function setup() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  for (const subject of ["a", "b"])
    await t.mutation(internal.accounts.syncUser, {
      subject,
      email: `${subject}@example.test`,
      name: subject,
    });
  const a = t.withIdentity({ subject: "a" }),
    b = t.withIdentity({ subject: "b" });
  const org = await a.mutation(api.organizations.create, { name: "A" }),
    other = await b.mutation(api.organizations.create, { name: "B" });
  return { t, a, b, org, other };
}
describe("VibeScroller product boundaries", () => {
  it("imports a full 500-row paid batch and deduplicates it without per-row credit use", async () => {
    const { t, a, org } = await setup();
    const start = Date.now();
    await t.mutation(internal.commerce.grantPeriod, {
      organizationId: org,
      subscription: "sub_bulk_test",
      tier: "pro",
      interval: "monthly",
      start,
      end: start + 31 * 86400000,
      verifiedPayment: true,
    });
    const rows = Array.from({ length: 500 }, (_, i) => ({
      url: `https://youtube.com/watch?v=synthetic${i}`,
    }));
    const args = {
      organizationId: org,
      key: "bulk-500-test",
      format: "json" as const,
      text: JSON.stringify(rows),
      rightsAttested: true,
    };
    expect((await a.mutation(api.imports.links, args)).accepted).toBe(500);
    const replay = await a.mutation(api.imports.links, args);
    expect(replay.duplicate).toBe(500);
    await t.run(async (ctx) => {
      expect((await ctx.db.query("sourceCounts").collect())[0].active).toBe(
        500,
      );
      expect((await ctx.db.query("reservations").collect()).length).toBe(0);
    });
  });
  it("imports links with a tenant-scoped manifest and no analysis charges", async () => {
    const { a, b, org } = await setup();
    const args = {
      organizationId: org,
      key: "import-001",
      format: "json" as const,
      rightsAttested: true,
      text: JSON.stringify([
        {
          url: "https://youtube.com/watch?v=one",
          title: "Synthetic imported link",
          collection: "Research",
          saved_at: "2025-01-01T00:00:00Z",
        },
        { url: "https://youtube.com/watch?v=one" },
        { url: "https://example.com/private" },
        { url: "file:///secret" },
      ]),
    };
    await expect(b.mutation(api.imports.links, args)).rejects.toThrow();
    const manifest = await a.mutation(api.imports.links, args);
    expect(manifest).toMatchObject({
      accepted: 1,
      duplicate: 1,
      unsupported: 1,
      invalid: 1,
      analysisCreditsCharged: 0,
    });
    const source = await a.query(api.product.detail, {
      id: manifest.entries[0].sourceId as any,
    });
    expect(source.originalSavedAt).toBe(Date.UTC(2025, 0, 1));
    expect(source.state).toBe("needs_upload");
    expect(source.tags).toEqual(["Research"]);
  });
  it("grants paid upgrade differences once and blocks new work on failed payment", async () => {
    const { t, a, org } = await setup();
    const start = Date.now(),
      end = start + 7 * 86400000;
    const base = {
      organizationId: org,
      subscription: "sub_synthetic",
      interval: "weekly" as const,
      start,
      end,
      verifiedPayment: true,
    };
    await t.mutation(internal.commerce.grantPeriod, {
      ...base,
      tier: "starter",
    });
    await Promise.all([
      t.mutation(internal.commerce.grantPeriod, { ...base, tier: "pro" }),
      t.mutation(internal.commerce.grantPeriod, { ...base, tier: "pro" }),
    ]);
    await t.run(async (ctx) => {
      const pool = (await ctx.db.query("creditPools").collect())[0];
      expect(pool.granted).toBe(150);
      expect((await ctx.db.query("billingPeriods").collect()).length).toBe(1);
    });
    await t.mutation(internal.commerce.grantPeriod, {
      ...base,
      tier: "starter",
    });
    await t.run(async (ctx) => {
      expect((await ctx.db.query("creditPools").collect())[0].granted).toBe(
        150,
      );
    });
    await t.mutation(internal.billing.attach, {
      organizationId: org,
      customerId: "cus_synthetic",
    });
    await t.mutation(internal.billing.apply, {
      customerId: "cus_synthetic",
      status: "past_due",
      periodEnd: end,
      revision: 1,
    });
    await expect(
      t.mutation(internal.commerce.budgetFixture, {
        organizationId: org,
        key: "failed-payment-work",
        max: 1,
      }),
    ).rejects.toThrow("PAYMENT_REQUIRED");
    expect(
      (await a.query(api.product.library, { organizationId: org })).total,
    ).toBe(0);
  });
  it("preserves original transcript and invalidates old analysis after correction", async () => {
    const { t, a, b, org } = await setup();
    const id = await a.mutation(api.product.capture, {
      organizationId: org,
      key: "correction-001",
      kind: "text",
      title: "Correction test",
      text: "Original evidence",
      rightsAttested: true,
    });
    await expect(
      b.mutation(api.product.editSource, {
        id,
        summary: "Edited",
        tags: [],
        correctedText: "Corrected evidence",
      }),
    ).rejects.toThrow();
    await a.mutation(api.product.editSource, {
      id,
      summary: "Edited",
      tags: [],
      correctedText: "Corrected evidence",
    });
    await t.run(async (ctx) => {
      const source = await ctx.db.get(id);
      expect(source?.originalText).toBe("Original evidence");
      expect(source?.text).toBe("Corrected evidence");
      expect(source?.generation).toBe(1);
      expect(source?.analysis).toBeUndefined();
      expect(source?.state).toBe("saved");
    });
    await a.mutation(api.product.editSource, {
      id,
      summary: "Edited again",
      tags: [],
      correctedText: "Second correction",
    });
    await t.run(async (ctx) => {
      expect((await ctx.db.get(id))?.originalText).toBe("Original evidence");
    });
    await expect(
      a.mutation(api.product.editSource, {
        id,
        summary: "",
        tags: [],
        correctedText: " ",
      }),
    ).rejects.toThrow();
  });
  it("validates supplied schemas and rejects model privilege additions", () => {
    expect(insightOutput.safeParse(fixture).success).toBe(true);
    expect(proposalOutput.safeParse(proposalFixture).success).toBe(true);
    expect(runnerJob.safeParse(jobFixture).success).toBe(true);
    expect(
      insightOutput.safeParse({ ...fixture, execute: "steal credentials" })
        .success,
    ).toBe(false);
    expect(
      runnerJob.safeParse({ ...jobFixture, maxRuntimeSeconds: 999999 }).success,
    ).toBe(false);
  });
  it("rejects SSRF hosts, credentials, unexpected ports and URL schemes", () => {
    for (const u of [
      "http://youtube.com/a",
      "https://127.0.0.1/a",
      "https://[::1]/a",
      "https://youtube.com.evil.test/a",
      "https://youtube.com@evil.test/a",
      "https://youtube.com:8080/a",
      "file:///etc/passwd",
      "https://169.254.169.254/",
    ])
      expect(() => safeSourceUrl(u)).toThrow();
    expect(
      safeSourceUrl("https://www.youtube.com/watch?v=abc&utm_source=x"),
    ).toBe("https://www.youtube.com/watch?v=abc");
  });
  it("rejects path traversal, forbidden paths, scope changes and secret material", () => {
    for (const p of [
      "../secret",
      "/home/file",
      "a/../../x",
      "C:/secret",
      "a\\b",
    ])
      expect(safePath(p)).toBe(false);
    expect(() => validatePaths([".env"], [".env"], true)).toThrow();
    expect(() => validatePaths(["src/new.ts"], ["src/approved.ts"])).toThrow();
    expect(() =>
      validatePaths(["billing/index.ts"], ["billing/index.ts"]),
    ).toThrow();
    expect(containsSecret("-----BEGIN PRIVATE KEY-----")).toBe(true);
  });
  it("keeps source capture, direct detail, profiles, runs and usage tenant-scoped", async () => {
    const { a, b, org, other } = await setup();
    const id = await a.mutation(api.product.capture, {
      organizationId: org,
      key: "capture-001",
      kind: "text",
      title: "Private source",
      text: "My original supplied transcript",
      rightsAttested: true,
    });
    for (const promise of [
      b.query(api.product.detail, { id }),
      b.query(api.product.library, { organizationId: org }),
      b.query(api.product.repositories, { organizationId: org }),
      b.query(api.product.proposals, { organizationId: org }),
      b.query(api.product.usage, { organizationId: org }),
      b.query(api.jobs.exportData, { organizationId: org }),
    ])
      await expect(promise).rejects.toThrow();
    expect(
      (await b.query(api.product.library, { organizationId: other })).total,
    ).toBe(0);
  });
  it("deduplicates concurrent workspace imports without cross-workspace reuse", async () => {
    const { a, b, org, other } = await setup();
    const args = {
      organizationId: org,
      key: "capture-001",
      kind: "text",
      title: "Source",
      text: "same transcript",
      rightsAttested: true,
    };
    const ids = await Promise.all([
      a.mutation(api.product.capture, args),
      a.mutation(api.product.capture, { ...args, key: "capture-002" }),
    ]);
    expect(ids[0]).toBe(ids[1]);
    const separate = await b.mutation(api.product.capture, {
      ...args,
      organizationId: other,
    });
    expect(separate).not.toBe(ids[0]);
  });
  it("limits trials and refuses unconfirmed rights or fabricated source types", async () => {
    const { a, org } = await setup();
    const base = {
      organizationId: org,
      key: "capture-001",
      kind: "text",
      title: "Source",
      text: "text",
      rightsAttested: true,
    };
    await expect(
      a.mutation(api.product.capture, { ...base, rightsAttested: false }),
    ).rejects.toThrow();
    await expect(
      a.mutation(api.product.capture, { ...base, kind: "execute" }),
    ).rejects.toThrow();
    for (let i = 0; i < 3; i++)
      await a.mutation(api.product.capture, {
        ...base,
        key: `capture-${i}`,
        text: `text${i}`,
      });
    await expect(
      a.mutation(api.product.capture, { ...base, text: "fourth" }),
    ).rejects.toThrow();
  });
  it("deletion redacts source content and records a restore tombstone", async () => {
    const { t, a, b, org } = await setup();
    const id = await a.mutation(api.product.capture, {
      organizationId: org,
      key: "capture-001",
      kind: "text",
      title: "Source",
      text: "private",
      rightsAttested: true,
    });
    await expect(
      b.mutation(api.product.deleteSource, { id }),
    ).rejects.toThrow();
    await a.mutation(api.product.deleteSource, { id });
    await expect(a.query(api.product.detail, { id })).rejects.toThrow();
    expect(
      (await a.query(api.product.library, { organizationId: org })).total,
    ).toBe(0);
    await t.run(async (ctx) => {
      const source = await ctx.db.get(id);
      expect(source?.text).toBeUndefined();
      expect((await ctx.db.query("tombstones").collect())[0].target).toBe(id);
    });
  });
  it("does not call a metadata link an analyzed video", async () => {
    const { a, org } = await setup();
    const id = await a.mutation(api.product.capture, {
      organizationId: org,
      key: "capture-001",
      kind: "url",
      title: "Unavailable",
      url: "https://instagram.com/p/abc",
      rightsAttested: true,
    });
    const s = await a.query(api.product.detail, { id });
    expect(s.state).toBe("needs_upload");
    expect(s.coverage).toBe("metadata_only");
    expect(s.summary).toBeUndefined();
    await expect(
      a.mutation(api.product.processSource, { id, maxCredits: 10 }),
    ).rejects.toThrow();
  });
  it("distinguishes closed without merge, draft, reopened and verified merge", () => {
    expect(prState({ state: "closed", merged_at: null })).toBe(
      "closed_unmerged",
    );
    expect(prState({ state: "closed", merged_at: "2026-09-30" })).toBe(
      "merged",
    );
    expect(prState({ state: "open", draft: true })).toBe("draft");
    expect(prState({ state: "open", draft: false })).toBe("open");
  });
  it("clamps monthly anchors and does not model calendar months as four weeks", () => {
    const start = Date.UTC(2026, 0, 31, 12);
    expect(new Date(monthlyAnchor(start, 1)).toISOString()).toBe(
      "2026-02-28T12:00:00.000Z",
    );
    expect(new Date(monthlyAnchor(start, 2)).toISOString()).toBe(
      "2026-03-31T12:00:00.000Z",
    );
  });
  it("gates live tax and treats special registration separately from domestic VAT", () => {
    const c = {
      domestic: "pending_evidence" as const,
      special317: true,
      registrations: [],
      countries: ["RO", "DE"],
      oss: false,
      reviewed: false,
    };
    expect(() => taxTreatment(c, "RO", false, false, true)).toThrow();
    const exempt = {
      ...c,
      domestic: "ro_small_business_exempt" as const,
      reviewed: true,
      evidence: "official-record",
      effectiveAt: 1,
    };
    expect(taxTreatment(exempt, "RO", false, false, true)).toBe(
      "exempt_article_310",
    );
    expect(() => taxTreatment(exempt, "DE", false, false, true)).toThrow();
    expect(() => taxTreatment(exempt, "DE", true, false, true)).toThrow();
    expect(
      taxTreatment(
        { ...exempt, domestic: "ro_normal_vat" },
        "RO",
        false,
        false,
        true,
      ),
    ).toBe("domestic_vat");
    expect(() => taxTreatment(exempt, "US", false, false, true)).toThrow();
  });
  it("requires a reviewed business-day calendar and skips weekends", () => {
    expect(() => invoiceDeadline(Date.UTC(2026, 8, 25), [], false)).toThrow();
    expect(
      new Date(invoiceDeadline(Date.UTC(2026, 8, 25), [], true)).toISOString(),
    ).toBe("2026-10-02T00:00:00.000Z");
  });
  it("grants the verified account trial once across workspaces and keeps the source cap after deletion", async () => {
    const { a, org } = await setup();
    const ids = [];
    for (let i = 0; i < 3; i++)
      ids.push(
        await a.mutation(api.product.capture, {
          organizationId: org,
          key: `trial-source-${i}`,
          kind: "text",
          title: `Trial ${i}`,
          text: `Supplied note ${i}`,
          rightsAttested: true,
        }),
      );
    await a.mutation(api.product.deleteSource, { id: ids[0] });
    await expect(
      a.mutation(api.product.capture, {
        organizationId: org,
        key: "trial-fourth",
        kind: "text",
        title: "Fourth",
        text: "Note",
        rightsAttested: true,
      }),
    ).rejects.toThrow();
    const second = await a.mutation(api.organizations.create, {
      name: "Second workspace",
    });
    await expect(
      a.mutation(api.product.capture, {
        organizationId: second,
        key: "second-trial",
        kind: "text",
        title: "Trial again",
        text: "Note",
        rightsAttested: true,
      }),
    ).rejects.toThrow();
  });
  it("serializes concurrent credit reservations and settles a usage event once", async () => {
    const { t, org } = await setup();
    const results = await Promise.allSettled(
      ["one", "two"].map((key) =>
        t.mutation(internal.commerce.budgetFixture, {
          organizationId: org,
          key,
          max: 20,
        }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const key = results[0].status === "fulfilled" ? "one" : "two";
    await Promise.all(
      [1, 2].map(() =>
        t.mutation(internal.commerce.settleUsage, {
          organizationId: org,
          key,
          credits: 7,
        }),
      ),
    );
    await t.run(async (ctx) => {
      const w = await ctx.db.query("wallets").first();
      expect(w?.spent).toBe(7);
      expect(w?.reserved).toBe(0);
      expect(await ctx.db.query("costEntries").collect()).toHaveLength(1);
      const budget = await ctx.db.query("operatorBudgets").collect();
      expect(budget.every((b) => b.spent === 7 && b.reserved === 0)).toBe(true);
    });
  });
  it("rejects another workspace's installation and one-time OAuth state replay", async () => {
    const { t, a, b, org, other } = await setup();
    const state = await a.mutation(api.githubLinks.begin, {
      organizationId: org,
    });
    const actor = await t.run(
      async (ctx) =>
        (await ctx.db
          .query("users")
          .withIndex("by_subject", (q) => q.eq("subject", "a"))
          .unique())!._id,
    );
    await expect(
      t.mutation(internal.githubLinks.consume, {
        organizationId: other,
        state,
        actor,
      }),
    ).rejects.toThrow();
    await t.mutation(internal.githubLinks.consume, {
      organizationId: org,
      state,
      actor,
    });
    await expect(
      t.mutation(internal.githubLinks.consume, {
        organizationId: org,
        state,
        actor,
      }),
    ).rejects.toThrow();
    await t.mutation(internal.githubLinks.save, {
      organizationId: org,
      githubUserId: 1,
      installations: [
        {
          installationId: 11,
          repositories: [{ id: 22, fullName: "owner/repo" }],
        },
      ],
    });
    await expect(
      t.query(internal.githubLinks.binding, {
        organizationId: other,
        installationId: 11,
        providerId: 22,
        fullName: "owner/repo",
      }),
    ).rejects.toThrow();
    await expect(
      b.query(api.githubLinks.choices, { organizationId: org }),
    ).rejects.toThrow();
  });
  it("does not accept fabricated visual evidence for a supplied transcript", async () => {
    const { t, a, org } = await setup();
    const id = await a.mutation(api.product.capture, {
      organizationId: org,
      key: "evidence-1",
      kind: "text",
      title: "Text",
      text: "Actual supplied text",
      rightsAttested: true,
    });
    const output = {
      ...fixture,
      sourceId: id,
      coverage: "caption_only",
      insights: fixture.insights.map((i) => ({
        ...i,
        evidence: [
          { kind: "frame", id: "supplied_text", startMs: 0, endMs: 1 },
        ],
      })),
    };
    await expect(
      t.mutation(internal.product.commitAnalysis, {
        id,
        generation: 0,
        output,
        credits: 0,
      }),
    ).rejects.toThrow();
    expect((await a.query(api.product.detail, { id })).summary).toBeUndefined();
  });
  it("keeps durable object cleanup after workspace purge", async () => {
    const { t, org } = await setup();
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("assets", {
        organizationId: org,
        key: `${org}/private.mp4`,
        state: "complete",
        size: 10,
        type: "video/mp4",
        expiresAt: now + 1000,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(org, { status: "deleting" });
    });
    await t.mutation(internal.maintenance.purgeOrganization, {
      organizationId: org,
    });
    await t.run(async (ctx) => {
      expect(await ctx.db.get(org)).toBeNull();
      expect(await ctx.db.query("assets").collect()).toHaveLength(0);
      const jobs = await ctx.db.query("objectDeletions").collect();
      expect(jobs[0]?.key).toBe(`${org}/private.mp4`);
      expect(jobs[0]?.state).toBe("pending");
    });
  });
});

describe("V1 library and resource allowances", () => {
  it("pages beyond the first thirty sources and searches only the authorized workspace", async () => {
    const { t, a, org, other } = await setup();
    await t.run(async (ctx) => {
      for (let i = 0; i < 45; i++)
        await ctx.db.insert("sources", {
          organizationId: org,
          key: `synthetic-page-${i}`,
          canonical: `synthetic-page-${i}`,
          kind: "text",
          title: `Synthetic pagination ${i}`,
          text: "test content",
          searchable: `Synthetic pagination ${i}`,
          state: "saved",
          coverage: "caption_only",
          tags: [],
          rightsAttested: true,
          generation: 0,
          createdAt: i,
          updatedAt: i,
        });
      await ctx.db.insert("sources", {
        organizationId: other,
        key: "foreign-synthetic",
        canonical: "foreign-synthetic",
        kind: "text",
        title: "foreign marker",
        searchable: "uniqueforeignmarker",
        state: "saved",
        coverage: "caption_only",
        tags: [],
        rightsAttested: true,
        generation: 0,
        createdAt: 1,
        updatedAt: 1,
      });
    });
    const first = await a.query(api.product.library, { organizationId: org });
    expect(first.items).toHaveLength(30);
    expect(first.next).toBeTruthy();
    const second = await a.query(api.product.library, {
      organizationId: org,
      cursor: first.next!,
    });
    expect(second.items).toHaveLength(15);
    expect(second.next).toBeNull();
    expect(
      new Set([...first.items, ...second.items].map((source) => source._id))
        .size,
    ).toBe(45);
    expect(
      (
        await a.query(api.product.library, {
          organizationId: org,
          search: "uniqueforeignmarker",
        })
      ).items,
    ).toHaveLength(0);
    await expect(
      a.query(api.product.library, { organizationId: org, state: "deleted" }),
    ).rejects.toThrow();
  });
  it("reserves pending upload bytes within the retained storage allowance", async () => {
    const { a, org } = await setup();
    for (let i = 0; i < 4; i++)
      await a.mutation(api.assets.grant, {
        organizationId: org,
        key: `${org}/synthetic-${i}`,
        size: 250000000,
        type: "video/mp4",
      });
    await expect(
      a.mutation(api.assets.grant, {
        organizationId: org,
        key: `${org}/synthetic-over`,
        size: 1,
        type: "video/mp4",
      }),
    ).rejects.toThrow();
  });
  it("requires fresh authentication before pairing and consumes approval once", async () => {
    const { t, org } = await setup();
    const stale = t.withIdentity({
      subject: "a",
      auth_time: Math.floor(Date.now() / 1000) - 301,
    });
    const fresh = t.withIdentity({
      subject: "a",
      auth_time: Math.floor(Date.now() / 1000),
    });
    const args = {
      organizationId: org,
      name: "Synthetic isolated device",
      fingerprint: "a".repeat(64),
      codeHash: "b".repeat(64),
    };
    await expect(stale.mutation(api.devices.start, args)).rejects.toThrow();
    const id = await fresh.mutation(api.devices.start, args);
    const approve = {
      id,
      fingerprint: args.fingerprint,
      credentialHash: "c".repeat(64),
    };
    await expect(
      stale.mutation(api.devices.approve, approve),
    ).rejects.toThrow();
    await fresh.mutation(api.devices.approve, approve);
    await expect(
      fresh.mutation(api.devices.approve, approve),
    ).rejects.toThrow();
  });
});

describe("persisted matching jobs", () => {
  it("rejects concurrent duplicates, permits a bounded failed retry and reuses the committed proposal", async () => {
    const { t, a, org } = await setup();
    const sourceId = await t.run((ctx) =>
      ctx.db.insert("sources", {
        organizationId: org,
        key: "synthetic-match",
        canonical: "synthetic-match",
        kind: "text",
        title: "Synthetic matching boundary",
        text: "Synthetic permitted note",
        state: "ready",
        coverage: "caption_only",
        tags: [],
        rightsAttested: true,
        generation: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        analysis: insightOutput.parse(fixture),
      }),
    );
    const repositoryId = await t.mutation(internal.jobs.saveRepository, {
      organizationId: org,
      installationId: 1,
      providerId: 1,
      fullName: "test/synthetic",
      sha: "a".repeat(40),
      branch: "main",
      manifest: proposalFixture.repositoryEvidence.map((e) => e.path),
      context: "Synthetic context only",
    });
    await a.mutation(api.product.saveProfile, {
      id: repositoryId,
      profile: "Synthetic test repository",
      confirmed: true,
      enabled: true,
    });
    const args = { id: sourceId, repositoryId, maxCredits: 10 };
    const first = await a.mutation(api.jobs.reserveMatch, args);
    await expect(a.mutation(api.jobs.reserveMatch, args)).rejects.toThrow();
    await t.mutation(internal.jobs.finishMatch, {
      organizationId: org,
      key: first.key,
      semanticKey: first.semanticKey,
      credits: 0,
    });
    const retry = await a.mutation(api.jobs.reserveMatch, args);
    expect(retry.key).not.toBe(first.key);
    const detail = {
      ...proposalFixture,
      repositoryId,
      baseSha: "a".repeat(40),
      profileVersion: 2,
      insightIds: fixture.insights.map((i) => i.id),
      sourceEvidence: fixture.insights.flatMap((i) => i.evidence),
    };
    const proposalId = await t.mutation(internal.product.addProposal, {
      sourceId,
      repositoryId,
      detail,
      matchKey: retry.semanticKey,
      sourceGeneration: 1,
    });
    expect(
      await t.mutation(internal.product.addProposal, {
        sourceId,
        repositoryId,
        detail,
        matchKey: retry.semanticKey,
        sourceGeneration: 1,
      }),
    ).toBe(proposalId);
    await t.mutation(internal.jobs.finishMatch, {
      organizationId: org,
      key: retry.key,
      semanticKey: retry.semanticKey,
      credits: 0,
      proposalId: proposalId!,
    });
    expect((await a.mutation(api.jobs.reserveMatch, args)).cached).toBe(true);
    await t.run(async (ctx) => {
      const proposal = await ctx.db.get(proposalId!);
      await ctx.db.patch(proposalId!, {
        disposition: "no_fit",
        detail: { ...proposal!.detail, disposition: "no_fit" },
      });
    });
    await expect(
      a.mutation(api.product.decide, {
        id: proposalId!,
        version: 1,
        decision: "accepted",
        note: "",
      }),
    ).rejects.toThrow();
    await expect(
      a.mutation(api.product.decide, {
        id: proposalId!,
        version: 1,
        decision: "accepted",
        disposition: "relevant",
        note: "",
      }),
    ).rejects.toThrow();
    await a.mutation(api.product.decide, {
      id: proposalId!,
      version: 1,
      decision: "accepted",
      disposition: "relevant",
      note: "The reviewer checked the repository and the proposed document is absent.",
    });
    const corrected = await t.run((ctx) => ctx.db.get(proposalId!));
    expect(corrected!.version).toBe(2);
    expect(corrected!.detail.disposition).toBe("no_fit");
    expect(corrected!.reviewerCorrection!.from).toBe("no_fit");
    expect(corrected!.disposition).toBe("relevant");
    await expect(
      a.mutation(api.product.decide, {
        id: proposalId!,
        version: 1,
        decision: "accepted",
        note: "",
      }),
    ).rejects.toThrow();

    expect(
      await t.run((ctx) => ctx.db.query("proposals").collect()),
    ).toHaveLength(1);
  });
});

describe("verified media evidence", () => {
  it("rejects foreign frames, stale generations and invented timing before committing a funded analysis", async () => {
    const { t, a, b, org, other } = await setup();
    const create = (organizationId: typeof org) =>
      t.run((ctx) =>
        ctx.db.insert("sources", {
          organizationId,
          key: crypto.randomUUID(),
          canonical: crypto.randomUUID(),
          kind: "upload",
          title: "Synthetic media test",
          state: "queued",
          coverage: "metadata_only",
          tags: [],
          rightsAttested: true,
          generation: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      );
    const sourceId = await create(org),
      foreignSource = await create(other);
    const frame = await t.mutation(internal.assets.registerEvidence, {
      sourceId,
      generation: 1,
      key: `${org}/synthetic-frame`,
      size: 32,
      etag: "synthetic",
    });
    const foreign = await t.mutation(internal.assets.registerEvidence, {
      sourceId: foreignSource,
      generation: 1,
      key: `${other}/synthetic-frame`,
      size: 32,
      etag: "synthetic",
    });
    await expect(
      b.query(api.assets.evidence, { id: frame! }),
    ).rejects.toThrow();
    await expect(
      t.mutation(internal.product.stageMedia, {
        id: sourceId,
        generation: 1,
        transcript: "",
        coverage: "visual_only",
        evidence: [{ kind: "frame", id: foreign!, startMs: 0, endMs: 0 }],
      }),
    ).rejects.toThrow();
    expect(
      await t.mutation(internal.product.stageMedia, {
        id: sourceId,
        generation: 0,
        transcript: "",
        coverage: "visual_only",
        evidence: [],
      }),
    ).toBe(false);
    await t.mutation(internal.product.stageMedia, {
      id: sourceId,
      generation: 1,
      transcript: "",
      coverage: "visual_only",
      evidence: [{ kind: "frame", id: frame!, startMs: 100, endMs: 100 }],
    });
    await t.run((ctx) => reserve(ctx, org, `source:${sourceId}:1`, 10));
    const output = {
      ...fixture,
      sourceId,
      processingRunId: `${sourceId}:1`,
      coverage: "visual_only",
      insights: fixture.insights.map((i) => ({
        ...i,
        evidence: [{ kind: "frame", id: frame!, startMs: 999, endMs: 999 }],
      })),
    };
    await expect(
      t.mutation(internal.product.commitAnalysis, {
        id: sourceId,
        generation: 1,
        output,
        credits: 0,
      }),
    ).rejects.toThrow();
    output.insights = output.insights.map((i) => ({
      ...i,
      evidence: [{ kind: "frame", id: frame!, startMs: 100, endMs: 100 }],
    }));
    await t.mutation(internal.product.commitAnalysis, {
      id: sourceId,
      generation: 1,
      output,
      credits: 0,
    });
    expect((await a.query(api.product.detail, { id: sourceId })).coverage).toBe(
      "visual_only",
    );
    await a.mutation(api.product.deleteSource, { id: sourceId });
    await expect(
      a.query(api.assets.evidence, { id: frame! }),
    ).rejects.toThrow();
  });
});
