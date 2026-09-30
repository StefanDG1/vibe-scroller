import { ensure } from "../policy";
export type RepositoryExcerpt = {
  path: string;
  startLine: number;
  endLine: number;
  content: string;
  blobSha: string;
};
export function excerpt(
  path: string,
  text: string,
  blobSha: string,
  available: number,
): RepositoryExcerpt | null {
  const selected: string[] = [];
  let size = 0;
  for (const line of text.replaceAll("\r\n", "\n").split("\n")) {
    if (size + line.length + 1 > Math.min(8000, available)) break;
    selected.push(line);
    size += line.length + 1;
  }
  return selected.length
    ? {
        path,
        startLine: 1,
        endLine: selected.length,
        content: selected.join("\n"),
        blobSha,
      }
    : null;
}
export function validateRepositoryEvidence(
  evidence: { path: string; startLine: number; endLine: number }[],
  excerpts: RepositoryExcerpt[],
) {
  for (const item of evidence) {
    const inspected = excerpts.find((row) => row.path === item.path);
    ensure(
      inspected &&
        Number.isSafeInteger(item.startLine) &&
        Number.isSafeInteger(item.endLine) &&
        item.startLine >= inspected.startLine &&
        item.endLine >= item.startLine &&
        item.endLine <= inspected.endLine,
      "INVALID_EVIDENCE",
      "Repository evidence is outside the inspected excerpt. Refresh context or request more evidence.",
    );
  }
}
