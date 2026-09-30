import { afterEach, describe, expect, it, vi } from "vitest";
import {
  customerModels,
  customerQuote,
  customerCostCents,
  customerStructured,
  discoverCustomerModels,
} from "../packages/providers/customerAi";
import { encrypt, decrypt } from "../packages/providers/secrets";
const model = {
  id: "synthetic-model",
  version: "synthetic-v1",
  inputUsdCentsPerMillion: 75,
  outputUsdCentsPerMillion: 450,
  maxInputBytes: 10000,
  maxOutputTokens: 4000,
  verifiedAt: Date.now(),
  structuredOutput: true as const,
  dataPolicyUrl: "https://example.test/synthetic-policy",
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("Customer-key provider boundaries, synthetic tests only", () => {
  it("rejects missing, malformed, duplicate, stale and future operator registries", () => {
    vi.stubEnv("OPENAI_CUSTOMER_MODELS_JSON", "[]");
    expect(customerModels()).toEqual([]);
    vi.stubEnv("OPENAI_CUSTOMER_MODELS_JSON", "{");
    expect(customerModels()).toEqual([]);
    vi.stubEnv("OPENAI_CUSTOMER_MODELS_JSON", JSON.stringify([model, model]));
    expect(customerModels()).toEqual([]);
    vi.stubEnv(
      "OPENAI_CUSTOMER_MODELS_JSON",
      JSON.stringify([{ ...model, verifiedAt: Date.now() - 31 * 86400000 }]),
    );
    expect(customerModels()).toEqual([]);
    vi.stubEnv(
      "OPENAI_CUSTOMER_MODELS_JSON",
      JSON.stringify([{ ...model, verifiedAt: Date.now() + 60000 }]),
    );
    expect(customerModels()).toEqual([]);
  });
  it("discovers only available reviewed models without sending inference", async () => {
    vi.stubEnv("OPENAI_CUSTOMER_MODELS_JSON", JSON.stringify([model]));
    const request = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ data: [{ id: model.id }, { id: "unreviewed" }] }),
        ),
      );
    vi.stubGlobal("fetch", request);
    expect(await discoverCustomerModels("synthetic credential")).toEqual([
      model.id,
    ]);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe("https://api.openai.com/v1/models");
  });
  it("bounds provider cost before dispatch, keeps platform inference credits zero and rejects missing usage", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            usage: { input_tokens: 100, output_tokens: 100 },
            output: [
              {
                content: [{ type: "output_text", text: '{"synthetic":true}' }],
              },
            ],
          }),
        ),
      );
    vi.stubGlobal("fetch", request);
    await expect(
      customerStructured("synthetic credential", model, 0, {}, "synthetic", {}),
    ).rejects.toThrow("BUDGET_EXCEEDED");
    expect(request).not.toHaveBeenCalled();
    const result = await customerStructured(
      "synthetic credential",
      model,
      customerQuote(model),
      {},
      "synthetic",
      {},
    );
    expect(result).toMatchObject({
      output: { synthetic: true },
      credits: 0,
      providerUsdCents: 1,
    });
    const sent = JSON.parse(request.mock.calls[0][1].body);
    expect(sent.store).toBe(false);
    expect(sent.max_output_tokens).toBe(4000);
    expect(sent.input).not.toContain("synthetic credential");
    expect(() => customerCostCents(model, undefined as any, 0)).toThrow(
      "COST_RECONCILIATION_REQUIRED",
    );
    expect(customerCostCents(model, 1000000, 1000000)).toBe(525);
  });
  it("makes one request on refusal and never substitutes a funded account", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response("synthetic refusal", { status: 429 }));
    vi.stubGlobal("fetch", request);
    await expect(
      customerStructured(
        "synthetic credential",
        model,
        customerQuote(model),
        {},
        "synthetic",
        {},
      ),
    ).rejects.toThrow("PROVIDER_ERROR");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("binds encrypted keys to workspace, provider and encryption version", () => {
    vi.stubEnv("SECRET_KEY_VERSION", "synthetic");
    vi.stubEnv("SECRET_KEY_synthetic", Buffer.alloc(32, 7).toString("base64"));
    const saved = encrypt("owned synthetic canary", "workspace-a", "openai");
    expect(saved.ciphertext).not.toContain("owned synthetic canary");
    expect(
      decrypt(saved.ciphertext, saved.keyVersion, "workspace-a", "openai"),
    ).toBe("owned synthetic canary");
    expect(() =>
      decrypt(saved.ciphertext, saved.keyVersion, "workspace-b", "openai"),
    ).toThrow();
    expect(() =>
      decrypt(saved.ciphertext, saved.keyVersion, "workspace-a", "github"),
    ).toThrow();
  });
});
