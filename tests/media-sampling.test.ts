import { expect, it } from "vitest";
import { sampledFrames } from "../packages/media/sampling";
const frame = (timestampMs: number, change = false) => ({
  timestampMs,
  selectionReason: change
    ? "visible change within sampled frames"
    : "periodic sample",
});
it("preserves late visual-only scenes and code changes inside a static shot under the four-frame limit", () => {
  const input = [
    frame(0),
    frame(3000),
    frame(6000, true),
    frame(9000),
    frame(10000),
    frame(12000, true),
  ];
  const selected = sampledFrames(input);
  expect(selected).toHaveLength(4);
  for (const ms of [0, 6000, 12000])
    expect(selected.some((f) => f.timestampMs === ms)).toBe(true);
  expect(selected.map((f) => f.timestampMs)).toEqual(
    selected.map((f) => f.timestampMs).sort((a, b) => a - b),
  );
  expect(input.map((f) => f.timestampMs)).toEqual([
    0, 3000, 6000, 9000, 10000, 12000,
  ]);
  expect(sampledFrames([])).toEqual([]);
  expect(sampledFrames(input.slice(0, 4))).toEqual(input.slice(0, 4));
});
it("bounds dense changes and spreads fallback samples without dropping the final candidate", () => {
  const dense = Array.from({ length: 24 }, (_, i) => frame(i * 2000, true));
  expect(sampledFrames(dense).map((f) => f.timestampMs)).toEqual([
    0, 16000, 30000, 46000,
  ]);
  const periodic = Array.from({ length: 24 }, (_, i) => frame(i * 2000));
  const selected = sampledFrames(periodic).map((f) => f.timestampMs);
  expect(selected).toHaveLength(4);
  expect(selected[0]).toBe(0);
  expect(selected.at(-1)).toBe(46000);
  expect(selected.some((ms) => ms >= 20000 && ms <= 26000)).toBe(true);
});
it("supports a bounded denser pass while retaining the first and last scene", () => {
  const dense = Array.from({ length: 48 }, (_, i) => frame(i * 250, true));
  const selected = sampledFrames(dense, 16);
  expect(selected).toHaveLength(16);
  expect(selected[0].timestampMs).toBe(0);
  expect(selected.at(-1)?.timestampMs).toBe(11750);
  expect(new Set(selected.map((f) => f.timestampMs)).size).toBe(16);
  expect(() => sampledFrames(dense, 49)).toThrow("INVALID_FRAME_LIMIT");
});
