import { afterEach, describe, expect, it, vi } from "vitest";
import {
  authorizeMoondream,
  MOONDREAM_MODEL,
  GEMMA4_MODEL,
  visionRequest,
  visionText,
} from "../packages/providers/vision";
import { cfRun } from "../packages/providers/cloudflare";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("bounds reviewed Gemma 4 image calls and rejects missing setup, truncated output and tools", async () => {
  const pixels = new Uint8Array([255, 216, 255]);
  expect(() => visionRequest(pixels, { VISION_MODEL: GEMMA4_MODEL })).toThrow(
    "SETUP_REQUIRED",
  );
  const request = visionRequest(pixels, {
    VISION_MODEL: GEMMA4_MODEL,
    GEMMA4_VISION_QUOTE_VERIFIED: "true",
  });
  expect(request.maxNeurons).toBeGreaterThanOrEqual(
    Math.ceil((256000 * 9091 + 400 * 27273) / 1000000),
  );
  expect(request.input).toMatchObject({
    max_completion_tokens: 400,
    chat_template_kwargs: { enable_thinking: false },
    tool_choice: "none",
    store: false,
    stream: false,
    n: 1,
  });
  const body = JSON.stringify(request.input);
  expect(body).toContain("data:image/jpeg;base64,");
  expect(body).not.toContain("https://");
  const valid = {
    choices: [
      {
        finish_reason: "stop",
        message: { content: "Owned visible reference" },
      },
    ],
  };
  expect(visionText(GEMMA4_MODEL, valid)).toBe("Owned visible reference");
  for (const choice of [
    { finish_reason: "length", message: { content: "Truncated" } },
    { finish_reason: "stop", message: { refusal: "Refused" } },
    { finish_reason: "stop", message: { content: "Tool", tool_calls: [{}] } },
  ])
    expect(() => visionText(GEMMA4_MODEL, { choices: [choice] })).toThrow(
      "INVALID_EVIDENCE",
    );
  vi.stubEnv("CLOUDFLARE_FREE_PLAN_VERIFIED_AT", new Date().toISOString());
  vi.stubEnv("CLOUDFLARE_AI_TOKEN", "synthetic-token");
  vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "synthetic-account");
  vi.stubEnv("GEMMA4_VISION_QUOTE_VERIFIED", "");
  const fetcher = vi.fn(async () =>
    Response.json({ success: true, result: valid }),
  );
  vi.stubGlobal("fetch", fetcher);
  await expect(cfRun(GEMMA4_MODEL, request.input)).rejects.toThrow(
    "SETUP_REQUIRED",
  );
  expect(fetcher).not.toHaveBeenCalled();
  vi.stubEnv("GEMMA4_VISION_QUOTE_VERIFIED", "true");
  expect(
    visionText(GEMMA4_MODEL, await cfRun(request.model, request.input)),
  ).toBe("Owned visible reference");
  expect(fetcher).toHaveBeenCalledOnce();
});
describe("licensed vision route", () => {
  it("blocks a new licensed model before making any provider request", () => {
    const pixels = new Uint8Array([255, 216, 255]);
    expect(() =>
      visionRequest(pixels, {
        VISION_MODEL: "@cf/moondream/moondream3.1-9B-A2B",
      }),
    ).toThrow("SETUP_REQUIRED");
    expect(() =>
      visionRequest(pixels, { VISION_MODEL: "invented-model" }),
    ).toThrow("SETUP_REQUIRED");
    expect(() => visionRequest(new Uint8Array(1000001))).toThrow(
      "INVALID_EVIDENCE",
    );
  });
  it("uses the documented bounded query without hidden reasoning after operator setup", () => {
    const request = visionRequest(new Uint8Array([255, 216, 255]), {
      VISION_MODEL: "@cf/moondream/moondream3.1-9B-A2B",
      MOONDREAM_LICENSE_ACCEPTED_VERSION: "model/1.0",
      MOONDREAM_LICENSE_ACCEPTED_BY: "synthetic-owner",
      MOONDREAM_LICENSE_ACCEPTED_AT: "2026-09-30T00:00:00Z",
      MOONDREAM_QUOTE_VERIFIED: "true",
    });
    expect(request.input).toMatchObject({
      task: "query",
      reasoning: false,
      max_tokens: 400,
      stream: false,
    });
    expect(request.maxNeurons).toBe(1000);
    expect(
      visionText(request.model, {
        answer: "Synthetic visible observation",
        reasoning: { text: "must not be retained" },
      }),
    ).toBe("Synthetic visible observation");
  });
  it("rejects invalid, future and unnamed license acceptance", () => {
    const accepted = {
      MOONDREAM_LICENSE_ACCEPTED_VERSION: "model/1.0",
      MOONDREAM_LICENSE_ACCEPTED_BY: "synthetic-owner",
      MOONDREAM_LICENSE_ACCEPTED_AT: "2026-09-30T00:00:00Z",
      MOONDREAM_QUOTE_VERIFIED: "true",
    };
    for (const change of [
      { MOONDREAM_LICENSE_ACCEPTED_AT: "invalid" },
      { MOONDREAM_LICENSE_ACCEPTED_AT: "2026-10-03T00:00:00Z" },
      { MOONDREAM_LICENSE_ACCEPTED_BY: " " },
      { MOONDREAM_QUOTE_VERIFIED: "false" },
    ])
      expect(() =>
        authorizeMoondream(
          { ...accepted, ...change },
          Date.parse("2026-10-02T00:00:00Z"),
        ),
      ).toThrow("SETUP_REQUIRED");
  });
  it("enforces consent at the HTTP broker and routes the reviewed model after setup", async () => {
    vi.stubEnv("CLOUDFLARE_AI_TOKEN", "synthetic-token");
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "synthetic-account");
    vi.stubEnv("CLOUDFLARE_FREE_PLAN_VERIFIED_AT", new Date().toISOString());
    vi.stubEnv("MOONDREAM_LICENSE_ACCEPTED_VERSION", "");
    const fetcher = vi.fn(async () =>
      Response.json({
        success: true,
        result: { answer: "Owned synthetic frame", usage: { neurons: 45 } },
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    await expect(cfRun(MOONDREAM_MODEL, {})).rejects.toThrow("SETUP_REQUIRED");
    expect(fetcher).not.toHaveBeenCalled();
    vi.stubEnv("MOONDREAM_LICENSE_ACCEPTED_VERSION", "model/1.0");
    vi.stubEnv("MOONDREAM_LICENSE_ACCEPTED_BY", "synthetic-owner");
    vi.stubEnv("MOONDREAM_LICENSE_ACCEPTED_AT", new Date().toISOString());
    vi.stubEnv("MOONDREAM_QUOTE_VERIFIED", "true");
    const request = visionRequest(new Uint8Array([255, 216, 255]), {
      ...process.env,
      VISION_MODEL: MOONDREAM_MODEL,
    });
    const result = await cfRun(request.model, request.input);
    expect(result.answer).toBe("Owned synthetic frame");
    expect(fetcher).toHaveBeenCalledOnce();
    const sent = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(sent[0]).toContain("/ai/run/" + MOONDREAM_MODEL);
    expect(JSON.parse(String(sent[1].body))).toMatchObject({
      task: "query",
      reasoning: false,
      max_tokens: 400,
      stream: false,
    });
    vi.stubEnv("CLOUDFLARE_FREE_PLAN_VERIFIED_AT", "2020-01-01T00:00:00Z");
    await expect(cfRun(MOONDREAM_MODEL, request.input)).rejects.toThrow(
      "SETUP_REQUIRED",
    );
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
