import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import type { EvidenceFrame } from "../packages/recovery/evidence-backup.mjs";
const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => vi.unstubAllEnvs());
async function setup() {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(internal.accounts.syncUser, {
    subject: "synthetic-recovery-a",
    email: "recovery-a@example.test",
    name: "Synthetic",
  });
  await t.mutation(internal.accounts.syncUser, {
    subject: "synthetic-recovery-b",
    email: "recovery-b@example.test",
    name: "Synthetic",
  });
  const a = t.withIdentity({ subject: "synthetic-recovery-a" }),
    b = t.withIdentity({ subject: "synthetic-recovery-b" });
  const org = await a.mutation(api.organizations.create, {
      name: "Synthetic restore A",
    }),
    other = await b.mutation(api.organizations.create, {
      name: "Synthetic restore B",
    });
  return { t, a, b, org, other, userId };
}
it("blocks private access during restoration and reapplies a latest source marker without touching a foreign workspace", async () => {
  const { t, a, org, other } = await setup();
  const ids = await t.run(async (ctx) => {
    const make = (organizationId: typeof org) =>
      ctx.db.insert("sources", {
        organizationId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        key: `synthetic:${organizationId}`,
        canonical: `synthetic:${organizationId}`,
        kind: "text",
        title: "Owned synthetic restore",
        text: "Owned synthetic private content",
        tags: [],
        state: "ready",
        coverage: "caption_only",
        generation: 1,
        rightsAttested: true,
      });
    return { own: await make(org), foreign: await make(other) };
  });
  await a.mutation(api.product.deleteSource, { id: ids.own });
  const page = await t.query(internal.recovery.markerPage, {
    section: "tombstones",
    cursor: null,
  });
  await t.run(async (ctx) => {
    await ctx.db.patch(ids.own, {
      state: "ready",
      text: "Synthetic resurrected backup content",
    });
  });
  await expect(
    t.mutation(internal.recovery.applyMarkers, { entries: page.page }),
  ).rejects.toThrow("POLICY_BLOCKED");
  vi.stubEnv("RESTORE_LOCK", "true");
  await expect(
    a.query(api.product.library, { organizationId: org }),
  ).rejects.toThrow("Recovery");
  await t.mutation(internal.recovery.applyMarkers, { entries: page.page });
  const restored = await t.run(async (ctx) => ctx.db.get(ids.own));
  expect(restored?.text).toBeUndefined();
  await expect(
    t.mutation(internal.recovery.applyMarkers, {
      entries: [
        {
          kind: "source",
          target: ids.foreign,
          organizationId: org,
          at: Date.now(),
        },
      ],
    }),
  ).rejects.toThrow("FORBIDDEN");
  expect(
    await t.run(async (ctx) => (await ctx.db.get(ids.foreign))?.text),
  ).toBe("Owned synthetic private content");
});
it("preserves workspace deletion markers after purge and prevents a late callback from recreating a deleted identity", async () => {
  const { t, a, org, userId } = await setup();
  await a.mutation(api.organizations.remove, {
    organizationId: org,
    confirmation: "Synthetic restore A",
  });
  await t.mutation(internal.maintenance.purgeOrganization, {
    organizationId: org,
  });
  const markers = await t.query(internal.recovery.markerPage, {
    section: "deletionMarkers",
    cursor: null,
  });
  expect(
    markers.page.some((m) => m.kind === "workspace" && m.target === org),
  ).toBe(true);
  await a.mutation(api.accounts.deleteAccount, {
    confirmation: "recovery-a@example.test",
  });
  await t.run(async (ctx) => {
    await ctx.db.delete(userId);
  });
  await expect(
    t.mutation(internal.accounts.syncUser, {
      subject: "synthetic-recovery-a",
      email: "recovery-a@example.test",
      name: "Synthetic",
    }),
  ).rejects.toThrow("identity was deleted");
  const latest = await t.query(internal.recovery.markerPage, {
    section: "deletionMarkers",
    cursor: null,
  });
  expect(JSON.stringify(latest.page)).not.toContain("recovery-a@example.test");
  expect(JSON.stringify(latest.page)).not.toContain("synthetic-recovery-a");
});

