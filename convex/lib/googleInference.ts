import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  inferenceBodyLimit,
  inferenceDigest,
  inferencePayload,
  signInference,
  type InferencePayload,
} from "../../packages/policy/inference-broker";
import {
  googleConfigured,
  googleInferenceModel,
  googleCostPolicy,
} from "../../packages/providers/google-inference";
import { ensure } from "../../packages/policy";
export class MeasuredInferenceError extends Error {
  constructor(public readonly credits: number) {
    super(
      "PROVIDER_ERROR: Inference was incomplete; measured usage was reconciled.",
    );
  }
}
export function failedInferenceSettlement(
  error: unknown,
  started: boolean,
  knownCredits?: number,
) {
  const credits =
    knownCredits ??
    (error instanceof MeasuredInferenceError ? error.credits : undefined);
  return {
    credits: credits ?? 0,
    retainReservation:
      credits === undefined &&
      started &&
      process.env.MANAGED_INFERENCE_ROUTE === "google_metered",
  };
}
export async function inferGoogle(ctx: ActionCtx, payload: InferencePayload) {
  ensure(
    googleConfigured(),
    "SETUP_REQUIRED",
    "The reviewed hosted inference route is unavailable.",
  );
  const validated = inferencePayload.parse(payload);
  const key = crypto.randomUUID();
  const payloadDigest = await inferenceDigest(JSON.stringify(validated));
  const envelope = JSON.stringify({
    purpose: "vibescroller-google-inference",
    at: Date.now(),
    key,
    payloadDigest,
    maxMicros: validated.maxMicros,
  });
  const body = JSON.stringify({ envelope, payload: validated });
  ensure(
    Buffer.byteLength(body, "utf8") <= inferenceBodyLimit,
    "PROVIDER_LIMIT",
    "The inference payload exceeds its bound.",
  );
  const url = process.env.GOOGLE_INFERENCE_BRIDGE_URL;
  ensure(
    url === "https://scroll.companynerve.com/api/internal/inference",
    "SETUP_REQUIRED",
    "Configure the trusted inference broker.",
  );
  await ctx.runMutation(internal.googleInferenceBudget.reserve, {
    key,
    max: validated.maxMicros,
    payloadDigest,
  });
  // A missing response retains the hold. Never retry uncertain billable generation.
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Vibe-Signature": await signInference(
        envelope,
        process.env.GOOGLE_INFERENCE_BRIDGE_SECRET ?? "",
      ),
    },
    body,
    signal: AbortSignal.timeout(175000),
  });
  ensure(
    response.ok,
    "PROVIDER_ERROR",
    "The hosted inference broker failed. No provider fallback was used.",
  );
  const result = await response.json();
  ensure(
    result.model === googleInferenceModel &&
      result.usage?.costPolicy === googleCostPolicy &&
      Number.isSafeInteger(result.usage?.costMicros) &&
      result.usage.costMicros >= 0 &&
      result.usage.costMicros <= validated.maxMicros,
    "COST_RECONCILIATION_REQUIRED",
    "Broker usage does not match the approved policy.",
  );
  await ctx.runMutation(internal.googleInferenceBudget.settle, {
    key,
    micros: result.usage.costMicros,
  });
  if (result.error)
    throw new MeasuredInferenceError(
      Math.ceil(result.usage.costMicros / 10000),
    );
  return result as {
    output: any;
    credits: number;
    usage: {
      costMicros: number;
      inputTokens: number;
      outputTokens: number;
      usdEstimate: number;
      costPolicy: string;
    };
    model: string;
  };
}
