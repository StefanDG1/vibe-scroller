import { afterEach, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { googleSpeech, googleFrames } from "../convex/lib/googleMedia";
import { inferGoogle } from "../convex/lib/googleInference";
import {
  googleCostPolicy,
  googleInferenceModel,
} from "../packages/providers/google-inference";
const usage = {
  costMicros: 1234,
  inputTokens: 100,
  outputTokens: 20,
  usdEstimate: 0.001,
  costPolicy: googleCostPolicy,
};
function setup(output: unknown, extra: Record<string, unknown> = {}) {
  vi.stubEnv("GOOGLE_INFERENCE_ENABLED", "true");
  vi.stubEnv("GOOGLE_INFERENCE_COST_POLICY", googleCostPolicy);
  vi.stubEnv(
    "GOOGLE_INFERENCE_REVIEW_EXPIRES_AT",
    new Date(Date.now() + 3600000).toISOString(),
  );
  vi.stubEnv("GOOGLE_INFERENCE_BRIDGE_SECRET", "ab".repeat(32));
  vi.stubEnv(
    "GOOGLE_INFERENCE_BRIDGE_URL",
    "https://scroll.companynerve.com/api/internal/inference",
  );
  const mutations: { name: string; args: any }[] = [];
  const ctx: any = {
    runMutation: async (ref: any, args: any) => {
      mutations.push({ name: getFunctionName(ref), args });
    },
  };
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json({ output, usage, model: googleInferenceModel, ...extra }),
    );
  vi.stubGlobal("fetch", fetcher);
  vi.spyOn(console, "error").mockImplementation(() => {});
  return { ctx, mutations, fetcher };
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("reconciles measured speech usage before rejecting timestamps outside the actual audio", async () => {
  const { ctx, mutations, fetcher } = setup({
    segments: [{ start: 0, end: 13.7, text: "owned speech" }],
    language: "English",
    uncertainty: "Approximate",
  });
  const record = vi.fn();
  await expect(
    googleSpeech(ctx, new Uint8Array([1]), 13.652018, 10000, record),
  ).rejects.toThrow("INVALID_EVIDENCE");
  expect(record).toHaveBeenCalledExactlyOnceWith(usage);
  expect(mutations.map((m) => m.name)).toEqual([
    "googleInferenceBudget:reserve",
    "googleInferenceBudget:settle",
  ]);
  expect(mutations[1].args.micros).toBe(1234);
  const payload = JSON.parse(fetcher.mock.calls[0][1].body).payload;
  expect(payload.prompt).toContain("end <= 13.652018");
  expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
    "owned speech",
  );
});
it("rejects duplicate visual references after recording measured usage exactly once", async () => {
  const { ctx } = setup({
    observations: [
      { id: "a", observation: "one" },
      { id: "a", observation: "two" },
    ],
  });
  const record = vi.fn();
  await expect(
    googleFrames(
      ctx,
      [
        { id: "a", timestampMs: 0, data: "AA==" },
        { id: "b", timestampMs: 1000, data: "AA==" },
      ],
      10000,
      record,
    ),
  ).rejects.toThrow("INVALID_EVIDENCE");
  expect(record).toHaveBeenCalledExactlyOnceWith(usage);
});
it("reports settled usage for incomplete generation without accepting its output or retrying", async () => {
  const { ctx, mutations, fetcher } = setup(null, {
    error: "PROVIDER_ERROR: incomplete",
  });
  const record = vi.fn();
  await expect(
    googleSpeech(ctx, new Uint8Array([1]), 10, 10000, record),
  ).rejects.toThrow("measured usage was reconciled");
  expect(record).toHaveBeenCalledExactlyOnceWith(usage);
  expect(mutations).toHaveLength(2);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("keeps unknown or mismatched usage held and never reports it as measured", async () => {
  const { ctx, mutations } = setup(
    {},
    { usage: { ...usage, costPolicy: "unreviewed" } },
  );
  const record = vi.fn();
  await expect(
    inferGoogle(
      ctx,
      {
        schema: { type: "object" },
        prompt: "owned check",
        parts: [{ text: "test" }],
        maxOutput: 256,
        maxMicros: 10000,
      },
      record,
    ),
  ).rejects.toThrow("COST_RECONCILIATION_REQUIRED");
  expect(record).not.toHaveBeenCalled();
  expect(mutations.map((m) => m.name)).toEqual([
    "googleInferenceBudget:reserve",
  ]);
});
