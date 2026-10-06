import { describe, expect, it } from "vitest";
import { buildKnowledgeMap } from "../apps/starter/lib/knowledge-map";
const reference = (id: string, revision = 1) => ({
  sourceId: id,
  generation: 2,
  revision,
  insightId: "claim",
});
const member = (id: string) => ({
  _id: id,
  evidence: {
    reference: reference(id),
    title: id,
    insight: { claim: "Claim " + id },
  },
});
const summary = (references: ReturnType<typeof reference>[]) => [
  {
    id: "summary",
    output: {
      relations: [
        { kind: "conflicting", explanation: "Different advice", references },
      ],
    },
  },
];
describe("knowledge map provenance", () => {
  it("preserves a multi-source group without inventing pairwise edges", () => {
    const graph = buildKnowledgeMap(
      [member("a"), member("b"), member("c"), member("d")],
      summary([reference("a"), reference("b"), reference("c"), reference("a")]),
    );
    expect(graph.relations).toHaveLength(1);
    expect(graph.relations[0].members.map((m) => m._id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(graph.relations[0].kind).toBe("conflicting");
    expect(graph.other.map((m) => m._id)).toEqual(["d"]);
  });
  it("does not render a connection with excluded, deleted, stale or off-page evidence", () => {
    for (const missing of [
      { ...member("b"), excluded: true },
      { _id: "b", evidence: null },
      {
        ...member("b"),
        evidence: { ...member("b").evidence, reference: reference("b", 2) },
      },
    ]) {
      expect(
        buildKnowledgeMap(
          [member("a"), missing],
          summary([reference("a"), reference("b")]),
        ).relations,
      ).toEqual([]);
    }
    expect(
      buildKnowledgeMap(
        [member("a")],
        summary([reference("a"), reference("b")]),
      ).relations,
    ).toEqual([]);
  });
  it("deduplicates exact insight references and requires two distinct cited ideas", () => {
    const graph = buildKnowledgeMap(
      [member("a"), { ...member("a"), _id: "duplicate" }],
      summary([reference("a"), reference("a")]),
    );
    expect(graph.insights).toHaveLength(1);
    expect(graph.relations).toEqual([]);
    expect(buildKnowledgeMap([], []).insights).toEqual([]);
  });
});
