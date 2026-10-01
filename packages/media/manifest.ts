import { z } from "zod";
const manifestSchema = z
  .object({
    durationSeconds: z.number().finite().positive().max(600),
    audio: z.enum(["audio.mp3", "audio.wav"]).optional(),
    coverage: z.enum(["full_sampled", "audio_only", "visual_only"]),
    frames: z
      .array(
        z
          .object({
            id: z.string().regex(/^frame-\d{3}\.jpg$/),
            timestampMs: z.number().int().min(0).max(600000),
            selectionReason: z.enum([
              "periodic sample",
              "visible change within sampled frames",
            ]),
          })
          .strict(),
      )
      .max(24),
  })
  .strict();
export function decoderManifest(value: unknown, normalizedPcm = false) {
  const manifest = manifestSchema.parse(value);
  const coverage = manifest.audio
    ? manifest.frames.length
      ? "full_sampled"
      : "audio_only"
    : "visual_only";
  if (
    (!manifest.audio && !manifest.frames.length) ||
    manifest.coverage !== coverage ||
    (manifest.audio &&
      manifest.audio !== (normalizedPcm ? "audio.wav" : "audio.mp3")) ||
    new Set(manifest.frames.map((frame) => frame.id)).size !==
      manifest.frames.length ||
    manifest.frames.some(
      (frame) =>
        frame.timestampMs >= Math.ceil(manifest.durationSeconds * 1000),
    )
  )
    throw new Error("INVALID_MEDIA_MANIFEST");
  return manifest;
}
