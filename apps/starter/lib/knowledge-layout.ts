import { buildKnowledgeMap } from "./knowledge-map";
import { buildTopicTree, type TopicNode } from "./topic-tree";

type Point = { id: string; x: number; y: number; radius: number };
/** Local bounded layout. Edges retain cited groups, never invented idea pairs. */
export function layoutKnowledgeNetwork(
  graph: ReturnType<typeof buildKnowledgeMap>,
  availableWidth = 1200,
) {
  const edges = graph.relations.flatMap((r) =>
    r.members.map((m) => ({
      from: `relation:${r.id}`,
      to: `insight:${m._id}`,
      kind: r.kind,
    })),
  );
  const ids = [
    ...graph.relations.map((r) => `relation:${r.id}`),
    ...graph.insights.map((m) => `insight:${m._id}`),
  ];
  const width = Math.max(
    220,
    Math.min(
      availableWidth,
      Math.max(760, Math.ceil(Math.sqrt(ids.length)) * 180),
    ),
  );
  const compact = width < 500;
  const height = compact
    ? Math.max(520, Math.ceil(ids.length / 2) * 120)
    : Math.max(520, Math.ceil(Math.sqrt(ids.length)) * 150);
  const degree = new Map<string, number>();
  for (const e of edges)
    for (const id of [e.from, e.to]) degree.set(id, (degree.get(id) ?? 0) + 1);
  const nodes: Point[] = ids.map((id, i) => ({
    id,
    x: width / 2 + Math.cos(i * 2.39996) * Math.sqrt(i + 1) * 75,
    y: height / 2 + Math.sin(i * 2.39996) * Math.sqrt(i + 1) * 65,
    radius:
      (compact ? 36 : 48) +
      Math.min(compact ? 10 : 18, (degree.get(id) ?? 0) * 3),
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (let iteration = 0; iteration < 160; iteration++) {
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i],
          b = nodes[j],
          dx = b.x - a.x,
          dy = b.y - a.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const minimum = a.radius + b.radius + (compact ? 18 : 32);
        const force =
          Math.max(0, minimum - distance) * 0.3 + 230 / (distance * distance);
        a.x -= (dx / distance) * force;
        a.y -= (dy / distance) * force;
        b.x += (dx / distance) * force;
        b.y += (dy / distance) * force;
      }
    for (const e of edges) {
      const a = byId.get(e.from)!,
        b = byId.get(e.to)!;
      const dx = b.x - a.x,
        dy = b.y - a.y,
        distance = Math.max(1, Math.hypot(dx, dy));
      const force = (distance - a.radius - b.radius - 72) * 0.025;
      a.x += (dx / distance) * force;
      a.y += (dy / distance) * force;
      b.x -= (dx / distance) * force;
      b.y -= (dy / distance) * force;
    }
    for (const n of nodes) {
      n.x = Math.max(n.radius + 20, Math.min(width - n.radius - 20, n.x));
      n.y = Math.max(n.radius + 20, Math.min(height - n.radius - 20, n.y));
    }
  }
  // Sparse topics can settle around the center of a tall phone world. Start
  // at actual evidence rather than an unused portion of that world.
  if (nodes.length) {
    const top = Math.min(...nodes.map((n) => n.y - n.radius));
    for (const n of nodes) n.y -= top - 20;
  }
  const occupiedHeight = Math.max(
    520,
    ...nodes.map((n) => n.y + n.radius + 20),
  );
  return { width, height: occupiedHeight, nodes, edges };
}

/** Saved parent edges only. Missing/off-page parents remain separate roots. */
export function layoutTopicDiagram(
  topics: { id: string; parentId?: string }[],
) {
  const roots = buildTopicTree(topics),
    nodes: { id: string; x: number; y: number }[] = [];
  const edges: { from: string; to: string }[] = [];
  let leaf = 0,
    depthMax = 0;
  function visit(node: TopicNode, depth: number): number {
    depthMax = Math.max(depthMax, depth);
    const xs = node.children.map((child) => {
      edges.push({ from: node.id, to: child.id });
      return visit(child, depth + 1);
    });
    const x = xs.length ? (xs[0] + xs.at(-1)!) / 2 : 120 + leaf++ * 240;
    nodes.push({ id: node.id, x, y: 70 + depth * 140 });
    return x;
  }
  for (const root of roots) visit(root, 0);
  return {
    nodes,
    edges,
    width: Math.max(480, leaf * 240),
    height: 150 + depthMax * 140,
  };
}
