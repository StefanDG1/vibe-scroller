"use client";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import { useInterfaceMotion } from "./motion-preference";
export function LibrarySkeleton({
  kind = "insights",
  rows = 5,
}: {
  kind?: "topics" | "insights" | "proposals";
  rows?: number;
}) {
  const animate = useInterfaceMotion();
  return (
    <output
      className={`library-skeleton library-skeleton-${kind}`}
      aria-busy="true"
    >
      <span className="sr-only">
        {kind === "topics"
          ? "Loading topics"
          : kind === "proposals"
            ? "Checking proposals"
            : "Loading insights"}
      </span>
      <SkeletonTheme
        baseColor="var(--line)"
        highlightColor="var(--panel)"
        enableAnimation={animate}
        duration={1.6}
      >
        <span aria-hidden="true">
          {Array.from({ length: rows }, (_, i) => (
            <span className="library-skeleton-row" key={i}>
              <Skeleton width={36} height={36} borderRadius={10} />
              <span>
                <Skeleton width="78%" />
                <Skeleton width="52%" height={11} />
              </span>
            </span>
          ))}
        </span>
      </SkeletonTheme>
    </output>
  );
}
