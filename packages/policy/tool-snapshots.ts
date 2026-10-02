import { ensure } from "../policy";
export type ToolSnapshot = { snapshotId: string; expiresAt: number };
export function toolSnapshot(value: unknown, now = Date.now()): ToolSnapshot {
  const item = value as Partial<ToolSnapshot> | null;
  ensure(
    item &&
      typeof item.snapshotId === "string" &&
      /^snap_[A-Za-z0-9_-]{8,128}$/.test(item.snapshotId) &&
      Number.isSafeInteger(item.expiresAt) &&
      item.expiresAt! > now + 30000,
    "SETUP_REQUIRED",
    "The verified tool snapshot is unavailable or expiring. Processing is paused; no image fallback was used.",
  );
  return { snapshotId: item.snapshotId, expiresAt: item.expiresAt! };
}
