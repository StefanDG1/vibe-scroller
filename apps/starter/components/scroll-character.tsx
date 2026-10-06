"use client";
import Image from "next/image";
import { useState } from "react";

export function ScrollCharacter({
  state = "welcome",
  compact = false,
}: {
  state?: "welcome" | "waiting" | "ready" | "attention";
  compact?: boolean;
}) {
  const [greeting, setGreeting] = useState(false);
  return compact ? (
    <Image
      src="/scroll/scroll-welcome.webp"
      width={36}
      height={44}
      alt="Scroll"
      className="scroll-compact"
    />
  ) : (
    <button
      type="button"
      className={`scroll-character scroll-${state} ${greeting ? "scroll-greeting" : ""}`}
      aria-label="Say hello to Scroll"
      onClick={() => setGreeting(true)}
      onAnimationEnd={() => setGreeting(false)}
    >
      <Image
        src="/scroll/scroll-welcome.webp"
        alt="Scroll, your friendly guide"
        width={192}
        height={240}
        priority
      />
      <span className="scroll-state">
        {
          {
            welcome: "Hello from Scroll",
            waiting: "Waiting with you",
            ready: "Ready to explore",
            attention: "Here to help",
          }[state]
        }
      </span>
    </button>
  );
}
