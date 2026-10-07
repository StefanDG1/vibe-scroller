export type KnowledgeReference = {
  sourceId: string;
  generation: number;
  revision: number;
  insightId: string;
};
type Member = {
  _id: string;
  excluded?: boolean;
  evidence?: {
    reference: KnowledgeReference;
    title: string;
    insight: { claim: string };
  } | null;
};
type Summary = {
  id: string;
  output: {
    relations: {
      kind: string;
      explanation: string;
      references: KnowledgeReference[];
    }[];
  };
};
export function referenceKey(r: KnowledgeReference) {
  return JSON.stringify([r.sourceId, r.generation, r.revision, r.insightId]);
}
// A connection is a cited group, not an inferred pairwise or causal edge.
export function buildKnowledgeMap(
  members: Member[],
  summaries: Summary[],
  relationOffset = 0,
) {
  const byReference = new Map(
    members
      .filter((m) => !m.excluded && m.evidence)
      .map((m) => [referenceKey(m.evidence!.reference), m] as const),
  );
  const insights = [...byReference.values()];
  const allRelations = summaries.flatMap((s) =>
    s.output.relations.flatMap((r, i) => {
      const keys = [...new Set(r.references.map(referenceKey))];
      if (keys.length < 2 || keys.some((key) => !byReference.has(key)))
        return [];
      return [
        {
          id: `${s.id}:${i}`,
          kind: r.kind,
          explanation: r.explanation,
          members: keys.map((key) => byReference.get(key)!),
        },
      ];
    }),
  );
  const capacity = Math.max(0, 40 - insights.length);
  const relations = allRelations.slice(
    relationOffset,
    relationOffset + capacity,
  );
  const connected = new Set(
    relations.flatMap((r) => r.members.map((m) => m._id)),
  );
  return {
    insights,
    relations,
    omittedRelations: allRelations.length - relations.length,
    nextRelations:
      capacity > 0 && relationOffset + relations.length < allRelations.length
        ? relationOffset + relations.length
        : null,
    other: insights.filter((m) => !connected.has(m._id)),
  };
}
