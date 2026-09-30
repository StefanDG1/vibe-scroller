import type { MutationCtx } from "../_generated/server";
export async function subjectHash(subject: string) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`vibescroller-deleted-subject-v1:${subject}`),
  );
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
export async function rememberDeletion(
  ctx: MutationCtx,
  kind: "account" | "workspace",
  target: string,
  hash?: string,
  at = Date.now(),
) {
  const old = await ctx.db
    .query("deletionMarkers")
    .withIndex("by_target", (q) => q.eq("kind", kind).eq("target", target))
    .unique();
  if (!old)
    await ctx.db.insert("deletionMarkers", {
      kind,
      target,
      subjectHash: hash,
      at,
    });
}
