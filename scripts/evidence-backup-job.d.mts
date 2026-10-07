export interface EvidenceJobProcessResult {
  status: number | null;
  signal: string | null;
  stderr: string;
}
export function classifyEvidenceJob(
  result: EvidenceJobProcessResult,
  state: { complete: boolean },
): { complete: boolean; needsResume: boolean };
export function evidenceJob(options: {
  output: string;
  shard: string;
  key: Uint8Array;
  commit: string;
  resume?: string;
  final?: boolean;
  run: () => EvidenceJobProcessResult;
}): {
  complete: boolean;
  needsResume: boolean;
  asOf: number;
  saved: number;
  bytes: number;
};
