"use client";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  BriefcaseBusiness,
  UserRound,
  Package,
  Megaphone,
  UsersRound,
  Tag,
  Folder,
  Code,
  Layers,
} from "lucide-react";
import { motion } from "motion/react";
import { buildTopicTree, topicPath, type TopicNode } from "@/lib/topic-tree";
import { useInterfaceMotion } from "./motion-preference";
type Topic = {
  id: string;
  name: string;
  parentId?: string;
  ideas: number;
  posts: number;
  autoCategory?: boolean;
};
function iconFor(name: string) {
  const n = name.toLowerCase();
  if (n === "personal") return UserRound;
  if (n === "business") return BriefcaseBusiness;
  if (/product/.test(n)) return Package;
  if (/market|content|conversion/.test(n)) return Megaphone;
  if (/customer|interface|experience/.test(n)) return UsersRound;
  if (/pricing/.test(n)) return Tag;
  if (/engineer|software|code|ai/.test(n)) return Code;
  return Layers;
}
export function TopicDiagram({
  topics,
  onOpen,
  selectedId,
  representation = "tree",
  children,
}: {
  topics: Topic[];
  onOpen: (topic: Topic) => void;
  selectedId?: string;
  representation?: "tree" | "folders";
  children?: React.ReactNode;
}) {
  const organized = topics.some(
    (topic) => topic.autoCategory && !topic.parentId,
  );
  const displayTopics = organized
    ? [
        ...topics,
        ...["Personal", "Business"]
          .filter(
            (name) =>
              !topics.some(
                (topic) =>
                  topic.autoCategory && topic.name === name && !topic.parentId,
              ),
          )
          .map((name) => ({
            id: `empty-filing:${name}`,
            name,
            ideas: 0,
            posts: 0,
            autoCategory: true,
          })),
      ]
    : topics;
  const roots = buildTopicTree(displayTopics).sort((a, b) => {
    const order = (id: string) =>
      displayTopics.find((topic) => topic.id === id)?.name === "Personal"
        ? 0
        : 1;
    return order(a.id) - order(b.id);
  });
  const records = new Map(displayTopics.map((t) => [t.id, t]));
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const animate = useInterfaceMotion();
  const [pointer, setPointer] = useState(false);
  const treeRef = useRef<HTMLElement>(null);
  const [edges, setEdges] = useState({
    width: 1,
    height: 1,
    paths: [] as string[],
  });
  useEffect(() => {
    const tree = treeRef.current;
    if (!tree || representation !== "tree") return;
    const observer = new ResizeObserver(() => {
      const bounds = tree.getBoundingClientRect();
      const rows = [
        ...tree.querySelectorAll<HTMLElement>(".hybrid-node-level"),
      ];
      const paths: string[] = [];
      for (let index = 1; index < rows.length; index++) {
        const parent = rows[index - 1].querySelector<HTMLElement>(
          ".hybrid-node-row .hybrid-node[data-selected=true]",
        );
        if (!parent) continue;
        const p = parent.getBoundingClientRect();
        const x = p.left + p.width / 2 - bounds.left,
          y = p.bottom - bounds.top;
        for (const child of rows[index].querySelectorAll<HTMLElement>(
          ".hybrid-node-row > li > .hybrid-node",
        )) {
          const c = child.getBoundingClientRect();
          const cx = c.left + c.width / 2 - bounds.left,
            cy = c.top - bounds.top;
          const middle = (y + cy) / 2,
            radius = Math.min(8, Math.abs(cx - x) / 2, (cy - y) / 3),
            direction = cx > x ? 1 : -1;
          paths.push(
            Math.abs(cx - x) < 1
              ? `M ${x} ${y} V ${cy}`
              : `M ${x} ${y} V ${middle - radius} Q ${x} ${middle} ${x + direction * radius} ${middle} H ${cx - direction * radius} Q ${cx} ${middle} ${cx} ${middle + radius} V ${cy}`,
          );
        }
      }
      setEdges({ width: bounds.width, height: bounds.height, paths });
    });
    observer.observe(tree);
    return () => observer.disconnect();
  }, [selectedId, representation, topics]);
  const firstLeaf = topics.find(
    (t) => !t.autoCategory && !topics.some((c) => c.parentId === t.id),
  );
  const path = topicPath(displayTopics, selectedId ?? firstLeaf?.id ?? "");
  const active = new Set(path.map((t) => t.id));
  function choose(node: TopicNode) {
    let leaf = node;
    const seen = new Set<string>();
    while (leaf.children.length && !seen.has(leaf.id)) {
      seen.add(leaf.id);
      leaf = leaf.children[0];
    }
    const topic = records.get(leaf.id);
    if (topic) onOpen(topic);
  }
  function control(node: TopicNode, folder = false) {
    const topic = records.get(node.id)!;
    const Icon = folder ? Folder : iconFor(topic.name);
    const expanded = !collapsed.has(node.id);
    return (
      <button
        className="hybrid-node"
        data-topic-id={node.id}
        data-selected={active.has(node.id)}
        aria-label={`Open ${topic.name}`}
        aria-expanded={node.children.length ? expanded : undefined}
        onPointerDown={() => setPointer(true)}
        onKeyDown={() => setPointer(false)}
        onClick={() => {
          if (folder && node.children.length)
            setCollapsed((current) => {
              const next = new Set(current);
              if (next.has(node.id)) next.delete(node.id);
              else next.add(node.id);
              return next;
            });
          else choose(node);
        }}
      >
        <Icon aria-hidden="true" />
        <strong>{topic.name}</strong>
        {(
          folder ? node.children.length > 0 && expanded : active.has(node.id)
        ) ? (
          <ChevronDown size={17} aria-hidden="true" />
        ) : (
          <ChevronRight size={17} aria-hidden="true" />
        )}
      </button>
    );
  }
  function folderBranch(node: TopicNode): React.ReactNode {
    return (
      <li key={node.id}>
        {control(node, true)}
        {node.id === selectedId && children}
        {node.children.length > 0 && !collapsed.has(node.id) && (
          <ul>{node.children.map(folderBranch)}</ul>
        )}
      </li>
    );
  }
  function row(nodes: TopicNode[], depth: number) {
    const ordered = [...nodes].sort(
      (a, b) => Number(active.has(b.id)) - Number(active.has(a.id)),
    );
    const shown = depth === 0 ? nodes.slice(0, 2) : ordered.slice(0, 2);
    return (
      <motion.div
        key={depth}
        className="hybrid-node-level"
        data-depth={depth}
        data-single={shown.length === 1}
        initial={animate && pointer ? { opacity: 0.6, y: 4 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: animate && pointer ? 0.18 : 0 }}
      >
        <ul className="hybrid-node-row">
          {shown.map((node) => (
            <li key={node.id}>{control(node)}</li>
          ))}
        </ul>
        {nodes.length > 2 && (
          <details className="hybrid-other-categories">
            <summary>{nodes.length - 2} more categories</summary>
            <ul>
              {(depth === 0 ? nodes.slice(2) : ordered.slice(2)).map((node) => (
                <li key={node.id}>{control(node)}</li>
              ))}
            </ul>
          </details>
        )}
      </motion.div>
    );
  }
  if (!topics.length) return null;
  if (representation === "folders")
    return (
      <section
        className="hybrid-folder-tree"
        aria-label="Expanded category folders"
      >
        {organized ? (
          <>
            <div className="hybrid-folder-roots" aria-label="Filing category">
              {roots.map((root) => (
                <button
                  key={root.id}
                  aria-pressed={active.has(root.id)}
                  onClick={() => choose(root)}
                >
                  {records.get(root.id)?.name}
                </button>
              ))}
            </div>
            <ul>
              {(roots.find((root) => active.has(root.id))?.children ?? []).map(
                folderBranch,
              )}
            </ul>
          </>
        ) : (
          <ul>{roots.map(folderBranch)}</ul>
        )}
      </section>
    );
  const levels: TopicNode[][] = [roots];
  let nodes = roots;
  for (const item of path) {
    const node = nodes.find((n) => n.id === item.id);
    if (!node?.children.length) break;
    levels.push(node.children);
    nodes = node.children;
  }
  return (
    <section
      ref={treeRef}
      className="hybrid-topic-tree"
      aria-label="Topic branching diagram"
    >
      <svg
        className="hybrid-edges"
        viewBox={`0 0 ${edges.width} ${edges.height}`}
        aria-hidden="true"
      >
        {edges.paths.map((path, index) => (
          <path key={index} d={path} />
        ))}
      </svg>
      {levels.map(row)}
    </section>
  );
}
