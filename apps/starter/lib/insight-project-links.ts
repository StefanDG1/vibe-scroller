type Reference = { sourceId: string; insightId: string };
export function linkedInsightProjects<
  T extends {
    current: boolean;
    sources: { id: string; insights: string[] }[];
  },
>(reference: Reference, evaluations: T[]): T[] {
  return evaluations.filter(
    (evaluation) =>
      evaluation.current &&
      evaluation.sources.some(
        (source) =>
          source.id === reference.sourceId &&
          source.insights.includes(reference.insightId),
      ),
  );
}
