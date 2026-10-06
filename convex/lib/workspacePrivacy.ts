import type { Doc, Id } from "../_generated/dataModel";

// Labels organize content. This ownership field is the authorization boundary.
// Legacy workspaces retain their membership policy until explicitly changed.
export function workspaceReadable(
  workspace: Doc<"organizations"> | null,
  actorId: Id<"users">,
) {
  return (
    workspace?.status === "active" &&
    (!workspace.privateOwnerId || workspace.privateOwnerId === actorId)
  );
}
