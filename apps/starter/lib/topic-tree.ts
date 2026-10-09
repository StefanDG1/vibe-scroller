export type TopicNode = {
  id: string;
  parentId?: string;
  children: TopicNode[];
};
// Merge bounded server pages without moving previously loaded siblings.
// This cache contains returned metadata only; detail and authority stay server-bound.
export function boundTopicHierarchy<
  T extends { id: string; parentId?: string; autoCategory?: boolean },
>(topics: T[]): T[] {
  return [...new Map(topics.map((topic) => [topic.id, topic])).values()];
}
export function topicPath<T extends { id: string; parentId?: string }>(
  topics: T[],
  id: string,
): T[] {
  const records = new Map(topics.map((topic) => [topic.id, topic]));
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
    topics.map((t) => [
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

// Follow only returned, choice-free categories. A topic with its own insights
// and a child offers two destinations, so retain it as the stopping point.
export function singleChildTarget<
  T extends {
    id: string;
    parentId?: string;
    ideas?: number;
    autoCategory?: boolean;
  },
>(topics: T[], id: string): T | undefined {
  const records = new Map(topics.map((topic) => [topic.id, topic]));
  const nodes = new Map<string, TopicNode>();
  const collect = (node: TopicNode) => {
    nodes.set(node.id, node);
    node.children.forEach(collect);
  };
  buildTopicTree(topics).forEach(collect);
  let current = records.get(id);
  const seen = new Set(topicPath(topics, id).map((topic) => topic.id));
  while (current && seen.size < 12) {
    const children = nodes.get(current.id)?.children ?? [];
    if (
      children.length !== 1 ||
      (!current.autoCategory && (current.ideas ?? 0) > 0)
    )
      break;
    const child = children[0];
    if (seen.has(child.id)) break;
    seen.add(child.id);
    current = records.get(child.id) ?? current;
  }
  return current;
}
