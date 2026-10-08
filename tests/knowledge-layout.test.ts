import { expect, it } from "vitest";
import { buildKnowledgeMap } from "../apps/starter/lib/knowledge-map";
import {
  layoutKnowledgeNetwork,
  layoutTopicDiagram,
} from "../apps/starter/lib/knowledge-layout";
it("lays out only exact cited group edges, with deterministic bounded positions", () => {
  const members = ["a", "b", "c"].map((id) => ({
    _id: id,
    evidence: {
      title: id,
      insight: { claim: id },
      reference: { sourceId: id, generation: 1, revision: 1, insightId: id },
    },
  }));
  const graph = buildKnowledgeMap(members, [
    {
      id: "group",
      output: {
        relations: [
          {
            kind: "similar",
            explanation: "Synthetic group",
            references: members.slice(0, 2).map((m) => m.evidence.reference),
          },
        ],
      },
    },
  ]);
  const layout = layoutKnowledgeNetwork(graph);
  expect(layoutKnowledgeNetwork(graph)).toEqual(layout);
  const phone = layoutKnowledgeNetwork(graph, 290);
  expect(phone.width).toBe(290);
  expect(
    phone.nodes.every(
      (n) =>
        n.radius * 2 * 0.65 >= 44 &&
        n.x >= n.radius &&
        n.x <= phone.width - n.radius,
    ),
  ).toBe(true);
  expect(layout.edges).toEqual([
    { from: "relation:group:0", to: "insight:a", kind: "similar" },
    { from: "relation:group:0", to: "insight:b", kind: "similar" },
  ]);
  expect(
    layout.nodes.every(
      (n) =>
        Number.isFinite(n.x) &&
        n.x >= n.radius &&
        n.x <= layout.width - n.radius &&
        n.y >= n.radius &&
        n.y <= layout.height - n.radius,
    ),
  ).toBe(true);
  expect(layoutKnowledgeNetwork(buildKnowledgeMap([], [])).nodes).toEqual([]);
});
it("draws saved hierarchy only, preserves missing-parent roots and bounds cycles", () => {
  const layout = layoutTopicDiagram([
    { id: "root" },
    { id: "child", parentId: "root" },
    { id: "other", parentId: "off-page" },
  ]);
  expect(layout.edges).toEqual([{ from: "root", to: "child" }]);
  expect(layout.nodes.find((n) => n.id === "child")!.y).toBeGreaterThan(
    layout.nodes.find((n) => n.id === "root")!.y,
  );
  expect(
    layoutTopicDiagram([
      { id: "a", parentId: "b" },
      { id: "b", parentId: "a" },
    ]).edges,
  ).toEqual([]);
});
