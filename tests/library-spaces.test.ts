import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.ts");
async function setup() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  const ownerId = await t.mutation(internal.accounts.syncUser, {
    subject: "space-owner",
    email: "owner@example.test",
    name: "Synthetic owner",
  });
  const otherId = await t.mutation(internal.accounts.syncUser, {
    subject: "space-other",
    email: "other@example.test",
    name: "Synthetic other",
  });
  const owner = t.withIdentity({ subject: "space-owner" });
  const other = t.withIdentity({ subject: "space-other" });
  const organizationId = await owner.mutation(
    api.organizations.createPrivate,
    {},
  );
  const sourceId = await owner.mutation(api.product.capture, {
    organizationId,
    key: "synthetic-spaces",
    kind: "text",
    title: "Synthetic private idea",
    text: "Own synthetic text",
    rightsAttested: true,
  });
  const args = {
    organizationId,
    expectedVersion: 0,
    focus: ["personal", "business"] as ("personal" | "business")[],
    goal: "Understand my saved ideas",
    interests: ["Cooking"],
    role: "Owner",
    connectSpaces: true,
    confirmed: false,
    stage: 2 as const,
  };
  return { t, owner, other, ownerId, otherId, organizationId, sourceId, args };
}
it("resumes user-provenance drafts and rejects stale confirmation or implied connections", async () => {
  const s = await setup();
  const first = await s.owner.mutation(api.librarySpaces.saveSetup, s.args);
  expect(first).toMatchObject({
    version: 1,
    confirmed: false,
    stage: 2 as const,
    provenance: "user",
  });
  expect(
    await s.owner.query(api.librarySpaces.setup, {
      organizationId: s.organizationId,
    }),
  ).toMatchObject({ goal: s.args.goal, interests: ["Cooking"] });
  await expect(
    s.owner.mutation(api.librarySpaces.saveSetup, {
      ...s.args,
      confirmed: true,
    }),
  ).rejects.toThrow("STALE_APPROVAL");
  await expect(
    s.owner.mutation(api.librarySpaces.saveSetup, {
      ...s.args,
      expectedVersion: 1,
      focus: ["personal"],
      connectSpaces: true,
    }),
  ).rejects.toThrow("INVALID_INPUT");
  await s.owner.mutation(api.librarySpaces.saveSetup, {
    ...s.args,
    expectedVersion: 1,
    connectSpaces: false,
    confirmed: true,
  });
  expect(
    await s.owner.query(api.librarySpaces.setup, {
      organizationId: s.organizationId,
    }),
  ).toMatchObject({ version: 2, connectSpaces: false, confirmed: true });
  expect(await s.t.run((ctx) => ctx.db.query("outbox").collect())).toEqual([]);
});
it("files one canonical source in both views idempotently without changing its analysis, credits or categories", async () => {
  const s = await setup();
  const before = await s.t.run((ctx) => ctx.db.get(s.sourceId));
  const file = {
    organizationId: s.organizationId,
    sourceId: s.sourceId,
    spaces: ["personal", "business"] as ("personal" | "business")[],
  };
  await Promise.all([
    s.owner.mutation(api.librarySpaces.fileSource, file),
    s.owner.mutation(api.librarySpaces.fileSource, file),
  ]);
  expect(
    await s.t.run((ctx) => ctx.db.query("sourceSpaces").collect()),
  ).toHaveLength(2);
  for (const space of file.spaces)
    expect(
      (
        await s.owner.query(api.librarySpaces.list, {
          organizationId: s.organizationId,
          space,
        })
      ).items,
    ).toEqual([
      expect.objectContaining({ id: s.sourceId, title: before?.title }),
    ]);
  expect(await s.t.run((ctx) => ctx.db.get(s.sourceId))).toEqual(before);
  expect(await s.t.run((ctx) => ctx.db.query("outbox").collect())).toEqual([]);
  expect(
    await s.t.run((ctx) => ctx.db.query("reservations").collect()),
  ).toEqual([]);
  await s.owner.mutation(api.librarySpaces.fileSource, {
    ...file,
    spaces: ["business"],
  });
  expect(
    (
      await s.owner.query(api.librarySpaces.list, {
        organizationId: s.organizationId,
        space: "personal",
      })
    ).items,
  ).toEqual([]);
  expect(
    (
      await s.owner.query(api.librarySpaces.exportPage, {
        organizationId: s.organizationId,
      })
    ).items,
  ).toEqual([
    expect.objectContaining({
      sourceId: s.sourceId,
      space: "business",
      provenance: "user",
    }),
  ]);
});
it("denies another account including accidental private membership, wrong source ownership and shared workspace labels", async () => {
  const s = await setup();
  await s.t.run((ctx) =>
    ctx.db.insert("memberships", {
      organizationId: s.organizationId,
      userId: s.otherId,
      role: "owner",
    }),
  );
  for (const request of [
    () =>
      s.other.query(api.librarySpaces.setup, {
        organizationId: s.organizationId,
      }),
    () =>
      s.other.query(api.librarySpaces.list, {
        organizationId: s.organizationId,
        space: "personal",
      }),
    () =>
      s.other.query(api.librarySpaces.exportPage, {
        organizationId: s.organizationId,
      }),
    () => s.other.mutation(api.librarySpaces.saveSetup, s.args),
    () =>
      s.other.mutation(api.librarySpaces.fileSource, {
        organizationId: s.organizationId,
        sourceId: s.sourceId,
        spaces: ["personal"],
      }),
  ])
    await expect(request()).rejects.toThrow("unavailable");
  const otherPrivate = await s.other.mutation(
    api.organizations.createPrivate,
    {},
  );
  await expect(
    s.other.mutation(api.librarySpaces.fileSource, {
      organizationId: otherPrivate,
      sourceId: s.sourceId,
      spaces: ["personal"],
    }),
  ).rejects.toThrow("FORBIDDEN");
  const shared = await s.owner.mutation(api.organizations.create, {
    name: "Personal",
  });
  await expect(
    s.owner.mutation(api.librarySpaces.saveSetup, {
      ...s.args,
      organizationId: shared,
    }),
  ).rejects.toThrow("FORBIDDEN");
  expect(
    await s.owner.query(api.librarySpaces.setup, { organizationId: shared }),
  ).toBeNull();
});
it("drops revoked access immediately and source deletion removes filing before background cleanup", async () => {
  const s = await setup();
  await s.owner.mutation(api.librarySpaces.fileSource, {
    organizationId: s.organizationId,
    sourceId: s.sourceId,
    spaces: ["personal", "business"],
  });
  await s.owner.mutation(api.product.deleteSource, { id: s.sourceId });
  expect(
    await s.t.run((ctx) => ctx.db.query("sourceSpaces").collect()),
  ).toEqual([]);
  expect(
    (
      await s.owner.query(api.librarySpaces.exportPage, {
        organizationId: s.organizationId,
      })
    ).items,
  ).toEqual([]);
  await expect(
    s.owner.mutation(api.librarySpaces.fileSource, {
      organizationId: s.organizationId,
      sourceId: s.sourceId,
      spaces: ["personal"],
    }),
  ).rejects.toThrow("FORBIDDEN");
  const member = await s.t.run((ctx) =>
    ctx.db
      .query("memberships")
      .withIndex("by_pair", (q) =>
        q.eq("organizationId", s.organizationId).eq("userId", s.ownerId),
      )
      .unique(),
  );
  await s.t.run((ctx) => ctx.db.delete(member!._id));
  await expect(
    s.owner.query(api.librarySpaces.list, {
      organizationId: s.organizationId,
      space: "personal",
    }),
  ).rejects.toThrow("unavailable");
});
it("reads at most one 30-row metadata page and advances the cursor without leaking canonical evidence", async () => {
  const s = await setup();
  await s.t.run(async (ctx) => {
    for (let i = 0; i < 35; i++) {
      const id = await ctx.db.insert("sources", {
        ...(await ctx.db.get(s.sourceId))!,
        _id: undefined,
        _creationTime: undefined,
        key: `synthetic-${i}`,
        canonical: `synthetic-${i}`,
      } as any);
      await ctx.db.insert("sourceSpaces", {
        organizationId: s.organizationId,
        sourceId: id,
        space: "personal",
        actor: s.ownerId,
        provenance: "user",
        updatedAt: i,
      });
      await ctx.db.insert("dashboardCards", {
        organizationId: s.organizationId,
        entityId: id,
        kind: "source",
        sourceId: id,
        title: `Synthetic ${i}`,
        state: "saved",
        createdAt: i,
        updatedAt: i,
      });
    }
  });
  const page = await s.owner.query(api.librarySpaces.list, {
    organizationId: s.organizationId,
    space: "personal",
  });
  expect(page.items).toHaveLength(30);
  expect(page.next).toBeTruthy();
  expect(
    page.items.every(
      (item) => !("text" in item) && !("analysis" in item) && !("url" in item),
    ),
  ).toBe(true);
  expect(
    (
      await s.owner.query(api.librarySpaces.list, {
        organizationId: s.organizationId,
        space: "personal",
        cursor: page.next!,
      })
    ).items,
  ).toHaveLength(5);
});

