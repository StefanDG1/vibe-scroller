import { expect, it } from "vitest";
import {
  insightPresentation,
  presentAnalysis,
} from "../packages/insights/presentation";
import { insightOutput } from "../packages/contracts";
import fixture from "../fixtures/insight.json";
it("uses authored metadata and gives legacy insights stable semantic icons without changing evidence", () => {
  const insight = {
    title: "Measure first-use success",
    claim: "A source claim remains exact.",
    icon: "chart",
    categories: ["product_design"],
  };
  expect(insightPresentation(insight)).toEqual({
    title: insight.title,
    icon: "chart",
  });
  expect(insight.claim).toBe("A source claim remains exact.");
  expect(
    insightPresentation({
      title: "Protect private evidence",
      claim: "Original",
    }).icon,
  ).toBe("shield");
  expect(
    insightPresentation({
      title: "Build an interface",
      claim: "Original",
      icon: "https://untrusted.test/script",
    }).icon,
  ).toBe("palette");
});
it("accepts old analysis and only whitelisted icon keys on new analysis", () => {
  expect(insightOutput.safeParse(fixture).success).toBe(true);
  const output = structuredClone(fixture) as any;
  output.insights[0].icon = "palette";
  expect(insightOutput.safeParse(output).success).toBe(true);
  output.insights[0].icon = "javascript:alert(1)";
  expect(insightOutput.safeParse(output).success).toBe(false);
});

it("fills missing icons once at completion and preserves the original title, claim and evidence", () => {
  const old = {
    insights: [
      {
        title: "Interface spacing",
        claim: "Exact quotation",
        evidence: [{ id: "frame-1" }],
        categories: ["product_design"],
      },
    ],
  };
  const result = presentAnalysis(old);
  expect(result.insights[0].icon).toBe("palette");
  expect(result.insights[0].claim).toBe(old.insights[0].claim);
  expect(result.insights[0].evidence).toEqual(old.insights[0].evidence);
  expect(old.insights[0]).not.toHaveProperty("icon");
});