it("inventories only surviving retained frames and fences deletion or source changes between pages", async () => {
  const { t, org, other } = await setup();
  const state = await t.run(async (ctx) => {
    const source = await ctx.db.insert("sources", {
      organizationId: org,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      key: "synthetic-evidence-inventory",
      canonical: "synthetic:evidence-inventory",
      kind: "text",
      title: "Synthetic evidence inventory",
      tags: [],
      state: "ready",
      coverage: "full_sampled",
      generation: 2,
      rightsAttested: true,
    });
    for (const [key, extra] of [
      ["retained", {}],
      ["retired", {}],
      ["expired", { expiresAt: Date.now() - 1000 }],
      ["temporary", { kind: "normalized_audio", type: "audio/wav" }],
      ["foreign", { organizationId: other }],
    ] as const)
      await ctx.db.insert("assets", {
        organizationId: org,
        sourceId: source,
        key: `${org}/${key}`,
        size: 40,
        type: "image/jpeg",
        kind: "evidence",
        state: "complete",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...extra,
      });
    await ctx.db.insert("objectDeletions", {
      key: `${org}/retired`,
      state: "deleted",
      attempts: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { source, key: `${org}/retained` };
  });
  const asOf = Date.now() + 10;
  vi.useFakeTimers();
  vi.setSystemTime(asOf);
  try {
    const entries = [];
    let cursor: string | null = null,
      pages = 0;
    do {
      const page: {
        entries: EvidenceFrame[];
        isDone: boolean;
        cursor: string;
      } = await t.query(internal.recovery.evidencePage, {
        asOf,
        cursor,
        limit: 2,
      });
      entries.push(...page.entries);
      pages++;
      cursor = page.isDone ? null : page.cursor;
    } while (cursor);
    expect(pages).toBe(3);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      key: state.key,
      generation: 2,
      type: "image/jpeg",
    });
    vi.stubEnv("R2_ENDPOINT", "https://synthetic.eu.r2.cloudflarestorage.com");
    vi.stubEnv("R2_BUCKET", "synthetic-evidence");
    vi.stubEnv("R2_ACCESS_KEY_ID", "synthetic-backup-read-key");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "synthetic-backup-read-secret");
    const lease = await t.query(internal.recoveryStorage.evidenceReadLease, {
      key: state.key,
      asOf,
    });
    expect(lease).not.toBeNull();
    expect(new URL(lease!.url).searchParams.get("X-Amz-Expires")).toBe("60");
    for (const name of ["retired", "expired", "temporary", "foreign"])
      expect(
        await t.query(internal.recoveryStorage.evidenceReadLease, {
          key: `${org}/${name}`,
          asOf,
        }),
      ).toBeNull();
    await t.run((ctx) => ctx.db.patch(state.source, { generation: 3 }));
    expect(
      await t.query(internal.recovery.evidenceCurrent, {
        key: state.key,
        asOf,
      }),
    ).toMatchObject({ generation: 3 });
    await t.run((ctx) =>
      ctx.db.insert("tombstones", {
        target: state.source,
        organizationId: org,
        at: asOf,
      }),
    );
    expect(
      await t.query(internal.recovery.evidenceCurrent, {
        key: state.key,
        asOf,
      }),
    ).toBeNull();
    expect(
      await t.query(internal.recoveryStorage.evidenceReadLease, {
        key: state.key,
        asOf,
      }),
    ).toBeNull();
    await expect(
      t.query(internal.recovery.evidencePage, {
        asOf,
        cursor: null,
        limit: 26,
      }),
    ).rejects.toThrow("INVALID_INPUT");
  } finally {
    vi.useRealTimers();
  }
});
