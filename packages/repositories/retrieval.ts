import { containsSecret, ensure, excludedPath } from "../policy";
import type { RepositoryExcerpt } from "./context";
import type { ManifestEntry } from "./snapshotCache";

export const RETRIEVAL_VERSION = "source-windows-v3";
// Read bounded windows from normal-sized components, not only small files.
export const RETRIEVAL_BLOB_LIMIT = 250000;
const stop = new Set(
  "about after already also application before between change could evidence example file files from have implementation improve insight into more need only point should source synthetic test that their them there these this through useful using video when where which with would".split(
    " ",
  ),
);
export function retrievalTerms(focus: string): string[] {
  return [
    ...new Set(
      focus
        .slice(0, 12000)
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .toLowerCase()
        .match(/[a-z][a-z0-9]{2,39}/g) ?? [],
    ),
  ]
    .filter((term) => !stop.has(term))
    .slice(0, 64);
}
function score(text: string, terms: string[]) {
  const words = new Set(retrievalTerms(text));
  return terms.reduce((total, term) => total + Number(words.has(term)), 0);
}
export function retrievalFiles(
  entries: ManifestEntry[],
  focus: string,
  required: string[] = [],
  includePackageManifests = false,
) {
  ensure(
    required.length <= 12,
    "REPO_TOO_LARGE",
    "Requested evidence paths exceed the inspection bound.",
  );
  const terms = retrievalTerms(focus);
  const interfaceFocus = terms.some((term) =>
    /^(?:interface|interfaces|readable|readability|button|buttons|contrast|spacing|mobile|touch)$/.test(
      term,
    ),
  );
  const marketingFocus = terms.some((term) =>
    /^(?:cta|conversion|conversions|landing|launch|marketing|checkout|parent|parents|buyer|buyers)$/.test(
      term,
    ),
  );
  const eligible = entries.filter(
    (file) =>
      !excludedPath(file.path) &&
      ["100644", "100755"].includes(file.mode) &&
      file.size <= RETRIEVAL_BLOB_LIMIT &&
      /(?:README|package\.json|\.(?:tsx?|jsx?|mjs|py|md|json|css|go|rs|java|rb))$/i.test(
        file.path,
      ),
  );
  ensure(
    required.every((path) => eligible.some((file) => file.path === path)),
    "CONTEXT_REQUIRED",
    "Cited paths are unavailable in the selected snapshot.",
  );
  // Planning needs the actual manager and scripts, even when many source paths
  // outrank package.json. Keep cited files first and the existing 24-file bound.
  const manifests = includePackageManifests
    ? eligible
        .filter(
          (file) =>
            file.path === "package.json" ||
            (file.path.endsWith("/package.json") &&
              required.some((path) =>
                path.startsWith(file.path.slice(0, -"package.json".length)),
              )),
        )
        .sort(
          (a, b) =>
            Number(b.path === "package.json") -
              Number(a.path === "package.json") ||
            a.path.length - b.path.length ||
            a.path.localeCompare(b.path),
        )
        .slice(0, 12)
        .map((file) => file.path)
    : [];
  return eligible
    .sort((a, b) => {
      const rank = (path: string) =>
        required.includes(path)
          ? 1000
          : manifests.includes(path)
            ? 900
            : score(
                path
                  .replaceAll("/", " ")
                  .replaceAll("_", " ")
                  .replaceAll("-", " ")
                  .replaceAll(".", " "),
                terms,
              ) *
                10 +
              (interfaceFocus && /\.(?:css|tsx|jsx)$/.test(path) ? 30 : 0) +
              (marketingFocus &&
              /(?:^|\/)(?:app|pages)\/(?!api\/|admin\/).*?(?:page|index)\.(?:tsx|jsx)$/.test(
                path,
              )
                ? 60
                : 0) -
              (marketingFocus &&
              /(?:^|\/)(?:admin|content-studio|native)\//.test(path) &&
              !terms.includes("admin") &&
              !terms.includes("studio")
                ? 60
                : 0) +
              (/^(?:README\.md|package\.json)$/.test(path)
                ? 5
                : /^(?:convex\/|src\/|apps\/starter\/)/.test(path)
                  ? 1
                  : 0);
      return rank(b.path) - rank(a.path) || a.path.localeCompare(b.path);
    })
    .slice(0, 24);
}

// Inspect a contiguous window rather than treating a file prefix as the whole file.
export function focusedExcerpt(
  file: ManifestEntry,
  text: string,
  focus: string,
  available: number,
  requiredLine?: number,
): RepositoryExcerpt | null {
  if (text.includes("\0") || containsSecret(text)) return null;
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  const terms = retrievalTerms(focus);
  const scores = lines.map((line) => score(line, terms));
  let center = requiredLine === undefined ? 0 : requiredLine - 1;
  if (requiredLine === undefined) {
    let best = 0;
    for (let i = 0; i < lines.length; i++) {
      const value = scores
        .slice(Math.max(0, i - 4), i + 5)
        .reduce((a, b) => a + b, 0);
      if (value > best) {
        best = value;
        center = i;
      }
    }
  }
  if (center < 0 || center >= lines.length) return null;
  let start = Math.max(0, center - 10);
  const limit = Math.min(4000, available);
  // Never truncate a line and then claim its full contents were inspected.
  while (
    start < center &&
    lines.slice(start, center + 1).join("\n").length > limit
  )
    start++;
  const selected: string[] = [];
  let size = 0;
  for (let i = start; i < lines.length; i++) {
    const next = lines[i].length + Number(selected.length > 0);
    if (size + next > limit) break;
    selected.push(lines[i]);
    size += next;
  }
  return selected.length && start + selected.length > center
    ? {
        path: file.path,
        blobSha: file.blobSha,
        startLine: start + 1,
        endLine: start + selected.length,
        content: selected.join("\n"),
      }
    : null;
}

export function validateInspectedContext(
  excerpts: RepositoryExcerpt[],
  entries: ManifestEntry[],
) {
  ensure(
    excerpts.length <= 24 &&
      excerpts.reduce((total, row) => total + row.content.length, 0) <= 40000,
    "INVALID_EVIDENCE",
    "Inspected context exceeds its quote.",
  );
  const paths = new Set<string>();
  for (const row of excerpts) {
    const file = entries.find(
      (entry) => entry.path === row.path && entry.blobSha === row.blobSha,
    );
    ensure(
      file &&
        !paths.has(row.path) &&
        !excludedPath(row.path) &&
        ["100644", "100755"].includes(file.mode) &&
        Number.isSafeInteger(row.startLine) &&
        row.startLine >= 1 &&
        row.endLine === row.startLine + row.content.split("\n").length - 1 &&
        row.content.length <= 4000 &&
        !containsSecret(row.content),
      "INVALID_EVIDENCE",
      "Inspected context does not belong to the selected immutable snapshot.",
    );
    paths.add(row.path);
  }
}
