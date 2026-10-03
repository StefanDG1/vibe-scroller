import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import {
  inferenceDigest,
  signInference,
  verifyInference,
  inferencePayload,
} from "../packages/policy/inference-broker";
import {
  googleConfigured,
  googleCostPolicy,
  googleGenerate,
  googleMicros,
  googleUsage,
  googleRequest,
  googleStructuralSchema,
} from "../packages/providers/google-inference";
const secret = "ab".repeat(32);
const request = (
  key = crypto.randomUUID(),
  at = Date.now(),
  maxMicros = 10000,
) =>
  JSON.stringify({
    purpose: "vibescroller-google-inference",
    at,
    key,
    maxMicros,
    payloadDigest: "01".repeat(32),
  });
function enable() {
  vi.stubEnv("GOOGLE_INFERENCE_ENABLED", "true");
  vi.stubEnv("GOOGLE_INFERENCE_COST_POLICY", googleCostPolicy);
  vi.stubEnv(
    "GOOGLE_INFERENCE_REVIEW_EXPIRES_AT",
    new Date(Date.now() + 3600000).toISOString(),
  );
  vi.stubEnv("GOOGLE_INFERENCE_BRIDGE_SECRET", secret);
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("rejects stale, wrong-purpose, tampered and oversized machine authorization", async () => {
  const body = request(),
    signature = await signInference(body, secret);
  expect(await verifyInference(body, signature, secret)).not.toBeNull();
  expect(await verifyInference(body + " ", signature, secret)).toBeNull();
  for (const at of [Date.now() - 31000, Date.now() + 6000]) {
    const body = request(undefined, at);
    expect(
      await verifyInference(body, await signInference(body, secret), secret),
    ).toBeNull();
  }
  const wrong = body.replace(
    "vibescroller-google-inference",
    "vibescroller-sandbox-credentials",
  );
  expect(
    await verifyInference(wrong, await signInference(wrong, secret), secret),
  ).toBeNull();
  expect(await verifyInference("a".repeat(513), signature, secret)).toBeNull();
  expect(await inferenceDigest("a")).not.toBe(await inferenceDigest("b"));
  expect(() =>
    inferencePayload.parse({
      prompt: "x",
      schema: {},
      parts: [{ fileData: { fileUri: "https://attacker.example" } }],
      maxOutput: 128,
      maxMicros: 1,
    }),
  ).toThrow();
});
it("requires a reservation, binds the payload and atomically consumes it once", async () => {
  enable();
  const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
  const key = crypto.randomUUID(),
    body = request(key),
    signature = await signInference(body, secret);
  expect(
    await t.mutation(api.googleInferenceBudget.consume, {
      envelope: body,
      signature,
    }),
  ).toBe(false);
  await t.mutation(internal.googleInferenceBudget.reserve, {
    key,
    max: 10000,
    payloadDigest: "01".repeat(32),
  });
  const wrong = body.replace("01".repeat(32), "02".repeat(32));
  expect(
    await t.mutation(api.googleInferenceBudget.consume, {
      envelope: wrong,
      signature: await signInference(wrong, secret),
    }),
  ).toBe(false);
  expect(
    (
      await Promise.all([
        t.mutation(api.googleInferenceBudget.consume, {
          envelope: body,
          signature,
        }),
        t.mutation(api.googleInferenceBudget.consume, {
          envelope: body,
          signature,
        }),
      ])
    ).filter(Boolean),
  ).toHaveLength(1);
  await t.mutation(internal.googleInferenceBudget.settle, { key, micros: 200 });
  await t.mutation(internal.googleInferenceBudget.settle, { key, micros: 200 });
  const budget = await t.run((ctx) => ctx.db.query("operatorBudgets").first());
  expect(budget).toMatchObject({ spent: 200, reserved: 0, ceiling: 10000000 });
});
it("retains uncertain holds, prevents overspend and disables generation during recovery or expired review", async () => {
  enable();
  const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
  await t.run((ctx) =>
    ctx.db.insert("operatorBudgets", {
      key: "google-eu-pilot-2026-10-03",
      ceiling: 10000000,
      spent: 9990000,
      reserved: 0,
      updatedAt: Date.now(),
    }),
  );
  const key = crypto.randomUUID();
  await t.mutation(internal.googleInferenceBudget.reserve, {
    key,
    max: 10000,
    payloadDigest: "01".repeat(32),
  });
  await expect(
    t.mutation(internal.googleInferenceBudget.reserve, {
      key: crypto.randomUUID(),
      max: 1,
      payloadDigest: "01".repeat(32),
    }),
  ).rejects.toThrow("PROVIDER_LIMIT");
  await expect(
    t.mutation(internal.googleInferenceBudget.settle, { key, micros: 0 }),
  ).rejects.toThrow("COST_RECONCILIATION_REQUIRED");
  vi.stubEnv("RESTORE_LOCK", "true");
  const body = request(key);
  expect(
    await t.mutation(api.googleInferenceBudget.consume, {
      envelope: body,
      signature: await signInference(body, secret),
    }),
  ).toBe(false);
  vi.stubEnv("RESTORE_LOCK", "false");
  vi.stubEnv(
    "GOOGLE_INFERENCE_REVIEW_EXPIRES_AT",
    new Date(Date.now() - 1).toISOString(),
  );
  expect(googleConfigured()).toBe(false);
});
const payload = {
  prompt: "Owned check",
  schema: { type: "object" },
  parts: [{ text: "test" }],
  maxOutput: 256,
  maxMicros: 10000,
};
it("lowers complex decoder constraints without mutating the strict caller contract", () => {
  const contract = {
    type: "object",
    additionalProperties: false,
    required: ["segments", "version"],
    properties: {
      version: { const: "1.0.0" },
      segments: {
        type: "array",
        maxItems: 200,
        items: {
          type: "object",
          required: ["start", "text"],
          properties: {
            start: { type: ["number", "null"], minimum: 0, maximum: 600 },
            text: { type: "string", maxLength: 4000 },
          },
        },
      },
    },
  };
  const original = structuredClone(contract);
  const grammar = googleStructuralSchema(contract);
  expect(grammar.properties.segments).not.toHaveProperty("maxItems");
  expect(grammar.properties.segments.items.properties.start).toEqual({
    type: ["number", "null"],
  });
  expect(grammar.properties.version).toEqual({
    type: "string",
    enum: ["1.0.0"],
  });
  expect(contract).toEqual(original);
  expect(
    googleRequest({ ...payload, schema: contract }).systemInstruction.parts[0]
      .text,
  ).toContain(JSON.stringify(original));
});
const usage = {
  promptTokenCount: 100,
  candidatesTokenCount: 20,
  thoughtsTokenCount: 10,
  totalTokenCount: 130,
  trafficType: "ON_DEMAND",
};
it("counts before generation and refuses a quote exceeding the approved spend", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(Response.json({ totalTokens: 100000 }));
  vi.stubGlobal("fetch", fetcher);
  await expect(
    googleGenerate(
      { ...payload, maxMicros: 1 },
      "synthetic",
      "synthetic-project",
    ),
  ).rejects.toThrow("BUDGET_EXCEEDED");
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][0]).toContain(
    "aiplatform.eu.rep.googleapis.com",
  );
  const body = googleRequest(payload);
  expect(body).not.toHaveProperty("tools");
  expect(body).not.toHaveProperty("cachedContent");
  expect(body.generationConfig).not.toHaveProperty("temperature");
});
it("reconciles thinking usage and returns measured usage even when the output is incomplete", async () => {
  expect(googleMicros(1000000, 1000000)).toBe(4620000);
  expect(googleUsage({ usageMetadata: usage }, 10000).outputTokens).toBe(30);
  for (const mutation of [
    { ...usage, totalTokenCount: 129 },
    { ...usage, trafficType: "ON_DEMAND_PRIORITY" },
    { ...usage, toolUsePromptTokenCount: 1 },
    { ...usage, promptTokenCount: -1 },
  ])
    expect(() => googleUsage({ usageMetadata: mutation }, 10000)).toThrow(
      "COST_RECONCILIATION_REQUIRED",
    );
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ totalTokens: 100 }))
    .mockResolvedValueOnce(
      Response.json({
        usageMetadata: usage,
        candidates: [
          { finishReason: "MAX_TOKENS", content: { parts: [{ text: "{" }] } },
        ],
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  const result = await googleGenerate(
    payload,
    "synthetic",
    "synthetic-project",
  );
  expect(result.error).toContain("PROVIDER_ERROR");
  expect(result.usage.costMicros).toBeGreaterThan(0);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
