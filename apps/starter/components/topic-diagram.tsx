"use client";
import { useEffect, useMemo, useRef } from "react";
import { layoutTopicDiagram } from "@/lib/knowledge-layout";
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
}: {
  topics: Topic[];
  onOpen: (topic: Topic) => void;
}) {
  const layout = useMemo(() => layoutTopicDiagram(topics), [topics]);
  const points = new Map(layout.nodes.map((n) => [n.id, n]));
  const viewport = useRef<HTMLDivElement>(null);
  const rootX = layout.nodes.find((n) => n.y === 70)?.x;
  useEffect(() => {
    const element = viewport.current;
    if (!element || rootX === undefined) return;
    const center = () => {
      element.scrollLeft = Math.max(0, rootX - element.clientWidth / 2);
    };
    center();
    const observer = new ResizeObserver(center);
    observer.observe(element);
    return () => observer.disconnect();
  }, [rootX]);
  const records = new Map(topics.map((t) => [t.id, t]));
  if (!topics.length) return null;
  return (
    <section aria-label="Topic branching diagram">
      <p className="explore-coverage">
        Branches show saved parent topics. Separate roots have no parent on this
        page. Select a topic to inspect its cited ideas. Swipe or scroll across
        branches, or switch to the readable tree.
      </p>
      {/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Keyboard users can scroll this bounded diagram. */}
      <div
        className="topic-diagram-viewport"
        ref={viewport}
        tabIndex={0}
        aria-label="Topic diagram. Scroll to explore branches; Tab and Enter open topics."
      >
        <div
          className="topic-diagram-surface"
          style={{ width: layout.width, height: layout.height }}
        >
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${layout.width} ${layout.height}`}
          >
            {layout.edges.map((e) => {
              const a = points.get(e.from)!,
                b = points.get(e.to)!;
              return (
                <path
                  key={`${e.from}:${e.to}`}
                  d={`M ${a.x} ${a.y + 44} V ${b.y - 70} H ${b.x} V ${b.y - 44}`}
                />
              );
            })}
          </svg>
          {layout.nodes.map((n) => {
            const topic = records.get(n.id)!;
            return (
              <button
                key={n.id}
                style={{ left: n.x, top: n.y }}
                onClick={() => onOpen(topic)}
                aria-label={`Open ${topic.name}`}
              >
                <strong>{topic.name}</strong>
                <span>
                  {topic.posts} posts · {topic.ideas} current ideas
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {/* oxlint-enable jsx-a11y/no-noninteractive-tabindex */}
    </section>
  );
}
