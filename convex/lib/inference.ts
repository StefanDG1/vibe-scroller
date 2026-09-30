import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { structuredGateway } from "../../packages/providers/gateway";
import {
  cfStructured,
  cfQuote,
  freeCloudflare,
} from "../../packages/providers/cloudflare";
import { ensure } from "../../packages/policy";
export async function infer(
  ctx: ActionCtx,
  schema: unknown,
  prompt: string,
  input: unknown,
  maxOutput = 3000,
) {
  const route = process.env.MANAGED_INFERENCE_ROUTE;
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
