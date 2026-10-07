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
  it("pages cited groups within forty nodes without losing or inventing supporting inputs", () => {
    const members = Array.from({ length: 20 }, (_, n) => member(String(n)));
    const summaries = Array.from({ length: 31 }, (_, n) => ({
      ...summary([reference("0"), reference("1")])[0],
      id: `summary-${n}`,
    }));
    const first = buildKnowledgeMap(members, summaries);
    expect(first.insights.length + first.relations.length).toBe(40);
    expect(first.nextRelations).toBe(20);
    const second = buildKnowledgeMap(members, summaries, first.nextRelations!);
    expect(second.relations).toHaveLength(11);
    expect(second.nextRelations).toBeNull();
    expect(
      new Set([...first.relations, ...second.relations].map((r) => r.id)).size,
    ).toBe(31);
    expect(
      second.relations.every(
        (r) => r.members.map((m) => m._id).join() === "0,1",
      ),
    ).toBe(true);
  });
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
