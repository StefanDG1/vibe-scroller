import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { topicCategoryPath } from "../../packages/categories/topic-hierarchy";

export async function organizeTopicAutomatically(
  ctx: MutationCtx,
  topic: Doc<"knowledgeTopics">,
) {
  if (
    topic.redirect ||
    topic.autoCategory ||
    topic.parentId ||
    (topic.layoutVersion ?? 0) > 0
  )
    return false;
  let parentId: Id<"knowledgeTopics"> | undefined;
  const path = topicCategoryPath(topic.name);
  // Avoid making a category its own identically named leaf.
  if (path.at(-1)?.toLowerCase() === topic.name.toLowerCase()) path.pop();
  for (let index = 0; index < path.length; index++) {
    const name = path[index];
    const key = `filing:v1:${path.slice(0, index + 1).join("/")}`;
    let category = await ctx.db
      .query("knowledgeTopics")
      .withIndex("by_key", (q) =>
        q.eq("organizationId", topic.organizationId).eq("key", key),
      )
      .unique();
    if (!category) {
      const id = await ctx.db.insert("knowledgeTopics", {
        organizationId: topic.organizationId,
        key,
        name,
        autoCategory: true,
        parentId,
        pinned: false,
        version: 1,
        state: "ready",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      category = (await ctx.db.get(id))!;
    }
    if (category.redirect || !category.autoCategory) return false;
    parentId = category._id;
  }
  if (!parentId) return false;
  await ctx.db.patch(topic._id, {
    parentId,
    layoutVersion: (topic.layoutVersion ?? 0) + 1,
    searchText: [topic.name, ...(topic.aliases ?? []), ...path].join(" "),
  });
  return true;
}
