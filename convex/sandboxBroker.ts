import { mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { verifySandboxRequest } from "../packages/policy/sandbox-broker";

// Machine identity within our trusted broker boundary. Customer identity and
// execution approval remain enforced by the existing job mutations/actions.
export const consume = mutation({
  args: { body: v.string(), signature: v.string() },
  handler: async (ctx, a) => {
    if (
      process.env.SANDBOX_BRIDGE_ENABLED !== "true" ||
      process.env.RESTORE_LOCK === "true"
    )
      return false;
    const request = await verifySandboxRequest(
      a.body,
      a.signature,
      process.env.SANDBOX_BRIDGE_SECRET ?? "",
    );
    if (!request) return false;
    const existing = await ctx.db
      .query("webhookReceipts")
      .withIndex("by_key", (q) =>
        q.eq("provider", "sandbox-broker").eq("key", request.nonce),
      )
      .unique();
    if (existing) return false;
    const id = await ctx.db.insert("webhookReceipts", {
      provider: "sandbox-broker",
      key: request.nonce,
      at: Date.now(),
      state: "consumed",
    });
    await ctx.scheduler.runAfter(60000, internal.sandboxBroker.expire, { id });
    return true;
  },
});
export const expire = internalMutation({
  args: { id: v.id("webhookReceipts") },
  handler: async (ctx, a) => {
    const receipt = await ctx.db.get(a.id);
    if (
      receipt?.provider === "sandbox-broker" &&
      receipt.at < Date.now() - 30000
    )
      await ctx.db.delete(a.id);
  },
});
