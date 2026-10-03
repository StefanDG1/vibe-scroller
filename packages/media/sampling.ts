// A sparse pass must retain the final candidate and visible changes. Taking
// every Nth frame can omit the last scene and repeat an unchanged one instead.
export function sampledFrames<
  T extends { timestampMs: number; selectionReason: string },
>(frames: T[], limit = 4) {
  if (!Number.isSafeInteger(limit) || limit < 2 || limit > 48)
    throw Error("INVALID_FRAME_LIMIT");
  if (frames.length <= limit) return frames;
  const sorted = [...frames].sort((a, b) => a.timestampMs - b.timestampMs);
  const selected = new Set([sorted[0], sorted.at(-1)!]);
  const changed = sorted.filter(
    (f) =>
      !selected.has(f) &&
      f.selectionReason === "visible change within sampled frames",
  );
  if (changed.length <= limit - 2) changed.forEach((f) => selected.add(f));
  else {
    const start = sorted[0].timestampMs,
      span = sorted.at(-1)!.timestampMs - start;
    for (let i = 1; i <= limit - 2; i++) {
      const fraction = i / (limit - 1);
      const target = start + span * fraction;
      const candidates = changed.filter((f) => !selected.has(f));
      candidates.sort(
        (a, b) =>
          Math.abs(a.timestampMs - target) - Math.abs(b.timestampMs - target) ||
          a.timestampMs - b.timestampMs,
      );
      selected.add(candidates[0]);
    }
  }
  while (selected.size < limit) {
    const remaining = sorted.filter((f) => !selected.has(f));
    const distance = (f: T) =>
      Math.min(
        ...[...selected].map((s) => Math.abs(s.timestampMs - f.timestampMs)),
      );
    remaining.sort(
      (a, b) => distance(b) - distance(a) || a.timestampMs - b.timestampMs,
    );
    selected.add(remaining[0]);
  }
  return [...selected].sort((a, b) => a.timestampMs - b.timestampMs);
}
