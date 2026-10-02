"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Snapshot } from "@vercel/sandbox";
import { sandboxCredentials } from "../packages/providers/sandbox";
import {
  maintenanceLease,
  renewCleanTools,
} from "../packages/providers/tool-renewal";
import { ensure } from "../packages/policy";
export const renew = internalAction({
  args: {
    kind: v.union(v.literal("media"), v.literal("coding")),
    force: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    a,
  ): Promise<{
    renewed: boolean;
    snapshotId?: string;
    expiresAt?: number;
    computeSeconds?: number;
  }> => {
    if (
      process.env.SANDBOX_SNAPSHOT_RENEWAL_ENABLED !== "true" ||
      process.env.RESTORE_LOCK === "true"
    )
      return { renewed: false };
    let current = await ctx.runQuery(internal.sandboxSnapshots.current, {
      kind: a.kind,
    });
    if (!current) {
      ensure(
        process.env[
          a.kind === "media" ? "MEDIA_VERIFIED" : "CLOUD_VERIFIED"
        ] === "true",
        "SETUP_REQUIRED",
        "The initial clean tool image must already be verified.",
      );
      const snapshotId =
        process.env[
          a.kind === "media"
            ? "VERCEL_MEDIA_SNAPSHOT"
            : "VERCEL_CODING_SNAPSHOT"
        ];
      ensure(
        snapshotId,
        "SETUP_REQUIRED",
        "Configure the verified seed image.",
      );
      const { snapshots: _snapshots, ...credentials } =
        await sandboxCredentials();
      const snapshot = await Snapshot.get({ ...credentials, snapshotId });
      ensure(
        snapshot.expiresAt,
        "SETUP_REQUIRED",
        "The provider must supply its actual expiry.",
      );
      await ctx.runMutation(internal.sandboxSnapshots.seed, {
        kind: a.kind,
        snapshotId,
        expiresAt: snapshot.expiresAt.getTime(),
        projectId: process.env.VERCEL_SANDBOX_PROJECT_ID!,
        teamId: process.env.VERCEL_SANDBOX_TEAM_ID!,
      });
      current = await ctx.runQuery(internal.sandboxSnapshots.current, {
        kind: a.kind,
      });
    }
    const lease = maintenanceLease();
    const claim = await ctx.runMutation(internal.sandboxSnapshots.claim, {
      kind: a.kind,
      lease,
      force: a.force === true,
    });
    if (!claim) return { renewed: false };
    let next;
    try {
      next = await renewCleanTools(claim);
      await ctx.runMutation(internal.sandboxSnapshots.promote, {
        kind: a.kind,
        lease,
        parentSnapshotId: claim.snapshotId,
        ...next,
      });
      return {
        renewed: true,
        snapshotId: next.snapshotId,
        expiresAt: next.expiresAt,
        computeSeconds: next.computeSeconds,
      };
    } catch {
      if (next) {
        const observed = await ctx
          .runQuery(internal.sandboxSnapshots.current, { kind: a.kind })
          .catch(() => null);
        if (observed?.snapshotId === next.snapshotId)
          return {
            renewed: true,
            snapshotId: next.snapshotId,
            expiresAt: next.expiresAt,
            computeSeconds: next.computeSeconds,
          };
        // An uncertain promotion receipt must never delete the active image.
        // Delete only after an authoritative read shows another active image.
        if (observed) {
          try {
            const { snapshots: _snapshots, ...credentials } =
              await sandboxCredentials();
            const abandoned = await Snapshot.get({
              ...credentials,
              snapshotId: next.snapshotId,
            });
            await abandoned.delete({ signal: AbortSignal.timeout(30000) });
          } catch {
            /* An unknown cleanup receipt is not reported as deletion. */
          }
        }
      }
      await ctx.runMutation(internal.sandboxSnapshots.failed, {
        kind: a.kind,
        lease,
      });
      throw Error(
        "Clean tools renewal receipt is incomplete. Inspect the active image before retrying.",
      );
    }
  },
});
