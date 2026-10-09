"use client";
import { useEffect, useEffectEvent, useRef } from "react";
import { TopicPagingGate } from "@/lib/topic-paging";
import { LibrarySkeleton } from "./library-skeleton";
export function TopicLoader({
  cursor,
  loading,
  onMore,
}: {
  cursor: string;
  loading: boolean;
  onMore: () => void;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const gate = useRef(new TopicPagingGate());
  const visible = useRef(false);
  const attempt = useEffectEvent(() => {
    if (
      visible.current &&
      !document.hidden &&
      gate.current.take(cursor, loading)
    )
      onMore();
  });
  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.isIntersecting;
        if (entry.isIntersecting) attempt();
      },
      { rootMargin: "160px" },
    );
    observer.observe(node);
    const browse = (event: Event) => {
      if (
        event instanceof KeyboardEvent &&
        event.target instanceof Element &&
        event.target.closest("input, textarea, select, [contenteditable=true]")
      )
        return;
      if (event instanceof WheelEvent && event.deltaY === 0) return;
      if (
        event instanceof KeyboardEvent &&
        !["ArrowDown", "PageDown", "End", " "].includes(event.key)
      )
        return;
      gate.current.arm();
      attempt();
    };
    window.addEventListener("wheel", browse, { passive: true });
    window.addEventListener("touchmove", browse, { passive: true });
    window.addEventListener("keydown", browse);
    return () => {
      observer.disconnect();
      window.removeEventListener("wheel", browse);
      window.removeEventListener("touchmove", browse);
      window.removeEventListener("keydown", browse);
    };
  }, []);
  return (
    <div ref={sentinel} className="hybrid-topic-loader">
      {loading ? (
        <LibrarySkeleton kind="topics" rows={2} />
      ) : (
        <button className="hybrid-topic-more" onClick={onMore}>
          Load more topics
          <span className="sr-only"> if automatic loading is unavailable</span>
        </button>
      )}
    </div>
  );
}
