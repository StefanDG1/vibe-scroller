import { z } from "zod";
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
    .max(4),
  evidence: z
    .array(
      z.strictObject({
        kind: z.enum(["transcript", "frame"]),
        id: z.string().max(160),
        ...timing,
      }),
    )
    .min(1)
    .max(224),
  warnings: z.array(z.string().max(2000)).max(20),
  computeCredits: z.number().int().min(0).max(10),
});
