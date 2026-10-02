import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { signedReadObject } from "../packages/providers/storage-read";
import { retainedFrame } from "./recovery";

// Deployment administrators only. The backup job gets a short read lease for
// an authoritative retained frame, never an R2 credential or write capability.
export const evidenceReadLease = internalQuery({
  args: { key: v.string(), asOf: v.number() },
  handler: async (ctx, a): Promise<{ url: string } | null> => {
    const current = await retainedFrame(ctx, a.key, a.asOf);
    if (!current) return null;
    return { url: await signedReadObject(current.key) };
  },
});
