import { convexTest } from "convex-test";
import { expect, it } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.ts");
it("keeps plan preference personal, off by default and independent of hosted authorization", async () => {
  const t = convexTest(schema, modules);
  for (const subject of ["preference-alice", "preference-bob"])
    await t.mutation(internal.accounts.syncUser, {
      subject,
      email: `${subject}@example.test`,
      name: subject,
    });
  const alice = t.withIdentity({ subject: "preference-alice" }),
    bob = t.withIdentity({ subject: "preference-bob" });
  const a = await alice.mutation(api.organizations.create, {
      name: "Preference A",
    }),
    b = await bob.mutation(api.organizations.create, { name: "Preference B" });
  expect(
    await alice.query(api.aiPreferences.read, { organizationId: a }),
  ).toEqual({
    preferChatGPTPlan: false,
    hostedStatus: "awaiting_commercial_access",
    active: false,
    personalAlphaEnabled: false,
    linkAnalysisEnabled: false,
  });
  await expect(
    bob.mutation(api.aiPreferences.save, {
      organizationId: a,
      preferChatGPTPlan: true,
    }),
  ).rejects.toThrow("Organization unavailable");
  await alice.mutation(api.aiPreferences.save, {
    organizationId: a,
    preferChatGPTPlan: true,
  });
  expect(
    (await alice.query(api.aiPreferences.read, { organizationId: a })).active,
  ).toBe(false);
  expect(
    (await alice.query(api.accounts.exportAccount, {})).profile
      .preferChatGPTPlan,
  ).toBe(true);
  expect(
    (await bob.query(api.aiPreferences.read, { organizationId: b }))
      .preferChatGPTPlan,
  ).toBe(false);
  await alice.mutation(api.aiPreferences.save, {
    organizationId: a,
    preferChatGPTPlan: false,
  });
  expect(
    (await alice.query(api.aiPreferences.read, { organizationId: a }))
      .preferChatGPTPlan,
  ).toBe(false);
});