it("requires confirmed cross-space choice on every connected page and fences revoked or unconfirmed preferences", async () => {
  const s = await setup();
  await s.owner.mutation(api.librarySpaces.fileSource, {
    organizationId: s.organizationId,
    sourceId: s.sourceId,
    spaces: ["personal", "business"],
  });
  await expect(
    s.owner.query(api.librarySpaces.connected, {
      organizationId: s.organizationId,
    }),
  ).rejects.toThrow("FORBIDDEN");
  await s.owner.mutation(api.librarySpaces.saveSetup, s.args);
  await expect(
    s.owner.query(api.librarySpaces.connected, {
      organizationId: s.organizationId,
    }),
  ).rejects.toThrow("FORBIDDEN");
  await s.owner.mutation(api.librarySpaces.saveSetup, {
    ...s.args,
    expectedVersion: 1,
    confirmed: true,
  });
  expect(
    (
      await s.owner.query(api.librarySpaces.connected, {
        organizationId: s.organizationId,
      })
    ).items,
  ).toHaveLength(1);
  await s.owner.mutation(api.librarySpaces.saveSetup, {
    ...s.args,
    expectedVersion: 2,
    confirmed: true,
    connectSpaces: false,
  });
  await expect(
    s.owner.query(api.librarySpaces.connected, {
      organizationId: s.organizationId,
    }),
  ).rejects.toThrow("FORBIDDEN");
  expect(
    (
      await s.owner.query(api.librarySpaces.list, {
        organizationId: s.organizationId,
        space: "personal",
      })
    ).items,
  ).toHaveLength(1);
});
