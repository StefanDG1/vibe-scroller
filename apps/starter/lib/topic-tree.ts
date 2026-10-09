export type TopicNode = {
  id: string;
  parentId?: string;
  children: TopicNode[];
};
// Retain a whole returned path when capping accumulated cursor pages.
export function boundTopicHierarchy<
  T extends { id: string; parentId?: string; autoCategory?: boolean },
>(topics: T[]): T[] {
  const records = new Map(topics.map((topic) => [topic.id, topic]));
  const retained = new Map<string, T>();
  for (const topic of [...records.values()].reverse()) {
    if (topic.autoCategory) continue;
    const path: T[] = [];
    const seen = new Set<string>();
    let node: T | undefined = topic;
    while (node && !seen.has(node.id) && path.length < 12) {
      seen.add(node.id);
      path.unshift(node);
      node = node.parentId ? records.get(node.parentId) : undefined;
    }
    if (
      retained.size + path.filter((item) => !retained.has(item.id)).length >
      40
    )
      continue;
    for (const item of path) retained.set(item.id, item);
  }
  return [...retained.values()];
}
export function topicPath<T extends { id: string; parentId?: string }>(
  topics: T[],
  id: string,
): T[] {
  const records = new Map(topics.slice(-40).map((topic) => [topic.id, topic]));
  const path: T[] = [];
  const seen = new Set<string>();
  let current = records.get(id);
  while (current && !seen.has(current.id) && path.length < 12) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId ? records.get(current.parentId) : undefined;
  }
  return path;
}
// Only returned topics can appear as parents. A missing parent stays a root on this page.
export function buildTopicTree(topics: { id: string; parentId?: string }[]) {
  const nodes = new Map(
    topics
      .slice(-40)
      .map((t) => [
        t.id,
        { id: t.id, parentId: t.parentId, children: [] } as TopicNode,
      ]),
  );
  const roots = [];
  for (const node of nodes.values()) {
    const seen = new Set([node.id]);
    let ancestor = node.parentId;
    let cycle = false;
    for (let depth = 0; ancestor && nodes.has(ancestor); depth++) {
      if (seen.has(ancestor) || depth >= 12) {
        cycle = true;
        break;
      }
      seen.add(ancestor);
      ancestor = nodes.get(ancestor)?.parentId;
    }
    const parent =
      !cycle && node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}
