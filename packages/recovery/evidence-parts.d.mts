import type { EvidenceArchive, EvidenceFrame } from "./evidence-backup.mjs";
export interface EvidencePart {
  index: number;
  saved: number;
  bytes: number;
  firstArchive: number;
  lastArchive: number;
}
export interface EvidenceCheckpoint {
  version: 1;
  deployment: string;
  commit: string;
  asOf: number;
  maximumPartBytes: number;
  cursor: string | null;
  nextCursor: string | null;
  pageDone: boolean;
  pending: EvidenceFrame[];
  keys: string[];
  cursors: string[];
  parts: EvidencePart[];
  visited: number;
  saved: number;
  skipped: number;
  bytes: number;
  part: number;
  partBytes: number;
  partSaved: number;
  complete: boolean;
}
export interface SealedEvidenceCheckpoint {
  metadata: {
    version: 1;
    purpose: string;
    deployment: string;
    commit: string;
    asOf: number;
  };
  iv: string;
  tag: string;
  ciphertext: string;
}
export function createEvidenceCheckpoint(options: {
  deployment: string;
  commit: string;
  asOf?: number;
  maximumPartBytes?: number;
}): EvidenceCheckpoint;
export function sealEvidenceCheckpoint(
  state: EvidenceCheckpoint,
  key: Uint8Array,
  now?: number,
): SealedEvidenceCheckpoint;
export function openEvidenceCheckpoint(
  archive: unknown,
  key: Uint8Array,
  context: { deployment: string; commit: string },
  now?: number,
): EvidenceCheckpoint;
export function backupEvidencePart(options: {
  state: EvidenceCheckpoint;
  key: Uint8Array;
  page: (
    cursor: string | null,
    asOf: number,
  ) => Promise<{ entries: EvidenceFrame[]; isDone: boolean; cursor?: string }>;
  current: (entry: EvidenceFrame) => Promise<EvidenceFrame | null>;
  read: (entry: EvidenceFrame) => Promise<Uint8Array>;
  save: (index: number, archive: EvidenceArchive) => Promise<void>;
  existing: (
    index: number,
    entry: EvidenceFrame,
  ) => Promise<EvidenceArchive | null>;
  checkpoint: (archive: SealedEvidenceCheckpoint) => Promise<void>;
  maximumPartBytes?: number;
  clock?: () => number;
}): Promise<{
  complete: boolean;
  part?: EvidencePart;
  reused: number;
  parts?: number;
  saved: number;
  skipped: number;
  bytes: number;
}>;
