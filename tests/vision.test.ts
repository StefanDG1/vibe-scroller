import { describe, expect, it } from "vitest";
import { visionRequest, visionText } from "../packages/providers/vision";
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
    expect(
      visionText(request.model, {
        answer: "Synthetic visible observation",
        reasoning: { text: "must not be retained" },
      }),
    ).toBe("Synthetic visible observation");
  });
});
