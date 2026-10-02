import { expect, it } from "vitest";
import { selectedInsights } from "../packages/insights/scope";
it("defaults to the whole post, respects exclusions in original order and rejects unknown, duplicate or empty scope", () => {
  const points = [
    { id: "first", title: "First" },
    { id: "second", title: "Second" },
    { id: "third", title: "Third" },
  ];
  expect(selectedInsights(points)).toEqual(points);
  expect(selectedInsights(points, ["third", "first"])).toEqual([
    points[0],
    points[2],
  ]);
  for (const ids of [[], ["first", "first"], ["missing"]])
    expect(() => selectedInsights(points, ids)).toThrow();
  expect(() => selectedInsights([])).toThrow();
});
