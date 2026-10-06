import { workspaceReadable } from "./workspacePrivacy";
import type { QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

// Verification, bounded operator acceptance and public release are distinct.
// A saved AI preference never authorizes another funding route.
export function hostedMediaAllowed(subject: string) {
  if (
    process.env.DISABLE_INFERENCE === "true" ||
    process.env.RESTORE_LOCK === "true"
  )
    return false;
  const verified = process.env.HOSTED_MEDIA_ANALYSIS_VERIFIED === "true";
  if (process.env.HOSTED_MEDIA_PUBLIC_RELEASE_APPROVED === "true")
    return verified;
  if (!verified && process.env.HOSTED_MEDIA_ACCEPTANCE_ENABLED !== "true")
    return false;
  try {
    const subjects = JSON.parse(
      process.env.HOSTED_MEDIA_ANALYSIS_SUBJECTS_JSON ?? "[]",
    );
    return (
      Array.isArray(subjects) &&
      subjects.length <= 10 &&
      subjects.every(
        (value) =>
          typeof value === "string" &&
          value.trim().length > 0 &&
          value.length <= 200,
      ) &&
      subjects.includes(subject)
    );
  } catch {
    return false;
  }
}

export async function hostedSourceAllowed(
  ctx: QueryCtx,
  source: Doc<"sources">,
) {
  if (!source.managedAnalysisActor || source.state === "deleted") return false;
  const actor = await ctx.db.get(source.managedAnalysisActor);
  const organization = await ctx.db.get(source.organizationId);
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_pair", (q) =>
      q
        .eq("organizationId", source.organizationId)
        .eq("userId", source.managedAnalysisActor!),
    )
    .unique();
  return (
    actor?.status === "active" &&
    workspaceReadable(organization, source.managedAnalysisActor) &&
    !!membership &&
    ["owner", "admin", "member"].includes(membership.role) &&
    hostedMediaAllowed(actor.subject)
  );
}
