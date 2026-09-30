import { excerpt, type RepositoryExcerpt } from "./context";
import { EXTRACTION_VERSION } from "./prepare";
export type ManifestEntry = {
  path: string;
  blobSha: string;
  mode: string;
  size: number;
};
export type PreviousSnapshot = {
  updatedAt: number;
  extractionVersion?: string;
  profileVersion: number;
  contextExcerpts?: RepositoryExcerpt[];
  manifestEntries?: ManifestEntry[];
};
export function reuseExcerpt(
  file: ManifestEntry,
  previous: PreviousSnapshot | null | undefined,
  available: number,
  now = Date.now(),
) {
  if (
    !previous ||
    previous.extractionVersion !== EXTRACTION_VERSION ||
    previous.updatedAt > now ||
    now - previous.updatedAt >= 86400000
  )
    return null;
  const old = previous.contextExcerpts?.find(
    (e) =>
      e.path === file.path && e.blobSha === file.blobSha && e.startLine === 1,
  );
  if (
    !old ||
    !previous.manifestEntries?.some(
      (entry) =>
        entry.path === file.path &&
        entry.blobSha === file.blobSha &&
        entry.mode === file.mode &&
        entry.size === file.size,
    )
  )
    return null;
  // Small complete blobs or excerpts that already fill the current bounded request can be reused.
  const bytes = new TextEncoder().encode(old.content).length;
  if (bytes !== file.size && old.content.length < Math.min(7900, available))
    return null;
  return excerpt(file.path, old.content, file.blobSha, available);
}
export function manifestDelta(
  entries: ManifestEntry[],
  previous: ManifestEntry[] = [],
) {
  const prior = new Map(previous.map((entry) => [entry.path, entry]));
  const current = new Set(entries.map((entry) => entry.path));
  return {
    addedToManifest: entries
      .filter((entry) => !prior.has(entry.path))
      .map((entry) => entry.path),
    changedBlobs: entries
      .filter(
        (entry) =>
          prior.has(entry.path) &&
          (prior.get(entry.path)!.blobSha !== entry.blobSha ||
            prior.get(entry.path)!.mode !== entry.mode),
      )
      .map((entry) => entry.path),
    removedFromManifest: previous
      .filter((entry) => !current.has(entry.path))
      .map((entry) => entry.path),
  };
}
