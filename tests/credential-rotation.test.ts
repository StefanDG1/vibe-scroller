import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { encrypt, decrypt } from "../packages/providers/secrets";
const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => vi.unstubAllEnvs());
it("migrates authenticated credential envelopes without changing capability revisions and reports corrupt ciphertext without revealing it", async () => {
  vi.stubEnv("SECRET_KEY_VERSION", "syntheticOld");
  vi.stubEnv("SECRET_KEY_syntheticOld", Buffer.alloc(32, 7).toString("base64"));
  vi.stubEnv("SECRET_KEY_syntheticNew", Buffer.alloc(32, 8).toString("base64"));
  const t = convexTest(schema, modules);
  await t.mutation(internal.accounts.syncUser, {
    subject: "synthetic-rotation",
    email: "rotation@example.test",
    name: "Synthetic",
  });
  const owner = t.withIdentity({ subject: "synthetic-rotation" });
  const org = await owner.mutation(api.organizations.create, {
    name: "Synthetic rotation",
  });
  const saved = encrypt("Owned synthetic credential canary", org, "github");
  await t.mutation(internal.jobs.storeSecret, {
    organizationId: org,
    provider: "github",
    ...saved,
  });
  const prior = (await t.query(internal.jobs.secret, {
    organizationId: org,
    provider: "github",
  }))!;
  vi.stubEnv("SECRET_KEY_VERSION", "syntheticNew");
  expect(await t.action(internal.credentialRotation.status, {})).toEqual({
    oldVersions: 1,
    checked: 1,
    unreadable: 0,
  });
  expect(await t.action(internal.credentialRotation.rotate, {})).toEqual({
    migrated: 1,
  });
  const next = (await t.query(internal.jobs.secret, {
    organizationId: org,
    provider: "github",
  }))!;
  expect(next.revision).toBe(prior.revision);
  expect(next.keyVersion).toBe("syntheticNew");
  expect(decrypt(next.ciphertext, next.keyVersion, org, "github")).toBe(
    "Owned synthetic credential canary",
  );
  expect(() =>
    decrypt(next.ciphertext, next.keyVersion, "foreign", "github"),
  ).toThrow();
  expect(await t.action(internal.credentialRotation.rotate, {})).toEqual({
    migrated: 0,
  });
  expect(await t.action(internal.credentialRotation.status, {})).toEqual({
    oldVersions: 0,
    checked: 1,
    unreadable: 0,
  });
  await t.run((ctx) =>
    ctx.db.patch(next._id, { ciphertext: saved.ciphertext }),
  );
  const bad = await t.action(internal.credentialRotation.status, {});
  expect(bad).toEqual({ oldVersions: 0, checked: 1, unreadable: 1 });
  expect(JSON.stringify(bad)).not.toContain("canary");
});
