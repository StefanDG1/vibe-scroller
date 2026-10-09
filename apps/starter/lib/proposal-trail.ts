export type TrailStage = {
  label: string;
  state: "recorded" | "pending";
  detail: string;
};
export function proposalTrail(
  proposal: {
    sourceId?: string;
    review?: string;
    planHash?: string;
  },
  runs: {
    proposalId?: string;
    prUrl?: string;
    mergedAt?: number | string;
    state?: string;
  }[],
): TrailStage[] {
  return [
    {
      label: "Saved post",
      state: proposal.sourceId ? "recorded" : "pending",
      detail: proposal.sourceId ? "Source linked" : "Source unavailable",
    },
    {
      label: "Project proposal",
      state: "recorded",
      detail:
        proposal.review === "accepted"
          ? "Accepted for planning"
          : (proposal.review?.replaceAll("_", " ") ?? "Review needed"),
    },
    {
      label: "Saved plan",
      state: proposal.planHash ? "recorded" : "pending",
      detail: proposal.planHash ? "Saved immutable plan" : "No saved plan",
    },
    {
      label: "Implementation",
      state: runs.length ? "recorded" : "pending",
      detail: runs.length
        ? runs
            .map(
              (run) => run.state?.replaceAll("_", " ") ?? "Status unavailable",
            )
            .join(", ")
        : "No linked run loaded",
    },
    {
      label: "Pull request",
      state: runs.some((run) => run.prUrl) ? "recorded" : "pending",
      detail: runs.some((run) => run.mergedAt)
        ? "Merge recorded; benefit needs separate evidence"
        : runs.some((run) => run.prUrl)
          ? "PR recorded"
          : "No PR loaded",
    },
  ];
}
