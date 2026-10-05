import { z } from "zod";
export const outcomeInput = z
  .strictObject({
    verdict: z.enum(["positive", "negative", "inconclusive", "not_measured"]),
    method: z.enum(["judgment", "reported_data", "both"]),
    note: z.string().trim().min(1).max(2000),
    measurement: z
      .strictObject({
        label: z.string().trim().min(1).max(120),
        unit: z.string().trim().min(1).max(40),
        before: z.number().finite(),
        after: z.number().finite(),
        baselineStart: z.number().int().nonnegative(),
        baselineEnd: z.number().int().nonnegative(),
        observationStart: z.number().int().nonnegative(),
        observationEnd: z.number().int().nonnegative(),
        baselineSamples: z.number().int().positive(),
        observationSamples: z.number().int().positive(),
        limitations: z.string().trim().min(1).max(1000),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if ((value.method !== "judgment") !== !!value.measurement)
      ctx.addIssue({
        code: "custom",
        message: "Choose judgment alone or include the reported comparison.",
      });
    const m = value.measurement;
    if (
      m &&
      !(
        m.baselineStart < m.baselineEnd &&
        m.baselineEnd <= m.observationStart &&
        m.observationStart < m.observationEnd &&
        m.observationEnd <= Date.now()
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Use completed, non-overlapping comparison periods.",
      });
  });
export function improvementStage(input: {
  current: boolean;
  deleted: boolean;
  plan: boolean;
  run?: {
    state: string;
    prState?: string;
    mergedAt?: string;
    reverted?: unknown;
    error?: string;
  };
  outcome?: { verdict: string };
}) {
  if (input.deleted) return "unavailable";
  if (input.run?.reverted) return "reverted";
  if (input.run?.mergedAt)
    return input.outcome && input.outcome.verdict !== "not_measured"
      ? "reviewed"
      : "awaiting_outcome";
  if (input.run?.prState === "closed_unmerged") return "closed_unmerged";
  if (input.run?.prState === "access_lost") return "access_lost";
  if (input.run?.prState) return "pull_request";
  if (
    input.run &&
    ["queued", "running", "publishing", "awaiting_review"].includes(
      input.run.state,
    )
  )
    return input.run.state;
  if (input.run && ["failed", "canceled"].includes(input.run.state))
    return input.run.state;
  if (!input.current) return "stale";
  return input.plan ? "planned" : "planning";
}
