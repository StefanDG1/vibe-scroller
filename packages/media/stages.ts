import { z } from "zod";
import { speechProvenance } from "./provenance";
const timing = {
  startMs: z.number().int().min(0).max(600000),
  endMs: z.number().int().min(0).max(600000),
};
export const mediaStagePayload = z.strictObject({
  transcript: z
    .array(
      z.strictObject({
        id: z.string().max(160),
        text: z.string().max(4000),
        ...timing,
      }),
    )
    .max(200),
  observations: z
    .array(
      z.strictObject({
        id: z.string().max(160),
        observation: z.string().max(4000),
        timestampMs: z.number().int().min(0).max(600000),
      }),
    )
    .max(16),
  evidence: z
    .array(
      z.strictObject({
        kind: z.enum(["transcript", "frame"]),
        id: z.string().max(160),
        ...timing,
      }),
    )
    .min(1)
    .max(248),
  warnings: z.array(z.string().max(2000)).max(20),
  computeCredits: z.number().int().min(0).max(10),
  inferenceMicros: z.number().int().min(0).max(100000).optional(),
  inputTokens: z.number().int().min(0).max(1000000).optional(),
  outputTokens: z.number().int().min(0).max(100000).optional(),
  speech: speechProvenance.optional(),
});
