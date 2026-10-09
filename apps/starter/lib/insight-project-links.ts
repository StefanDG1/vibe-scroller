import { insightProposalStatus } from "../../../packages/knowledge/proposal-status";
export { insightProposalStatus } from "../../../packages/knowledge/proposal-status";
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
  includeHistory = false,
) {
  const seen = new Set<string>();
  return linkedInsightProjects(reference, evaluations).flatMap((evaluation) =>
    evaluation.steps
      .filter((step: any) => {
        if (
          seen.has(step.id) ||
          step.state === "deleted" ||
          (!includeHistory && !insightProposalStatus(step).open)
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
