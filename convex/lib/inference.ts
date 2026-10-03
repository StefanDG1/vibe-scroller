import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { structuredGateway } from "../../packages/providers/gateway";
import {
  cfStructured,
  cfQuote,
  freeCloudflare,
  cfRun,
} from "../../packages/providers/cloudflare";
import { ensure } from "../../packages/policy";
import { inferGoogle } from "./googleInference";
export async function infer(
  ctx: ActionCtx,
  schema: unknown,
  prompt: string,
  input: unknown,
  maxOutput = 3000,
  maxMicros = 100000,
) {
  const route = process.env.MANAGED_INFERENCE_ROUTE;
  if (route === "google_metered")
    return inferGoogle(ctx, {
      schema: schema as Record<string, unknown>,
      prompt,
      parts: [{ text: JSON.stringify(input) }],
      maxOutput,
      maxMicros,
    });
  if (route === "convex_free")
    return structuredGateway(schema, prompt, input, maxOutput);
  ensure(
    route === "cloudflare_free",
    "SETUP_REQUIRED",
    "Select and verify an explicit inference route.",
  );
  freeCloudflare();
  const key = crypto.randomUUID();
  await ctx.runMutation(internal.inferenceBudget.reserve, {
    key,
    max: cfQuote(schema, prompt, input, maxOutput),
  });
  // Failed requests retain their reservation until usage is reconciled. Never assume an unknown provider cost is zero.
  const result = await cfStructured(schema, prompt, input, maxOutput);
  await ctx.runMutation(internal.inferenceBudget.settle, {
    key,
    neurons: result.usage.neurons,
  });
  return result;
}

// Retain the full free-unit hold when a media endpoint omits measured usage.
// Never represent a quote as provider-reported consumption.
export async function inferMedia(
  ctx: ActionCtx,
  model: string,
  input: unknown,
  maxNeurons: number,
) {
  ensure(
    process.env.MANAGED_INFERENCE_ROUTE === "cloudflare_free",
    "SETUP_REQUIRED",
    "Media needs the explicitly selected free Workers AI route.",
  );
  freeCloudflare();
  const key = crypto.randomUUID();
  await ctx.runMutation(internal.inferenceBudget.reserve, {
    key,
    max: maxNeurons,
  });
  const result = await cfRun(model, input);
  const measured = result.usage?.neurons;
  if (Number.isFinite(measured) && measured >= 0)
    await ctx.runMutation(internal.inferenceBudget.settle, {
      key,
      neurons: measured,
    });
  return { result, usageVerified: Number.isFinite(measured) && measured >= 0 };
}
