import { v } from "convex/values";
export const revertEvidenceValidator = v.object({
  mergeCommitSha: v.string(),
  revertCommitSha: v.string(),
  url: v.string(),
  observedAt: v.number(),
});
export const revertStatusValidator = v.union(
  v.literal("verified"),
  v.literal("not_observed"),
  v.literal("search_limited"),
  v.literal("unverified"),
);
