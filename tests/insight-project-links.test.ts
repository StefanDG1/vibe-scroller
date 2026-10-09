import { expect, it } from "vitest";
import {
  linkedInsightProjects,
  linkedInsightProposals,
  insightProposalStatus,
} from "../apps/starter/lib/insight-project-links";
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

it("withholds a neighboring insight's draft, stale versions and completed proposals while deduplicating exact records", () => {
  const ref = { sourceId: "a", insightId: "one", generation: 2, revision: 3 };
  const steps = [
    { id: "yes", references: [ref], state: "ready" },
    {
      id: "different",
      references: [{ ...ref, insightId: "two" }],
      state: "ready",
    },
    { id: "stale", references: [{ ...ref, revision: 2 }], state: "ready" },
    {
      id: "done",
      references: [ref],
      state: "published",
      run: { mergedAt: 100 },
    },
    { id: "unproven", state: "ready" },
  ];
  const evaluation = {
    current: true,
    repository: "Allowed/project",
    sources: [{ id: "a", insights: ["one", "two"] }],
    steps,
  };
  expect(
    linkedInsightProposals(ref, [evaluation, evaluation]).map((s) => s.id),
  ).toEqual(["yes"]);
  expect(
    linkedInsightProposals(ref, [{ ...evaluation, current: false }]),
  ).toEqual([]);
});

it("shows exact current closed/merged history separately without restoring deleted or neighboring evidence", () => {
  const reference = {
    sourceId: "a",
    insightId: "one",
    generation: 2,
    revision: 3,
  };
  const evaluation = {
    current: true,
    repository: "Allowed/project",
    sources: [{ id: "a", insights: ["one"] }],
    steps: [
      {
        id: "open",
        state: "published",
        references: [reference],
        run: { prState: "open" },
      },
      {
        id: "closed",
        state: "published",
        references: [reference],
        run: { prState: "closed" },
      },
      {
        id: "merged",
        state: "published",
        references: [reference],
        run: { mergedAt: 1 },
      },
      { id: "rejected", state: "rejected", references: [reference] },
      { id: "deleted", state: "deleted", references: [reference] },
      {
        id: "old",
        state: "published",
        references: [{ ...reference, revision: 1 }],
        run: { prState: "closed" },
      },
    ],
  };
  expect(
    linkedInsightProposals(reference, [evaluation], true).map((s) => s.id),
  ).toEqual(["open", "closed", "merged", "rejected"]);
  expect(
    linkedInsightProposals(reference, [evaluation]).map((s) => s.id),
  ).toEqual(["open"]);
  expect(
    linkedInsightProposals(
      reference,
      [{ ...evaluation, current: false }],
      true,
    ),
  ).toEqual([]);
  expect(insightProposalStatus(evaluation.steps[1])).toEqual({
    open: false,
    label: "Closed",
    known: true,
  });
  expect(insightProposalStatus(evaluation.steps[2])).toEqual({
    open: false,
    label: "Merged",
    known: true,
  });
});
