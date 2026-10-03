import { expect, it } from "vitest";
import {
  processingReceipt,
  speechProvenance,
} from "../packages/media/provenance";
import {
  googleCostPolicy,
  googleInferenceModel,
} from "../packages/providers/google-inference";
const receipt = {
  generation: 1,
  route: "google_metered",
  model: googleInferenceModel,
  costPolicy: googleCostPolicy,
  startedAt: 1000,
  completedAt: 2000,
  inputTokens: 1000,
  outputTokens: 1000,
  inferenceMicros: 4620,
  computeCredits: 1,
  chargedCredits: 2,
  reusedMedia: false,
};
it("refuses contradictory timing, tariff, token cost and allowance receipts", () => {
  expect(processingReceipt.parse(receipt)).toEqual(receipt);
  for (const change of [
    { completedAt: 999 },
    { costPolicy: "unknown" },
    { chargedCredits: 1 },
    { inferenceMicros: 1 },
    { inputTokens: -1 },
    { model: "other" },
    { chargedCredits: 11 },
  ])
    expect(processingReceipt.safeParse({ ...receipt, ...change }).success).toBe(
      false,
    );
  // Independently rounded requests can sum to more than a single aggregate quote.
  expect(
    processingReceipt.safeParse({ ...receipt, inferenceMicros: 4623 }).success,
  ).toBe(true);
});
it("preserves bounded language and uncertainty without claiming exact alignment", () => {
  expect(
    speechProvenance.safeParse({
      model: googleInferenceModel,
      language: "English",
      uncertainty: "Timing is approximate",
      timing: "approximate",
    }).success,
  ).toBe(true);
  for (const change of [
    { timing: "exact" },
    { uncertainty: "x".repeat(1001) },
    { language: "x".repeat(81) },
    { credential: "forbidden" },
  ])
    expect(
      speechProvenance.safeParse({
        model: googleInferenceModel,
        language: "English",
        uncertainty: "",
        timing: "approximate",
        ...change,
      }).success,
    ).toBe(false);
});
