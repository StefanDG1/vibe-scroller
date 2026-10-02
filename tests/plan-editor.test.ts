import { expect, it } from "vitest";
import { readEditablePlan, reviewedPlan } from "../packages/plans/editor";
import { planInput } from "../packages/contracts";
const plan = {
  scope: " Update owned documentation ",
  nonGoals: [],
  files: [{ path: " README.md ", isNew: false }],
  steps: [" Explain behavior ", ""],
  tests: [" Review diff ", ""],
  risks: [],
  rollout: " Review PR ",
  rollback: " Revert ",
  unknowns: [],
};
it("preserves editing blanks and validates the reviewed plan without silently discarding unknown input", () => {
  const text = JSON.stringify(plan);
  expect(
    readEditablePlan(JSON.stringify({ ...plan, scope: "" })),
  ).not.toBeNull();
  const ready = reviewedPlan(text);
  expect(ready.steps).toEqual(["Explain behavior"]);
  expect(ready.files).toEqual([{ path: "README.md", isNew: false }]);
  expect(JSON.stringify(plan)).toBe(text);
  expect(() =>
    reviewedPlan(JSON.stringify({ ...plan, tests: ["", "  "] })),
  ).toThrow();
  expect(() =>
    reviewedPlan(JSON.stringify({ ...plan, steps: ["  "] })),
  ).toThrow();
  expect(() =>
    reviewedPlan(JSON.stringify({ ...plan, extraApproval: true })),
  ).toThrow();
  expect(() =>
    reviewedPlan(
      JSON.stringify({
        ...plan,
        files: [{ path: "README.md", isNew: "false" }],
      }),
    ),
  ).toThrow();
  expect(readEditablePlan("{broken")).toBeNull();
  expect(() =>
    planInput.parse({ ...reviewedPlan(text), tests: ["   "] }),
  ).toThrow();
  expect(() =>
    planInput.parse({ ...reviewedPlan(text), steps: ["   "] }),
  ).toThrow();
  expect(() =>
    planInput.parse({
      ...reviewedPlan(text),
      files: [{ path: "", isNew: true }],
    }),
  ).toThrow();
  expect(
    readEditablePlan(JSON.stringify({ ...plan, risks: [false] })),
  ).toBeNull();
});
