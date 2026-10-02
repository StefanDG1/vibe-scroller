import type { EvidenceFrame, EvidenceArchive } from "./evidence-backup.mjs";
export function readEvidenceBytes(
  response: Response,
  expectedSize: number,
): Promise<Uint8Array>;
type CurrentFrame = EvidenceFrame | null;
export function backupEvidenceBatch(options: {
  page: (
    cursor: string | null,
    asOf: number,
  ) => Promise<{ entries: EvidenceFrame[]; isDone: boolean; cursor?: string }>;
  read: (entry: EvidenceFrame) => Promise<Uint8Array>;
  current: (entry: EvidenceFrame) => Promise<CurrentFrame>;
  save: (index: number, archive: EvidenceArchive) => Promise<void>;
  key: Uint8Array;
  now?: number;
}): Promise<{
  visited: number;
  saved: number;
  skipped: number;
  bytes: number;
  encrypted: boolean;
}>;
export function restoreEvidenceBatch(options: {
  archives: AsyncIterable<EvidenceArchive> | Iterable<EvidenceArchive>;
  current: (entry: EvidenceFrame) => Promise<unknown>;
  put: (entry: EvidenceFrame, data: Uint8Array) => Promise<void>;
  read: (entry: EvidenceFrame) => Promise<Uint8Array>;
  remove: (entry: EvidenceFrame) => Promise<void>;
  key: Uint8Array;
  now?: number;
}): Promise<{ restored: number; bytes: number; hashVerified: boolean }>;
