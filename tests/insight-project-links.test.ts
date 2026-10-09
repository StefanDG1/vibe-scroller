import { expect, it } from "vitest";
import { linkedInsightProjects } from "../apps/starter/lib/insight-project-links";
it("links only the exact source and insight with current authorized evidence", () => {
  const evaluations = [
    { id: "exact", current: true, sources: [{ id: "a", insights: ["one"] }] },
    {
      id: "other-insight",
      current: true,
      sources: [{ id: "a", insights: ["two"] }],
    },
    {
      id: "other-source",
      current: true,
      sources: [{ id: "b", insights: ["one"] }],
    },
    { id: "stale", current: false, sources: [{ id: "a", insights: ["one"] }] },
  ];
  expect(
    linkedInsightProjects({ sourceId: "a", insightId: "one" }, evaluations).map(
      (value) => value.id,
    ),
  ).toEqual(["exact"]);
});
