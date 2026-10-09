"use client";
import { useMemo, useState } from "react";
import { GitBranch, ChevronDown, ChevronUp, Layers } from "lucide-react";
import { motion } from "motion/react";
import { buildTopicTree, type TopicNode } from "@/lib/topic-tree";
import { useInterfaceMotion } from "./motion-preference";
type Topic = {
  id: string;
  name: string;
  parentId?: string;
  ideas: number;
  posts: number;
};
export function TopicDiagram({
  topics,
  onOpen,
  selectedId,
}: {
  topics: Topic[];
  onOpen: (topic: Topic) => void;
  selectedId?: string;
}) {
  const roots = useMemo(() => buildTopicTree(topics), [topics]);
  const records = new Map(topics.map((topic) => [topic.id, topic]));
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const animate = useInterfaceMotion();
  const [pointer, setPointer] = useState(false);
  function branch(node: TopicNode, depth: number): React.ReactNode {
    const topic = records.get(node.id);
    if (!topic) return null;
    const isOpen =
      expanded.has(node.id) ||
      (depth <= 1 && !expanded.has(`collapsed:${node.id}`));
    return (
      <li key={node.id} className="atlas-branch" data-depth={depth}>
        <div className="atlas-node" data-selected={selectedId === node.id}>
          <button
            className="atlas-node-open"
            onClick={() => onOpen(topic)}
            aria-label={`Open ${topic.name}`}
          >
            <span className="atlas-node-icon">
              <GitBranch size={19} aria-hidden="true" />
            </span>
            <strong>{topic.name}</strong>
            <span className="atlas-node-count">
              {topic.ideas} insights · {topic.posts} posts
            </span>
          </button>
          {node.children.length > 0 && (
            <button
              className="atlas-expand"
              aria-expanded={isOpen}
              aria-label={`${isOpen ? "Collapse" : "Expand"} ${topic.name}`}
              onPointerDown={() => setPointer(true)}
              onKeyDown={() => setPointer(false)}
              onClick={() =>
                setExpanded((current) => {
                  const next = new Set(current);
                  if (isOpen) {
                    next.delete(node.id);
                    if (depth <= 1) next.add(`collapsed:${node.id}`);
                  } else {
                    next.add(node.id);
                    next.delete(`collapsed:${node.id}`);
                  }
                  return next;
                })
              }
            >
              {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
        {node.children.length > 0 &&
          isOpen &&
          !expanded.has(`collapsed:${node.id}`) && (
            <motion.ul
              className="atlas-children"
              data-pair={node.children.length === 2 && depth === 0}
              initial={animate && pointer ? { opacity: 0, y: 6 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: animate && pointer ? 0.18 : 0 }}
            >
              {node.children.map((child) => branch(child, depth + 1))}
            </motion.ul>
          )}
      </li>
    );
  }
  if (!topics.length) return null;
  return (
    <section className="atlas-tree" aria-label="Topic branching diagram">
      <div className="atlas-root">
        <Layers size={18} aria-hidden="true" />
        <strong>Your knowledge</strong>
      </div>
      <ul className="atlas-roots" data-single={roots.length === 1}>
        {roots.map((node) => branch(node, 0))}
      </ul>
      <details className="atlas-explanation">
        <summary>About these branches</summary>
        <p>
          Lines show saved parent topics on this page. Topics with an unloaded
          parent appear separately. Counts describe current permitted evidence,
          not your whole library.
        </p>
      </details>
    </section>
  );
}
