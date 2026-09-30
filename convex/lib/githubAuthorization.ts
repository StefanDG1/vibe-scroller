"use node";
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { decrypt } from "../../packages/providers/secrets";
import { github } from "../../packages/providers/github";
import { ensure } from "../../packages/policy";
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
  const token = decrypt(
    link.ciphertext,
    link.keyVersion,
    repo.organizationId,
    "github",
  );
  const current = await github(`/repos/${repo.fullName}`, token);
  ensure(
    current.id === repo.providerId &&
      (current.permissions?.push ||
        current.permissions?.admin ||
        current.permissions?.maintain),
    "FORBIDDEN",
    "Repository access changed. Reconnect GitHub.",
  );
}
