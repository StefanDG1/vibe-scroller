"use node";
import { createHmac, timingSafeEqual } from "node:crypto";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
export const webhook = internalAction({
  args: { body: v.string(), signature: v.string(), delivery: v.string() },
  handler: async (ctx, a) => {
    if (process.env.RESTORE_LOCK === "true")
      return { status: 503, category: "RECOVERY_LOCKED" };
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (
      !secret ||
      a.body.length > 1000000 ||
      !/^[a-zA-Z0-9-]{8,100}$/.test(a.delivery)
    )
      return { status: 400, category: "DELIVERY_OR_SETUP_INVALID" };
    const expected = `sha256=${createHmac("sha256", secret).update(a.body).digest("hex")}`;
    if (
      expected.length !== a.signature.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(a.signature))
    )
      return { status: 400, category: "SIGNATURE_INVALID" };
    let payload;
    try {
      payload = JSON.parse(a.body);
    } catch {
      return { status: 400 };
    }
    const installationId = payload.installation?.id,
      repositoryId = payload.repository?.id,
      prNumber = payload.pull_request?.number;
    if (prNumber !== undefined) {
      if (
        ![installationId, repositoryId, prNumber].every(
          (n) => Number.isSafeInteger(n) && n > 0,
        )
      )
        return { status: 400 };
      await ctx.runMutation(internal.jobs.enqueuePR, {
        delivery: a.delivery,
        installationId,
        repositoryId,
        prNumber,
      });
    }
    return { status: 200 };
  },
});
