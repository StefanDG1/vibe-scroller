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

export function linkedInsightProposals(
  reference: Reference & { generation: number; revision: number },
  evaluations: any[],
) {
  const seen = new Set<string>();
  return linkedInsightProjects(reference, evaluations).flatMap((evaluation) =>
    evaluation.steps
      .filter((step: any) => {
        if (
          seen.has(step.id) ||
          ["deleted", "rejected"].includes(step.state) ||
          step.run?.mergedAt ||
          step.run?.prState === "closed"
        )
          return false;
        const cited = step.references?.some(
          (ref: any) =>
            ref.sourceId === reference.sourceId &&
            ref.insightId === reference.insightId &&
            ref.generation === reference.generation &&
            ref.revision === reference.revision,
        );
        if (cited) seen.add(step.id);
        return cited;
      })
      .map((step: any) => ({ ...step, repository: evaluation.repository })),
  );
}
