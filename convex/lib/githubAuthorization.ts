"use node";
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { decrypt, encrypt } from "../../packages/providers/secrets";
import { github } from "../../packages/providers/github";
import { ensure } from "../../packages/policy";
import {
  decodeGitHubCredential,
  githubRefreshRequired,
  refreshGitHubCredential,
  type GitHubUserCredential,
} from "../../packages/providers/github-user";
export async function authorizeRepository(
  ctx: ActionCtx,
  repo: {
    organizationId: any;
    installationId: number;
    providerId: number;
    fullName: string;
  },
) {
  const link = await ctx.runQuery(internal.githubLinks.binding, {
    organizationId: repo.organizationId,
    installationId: repo.installationId,
    providerId: repo.providerId,
    fullName: repo.fullName,
  });
  let stored = decodeGitHubCredential(
    decrypt(link.ciphertext, link.keyVersion, repo.organizationId, "github"),
  );
  if (githubRefreshRequired(stored)) {
    const leaseKey = crypto.randomUUID();
    await ctx.runMutation(internal.githubLinks.claimRefresh, {
      id: link._id,
      previous: link.ciphertext,
      leaseKey,
    });
    try {
      const renewed = await refreshGitHubCredential(
        stored as GitHubUserCredential,
      );
      const user = await github("/user", renewed.accessToken);
      ensure(
        user.id === renewed.githubUserId,
        "RECONNECT_REQUIRED",
        "GitHub identity changed during renewal.",
      );
      const saved = await ctx.runMutation(internal.githubLinks.finishRefresh, {
        id: link._id,
        previous: link.ciphertext,
        leaseKey,
        ...encrypt(JSON.stringify(renewed), repo.organizationId, "github"),
      });
      ensure(
        saved,
        "RECONNECT_REQUIRED",
        "GitHub connection changed during renewal. Retry with the current connection.",
      );
      stored = renewed;
    } catch (error) {
      await ctx.runMutation(internal.githubLinks.failRefresh, {
        id: link._id,
        previous: link.ciphertext,
        leaseKey,
      });
      throw error;
    }
  }
  const token = stored.accessToken;
  let current;
  try {
    current = await github(`/repos/${repo.fullName}`, token);
  } catch (error) {
    if (error instanceof Error && "status" in error && error.status === 401)
      await ctx.runMutation(internal.githubLinks.invalidateCredential, {
        id: link._id,
        previous: link.ciphertext,
      });
    throw error;
  }
  ensure(
    current.id === repo.providerId &&
      (current.permissions?.push ||
        current.permissions?.admin ||
        current.permissions?.maintain),
    "FORBIDDEN",
    "Repository access changed. Reconnect GitHub.",
  );
}
