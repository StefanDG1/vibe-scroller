"use client";
import { useEffect, useEffectEvent } from "react";
import { startPolling } from "../../../packages/browser/polling";

export function usePolling(
  refresh: () => Promise<unknown>,
  interval: number,
  enabled: boolean,
  scope: string,
) {
  const poll = useEffectEvent(refresh);
  useEffect(() => {
    if (enabled) return startPolling(() => poll(), interval);
  }, [enabled, interval, scope]);
}
