import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import {
  decodeGitHubCredential,
  githubCredential,
  githubRefreshRequired,
  refreshGitHubCredential,
} from "../packages/providers/github-user";
const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("preserves expiring credentials without accepting incomplete refresh responses", async () => {
  const stored = githubCredential(
    {
      access_token: "ghu_synthetic_old",
      expires_in: 28800,
      refresh_token: "ghr_synthetic_old",
      refresh_token_expires_in: 15897600,
    },
    42,
    1000,
  );
  expect(decodeGitHubCredential(JSON.stringify(stored))).toEqual(stored);
  expect(githubRefreshRequired(stored, stored.accessExpiresAt! - 60001)).toBe(
    false,
  );
  expect(githubRefreshRequired(stored, stored.accessExpiresAt! - 60000)).toBe(
    true,
  );
  expect(decodeGitHubCredential("ghu_legacy_synthetic")).toEqual({
    accessToken: "ghu_legacy_synthetic",
  });
  expect(() =>
    githubCredential({ access_token: "ghu_incomplete", expires_in: 28800 }, 42),
  ).toThrow("incomplete credential");
  expect(() =>
    decodeGitHubCredential(JSON.stringify({ ...stored, injected: true })),
  ).toThrow();
  vi.stubEnv("GITHUB_APP_CLIENT_ID", "synthetic-id");
  vi.stubEnv("GITHUB_APP_CLIENT_SECRET", "synthetic-secret");
  const calls: any[] = [];
  vi.stubGlobal("fetch", async (_: string, a: any) => {
    calls.push(JSON.parse(a.body));
    return Response.json({
      access_token: "ghu_synthetic_new",
      expires_in: 28800,
      refresh_token: "ghr_synthetic_new",
      refresh_token_expires_in: 15897600,
    });
  });
  const current = { ...stored, refreshExpiresAt: Date.now() + 100000 };
  const renewed = await refreshGitHubCredential(current);
  expect(renewed.githubUserId).toBe(42);
  expect(renewed.refreshToken).toBe("ghr_synthetic_new");
  expect(calls[0].grant_type).toBe("refresh_token");
  expect(calls[0].refresh_token).toBe("ghr_synthetic_old");
  calls.length = 0;
  await expect(
    refreshGitHubCredential({ ...current, refreshExpiresAt: Date.now() - 1 }),
  ).rejects.toThrow("Reconnect GitHub");
  expect(calls).toHaveLength(0);
});
async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.accounts.syncUser, {
    subject: "github-renewal-test",
    email: "synthetic@example.test",
    name: "Synthetic renewal",
  });
  const actor = t.withIdentity({ subject: "github-renewal-test" });
  const organizationId = await actor.mutation(api.organizations.create, {
    name: "Synthetic renewal",
  });
  await t.mutation(internal.jobs.storeSecret, {
    organizationId,
    provider: "github",
    ciphertext: "encrypted-old",
    keyVersion: "1",
  });
  const row = await t.query(internal.jobs.secret, {
    organizationId,
    provider: "github",
  });
  return { t, actor, organizationId, id: row!._id };
}
it("serializes one-use refreshes and rejects late results after replacement or disconnect", async () => {
  const { t, actor, organizationId, id } = await setup();
  const request = {
    id,
    previous: "encrypted-old",
    leaseKey: "synthetic-first",
  };
  await t.mutation(internal.githubLinks.claimRefresh, request);
  await expect(
    t.mutation(internal.githubLinks.claimRefresh, {
      ...request,
      leaseKey: "synthetic-second",
    }),
  ).rejects.toThrow("being renewed");
  await t.mutation(internal.jobs.storeSecret, {
    organizationId,
    provider: "github",
    ciphertext: "encrypted-reconnected",
    keyVersion: "2",
  });
  expect(
    await t.mutation(internal.githubLinks.finishRefresh, {
      ...request,
      ciphertext: "encrypted-stale",
      keyVersion: "1",
    }),
  ).toBe(false);
  await t.mutation(internal.githubLinks.failRefresh, request);
  let row = await t.query(internal.jobs.secret, {
    organizationId,
    provider: "github",
  });
  expect(row?.ciphertext).toBe("encrypted-reconnected");
  expect(row?.status).toBe("connected");
  const next = {
    id,
    previous: "encrypted-reconnected",
    leaseKey: "synthetic-current",
  };
  await t.mutation(internal.githubLinks.claimRefresh, next);
  await actor.mutation(api.jobs.revoke, { organizationId, provider: "github" });
  expect(
    await t.mutation(internal.githubLinks.finishRefresh, {
      ...next,
      ciphertext: "encrypted-new",
      keyVersion: "2",
    }),
  ).toBe(false);
  expect(
    await t.query(internal.jobs.secret, { organizationId, provider: "github" }),
  ).toBeNull();
});
it("expires stalled leases without letting the old worker replace the new result", async () => {
  vi.useFakeTimers();
  const { t, organizationId, id } = await setup();
  const first = { id, previous: "encrypted-old", leaseKey: "synthetic-first" };
  await t.mutation(internal.githubLinks.claimRefresh, first);
  vi.advanceTimersByTime(120001);
  const second = { ...first, leaseKey: "synthetic-next" };
  await t.mutation(internal.githubLinks.claimRefresh, second);
  expect(
    await t.mutation(internal.githubLinks.finishRefresh, {
      ...first,
      ciphertext: "encrypted-stale",
      keyVersion: "2",
    }),
  ).toBe(false);
  expect(
    await t.mutation(internal.githubLinks.finishRefresh, {
      ...second,
      ciphertext: "encrypted-current",
      keyVersion: "2",
    }),
  ).toBe(true);
  expect(
    (
      await t.query(internal.jobs.secret, {
        organizationId,
        provider: "github",
      })
    )?.ciphertext,
  ).toBe("encrypted-current");
});

it("marks rejected legacy credentials for reconnect without invalidating a replacement", async () => {
  const { t, organizationId, id } = await setup();
  await t.mutation(internal.githubLinks.invalidateCredential, {
    id,
    previous: "encrypted-old",
  });
  expect(
    (
      await t.query(internal.jobs.secret, {
        organizationId,
        provider: "github",
      })
    )?.status,
  ).toBe("needs_reconnect");
  await t.mutation(internal.jobs.storeSecret, {
    organizationId,
    provider: "github",
    ciphertext: "encrypted-reconnected",
    keyVersion: "2",
  });
  await t.mutation(internal.githubLinks.invalidateCredential, {
    id,
    previous: "encrypted-old",
  });
  expect(
    (
      await t.query(internal.jobs.secret, {
        organizationId,
        provider: "github",
      })
    )?.status,
  ).toBe("connected");
});
