export function sharedEvidenceLabel(evidence: {
  kind: string;
  startMs?: number | null;
}) {
  return typeof evidence.startMs === "number" &&
    Number.isFinite(evidence.startMs) &&
    evidence.startMs >= 0
    ? `${evidence.kind}: ${(evidence.startMs / 1000).toFixed(1)}s`
    : evidence.kind;
}
