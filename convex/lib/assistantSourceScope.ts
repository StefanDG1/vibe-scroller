import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

/** Call only after the current actor, membership and grant have been authorized. */
export async function sourceWithinAssistantScope(
  ctx: QueryCtx,
  grant: Doc<"assistantGrants">,
  organization: Doc<"organizations">,
  actor: Id<"users">,
  source: Doc<"sources"> | null,
  checkRevision = true,
) {
  if (
    !source ||
    source.organizationId !== organization._id ||
    source.state === "deleted" ||
    !source.rightsAttested
  )
    return false;
  if (grant.libraryScope === "all") return true;
  if (grant.libraryScope) {
    if (organization.privateOwnerId !== actor) return false;
    const rows = await ctx.db
      .query("sourceSpaces")
      .withIndex("by_source", (q) => q.eq("sourceId", source._id))
      .take(3);
    return rows.some(
      (row) =>
        row.organizationId === organization._id &&
        row.actor === actor &&
        row.space === grant.libraryScope,
    );
  }
  return grant.sources.some(
    (ref) =>
      ref.sourceId === source._id &&
      ref.generation === source.generation &&
      (!checkRevision || ref.revision === source.updatedAt),
  );
}
