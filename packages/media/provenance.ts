import { z } from "zod";
import {
  googleCostPolicy,
  googleInferenceModel,
} from "../providers/google-inference";

export const speechProvenance = z.strictObject({
  model: z.literal(googleInferenceModel),
  language: z.string().max(80),
  uncertainty: z.string().max(1000),
  timing: z.literal("approximate"),
});
export const processingReceipt = z
  .strictObject({
    generation: z.number().int().positive(),
    route: z.literal("google_metered"),
    model: z.literal(googleInferenceModel),
    costPolicy: z.literal(googleCostPolicy),
    startedAt: z.number().int().positive(),
    completedAt: z.number().int().positive(),
    inputTokens: z.number().int().min(0).max(1000000),
    outputTokens: z.number().int().min(0).max(100000),
    inferenceMicros: z.number().int().min(0).max(100000),
    computeCredits: z.number().int().min(0).max(10),
    chargedCredits: z.number().int().min(0).max(10),
    reusedMedia: z.boolean(),
  })
  .superRefine((r, ctx) => {
    if (
      r.completedAt < r.startedAt ||
      r.inferenceMicros <
        Math.ceil(((r.inputTokens * 33 + r.outputTokens * 275) * 15) / 1000) ||
      r.chargedCredits !==
        r.computeCredits + Math.ceil(r.inferenceMicros / 10000)
    )
      ctx.addIssue({
        code: "custom",
        message: "Processing receipt does not reconcile.",
      });
  });
