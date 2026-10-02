export interface DatabaseArchiveInfo {
  purpose: "database-backup" | "deletion-markers";
  deployment: string;
  commit: string;
  workingTreeDirty?: boolean;
}
export interface DatabaseArchive {
  metadata: DatabaseArchiveInfo & {
    version: 1;
    capturedAt: number;
    expiresAt: number;
    bytes: number;
    sha256: string;
    workingTreeDirty: boolean;
  };
  iv: string;
  tag: string;
  ciphertext: string;
}
export function sealDatabase(
  bytes: Uint8Array,
  info: DatabaseArchiveInfo,
  key: Uint8Array,
  now?: number,
): DatabaseArchive;
export function openDatabase(
  sealed: DatabaseArchive,
  context: {
    restoreLock: boolean;
    sourceDeployment: string;
    destinationDeployment: string;
    purpose: DatabaseArchiveInfo["purpose"];
  },
  key: Uint8Array,
  now?: number,
): Buffer;
