export type EvidenceFrame = {
  organizationId: string;
  sourceId: string;
  generation: number;
  key: string;
  type: string;
  size: number;
  restoreUntil: number;
  expiresAt?: number;
};
export type EvidenceArchive = {
  metadata: {
    version: number;
    purpose: string;
    capturedAt: number;
    evidence: EvidenceFrame;
    sha256: string;
  };
  iv: string;
  tag: string;
  ciphertext: string;
};
export function sealEvidence(
  evidence: EvidenceFrame,
  bytes: Uint8Array,
  backupKey: Uint8Array,
  now?: number,
): EvidenceArchive;
export function openEvidence(
  archive: unknown,
  backupKey: Uint8Array,
  current: unknown,
  now?: number,
): Buffer;
export function verifyEvidenceBackup(
  archive: unknown,
  backupKey: Uint8Array,
  current: EvidenceFrame | null,
  now?: number,
): { sha256: string; size: number };
