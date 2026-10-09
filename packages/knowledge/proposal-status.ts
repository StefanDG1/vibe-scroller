// Shared display/count policy. Unknown states cannot establish an open total.
export function insightProposalStatus(step: any) {
  if (step.run?.mergedAt || step.run?.prState === "merged")
    return { open: false, label: "Merged", known: true };
  if (
    ["closed", "closed_unmerged"].includes(step.run?.prState) ||
    step.issueState === "closed"
  )
    return { open: false, label: "Closed", known: true };
  if (["rejected", "deleted"].includes(step.state))
    return {
      open: false,
      label: step.state === "deleted" ? "Deleted" : "Rejected",
      known: true,
    };
  if (step.run?.prState === "open")
    return { open: true, label: "Pull request open", known: true };
  const labels: Record<string, string> = {
    draft: "Draft",
    ready: "Ready for review",
    approved: "Approved",
    publishing: "Publishing",
    published: "Published",
  };
  return {
    open: !!labels[step.state],
    known: !!labels[step.state],
    label: labels[step.state] ?? "Status unavailable",
  };
}
