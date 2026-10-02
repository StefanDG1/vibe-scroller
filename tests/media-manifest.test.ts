import { expect, it } from "vitest";
import { decoderManifest } from "../packages/media/manifest";
const sample = {
  durationSeconds: 8,
  audio: "audio.wav",
  coverage: "full_sampled",
  frames: [
    {
      id: "frame-000.jpg",
      timestampMs: 1000,
      selectionReason: "periodic sample",
    },
  ],
};
it("accepts bounded PCM output and keeps the managed compressed-audio contract separate", () => {
  expect(decoderManifest(sample, true).audio).toBe("audio.wav");
  expect(() => decoderManifest(sample)).toThrow();
  expect(decoderManifest({ ...sample, audio: "audio.mp3" }).audio).toBe(
    "audio.mp3",
  );
});
it("rejects traversal, duplicated files, fabricated coverage, invalid timing and excessive work", () => {
  for (const invalid of [
    { ...sample, audio: "../secrets" },
    { ...sample, frames: [{ ...sample.frames[0], id: "../config.jpg" }] },
    { ...sample, frames: [sample.frames[0], sample.frames[0]] },
    { ...sample, frames: [{ ...sample.frames[0], timestampMs: 8000 }] },
    { ...sample, durationSeconds: 601 },
    { ...sample, durationSeconds: Infinity },
    { ...sample, coverage: "audio_only" },
    { ...sample, extra: "untrusted" },
    { durationSeconds: 8, coverage: "visual_only", frames: [] },
    {
      ...sample,
      frames: Array.from({ length: 49 }, (_, index) => ({
        ...sample.frames[0],
        id: `frame-${String(index).padStart(3, "0")}.jpg`,
      })),
    },
  ])
    expect(() => decoderManifest(invalid, true)).toThrow();
});
