import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => vi.unstubAllEnvs());
async function setup() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  await t.mutation(internal.accounts.syncUser, {
    subject: "synthetic-alpha-owner",
    email: "alpha@example.test",
    name: "Synthetic operator",
  });
  const owner = t.withIdentity({ subject: "synthetic-alpha-owner" });
  const existing = await owner.mutation(api.organizations.create, {
    name: "Synthetic original workspace",
  });
  await owner.mutation(api.product.capture, {
    organizationId: existing,
    key: "synthetic-original",
    kind: "text",
    title: "Synthetic original",
    text: "Original synthetic text",
    rightsAttested: true,
  });
  const privateId = await owner.mutation(api.organizations.createPrivate, {});
  const args = {
    organizationId: privateId,
    key: "synthetic-private",
    kind: "text",
    title: "Synthetic private",
    text: "Separate synthetic private text",
    rightsAttested: true,
  };
  return { t, owner, existing, privateId, args };
}
it("preserves the existing subject-gated personal storage allowance without renewing or spending the trial wallet", async () => {
  const s = await setup();
  vi.stubEnv("PERSONAL_ALPHA_SUBJECTS_JSON", '["synthetic-alpha-owner"]');
  const id = await s.owner.mutation(api.product.capture, s.args);
  expect((await s.t.run((ctx) => ctx.db.get(id)))?.state).toBe("saved");
  const wallets = await s.t.run((ctx) => ctx.db.query("wallets").collect());
  expect(wallets.find((w) => w.organizationId === s.existing)?.granted).toBe(
    30,
  );
  expect(wallets.find((w) => w.organizationId === s.privateId)).toMatchObject({
    granted: 0,
    spent: 0,
    purchased: 0,
    reserved: 0,
  });
  expect(
    await s.t.run((ctx) => ctx.db.query("trialClaims").collect()),
  ).toHaveLength(1);
  expect(
    await s.t.run((ctx) => ctx.db.query("reservations").collect()),
  ).toEqual([]);
  expect(await s.t.run((ctx) => ctx.db.query("outbox").collect())).toEqual([]);
});
it("keeps ordinary new-workspace capture blocked after the account's trial claim, including a disabled or wrong subject grant", async () => {
  const s = await setup();
  for (const subjects of ["[]", '["another-subject"]']) {
    vi.stubEnv("PERSONAL_ALPHA_SUBJECTS_JSON", subjects);
    await expect(s.owner.mutation(api.product.capture, s.args)).rejects.toThrow(
      "QUOTA_EXCEEDED",
    );
  }
  vi.stubEnv("PERSONAL_ALPHA_SUBJECTS_JSON", '["synthetic-alpha-owner"]');
  vi.stubEnv("DISABLE_PERSONAL_ANALYSIS", "true");
  await expect(s.owner.mutation(api.product.capture, s.args)).rejects.toThrow(
    "QUOTA_EXCEEDED",
  );
  expect(
    await s.t.run((ctx) => ctx.db.query("trialClaims").collect()),
  ).toHaveLength(1);
});
it("still enforces the accepted 1000-active-source personal ceiling", async () => {
  const s = await setup();
  vi.stubEnv("PERSONAL_ALPHA_SUBJECTS_JSON", '["synthetic-alpha-owner"]');
  await s.t.run((ctx) =>
    ctx.db.insert("sourceCounts", {
      organizationId: s.privateId,
      active: 1000,
      lifetime: 1000,
    }),
  );
  await expect(s.owner.mutation(api.product.capture, s.args)).rejects.toThrow(
    "QUOTA_EXCEEDED",
  );
});
