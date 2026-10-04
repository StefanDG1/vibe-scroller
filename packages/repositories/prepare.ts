import { generateTreeString } from "repomix";
import ignore from "ignore";
import { excludedPath, ensure } from "../policy";
import type { RepositoryExcerpt } from "./context";

export const EXTRACTION_VERSION = "repomix-1.18.1/excerpts-v5-authority";
export type IgnorePolicy = { directory: string; content: string };
export function repositoryIgnores(patterns: (string | IgnorePolicy)[]) {
  ensure(
    patterns.length <= 100 &&
      patterns.every(
        (p) => (typeof p === "string" ? p : p.content).length <= 20000,
      ) &&
      patterns.reduce(
        (sum, p) => sum + (typeof p === "string" ? p : p.content).length,
        0,
      ) <= 100000,
    "REPO_TOO_LARGE",
    "Repository ignore policy exceeds its bound.",
  );
  const policies = new Map<string, ReturnType<typeof ignore>>();
  for (const pattern of patterns) {
    const directory = typeof pattern === "string" ? "" : pattern.directory;
    ensure(
      directory === "" ||
        (!excludedPath(directory) &&
          !directory.includes("\\") &&
          !directory.startsWith("/")),
      "POLICY_BLOCKED",
      "Invalid ignore-policy directory.",
    );
    const rules = policies.get(directory) ?? ignore();
    rules.add(
      (typeof pattern === "string" ? pattern : pattern.content).split(/\r?\n/),
    );
    policies.set(directory, rules);
  }
  const ordered = [...policies].sort(
    ([a], [b]) =>
      a.split("/").length - b.split("/").length || a.localeCompare(b),
  );
  const ignored = (path: string) => {
    let result = false;
    for (const [directory, rules] of ordered) {
      if (directory && !path.startsWith(`${directory}/`)) continue;
      const relative = directory ? path.slice(directory.length + 1) : path;
      if (!relative) continue;
      const test = rules.test(relative);
      if (test.ignored) result = true;
      else if (test.unignored) result = false;
    }
    return result;
  };
  return (path: string) => {
    if (excludedPath(path)) return true;
    const pieces = path.split("/");
    // Git cannot reinclude a child of an excluded directory.
    for (let index = 1; index < pieces.length; index++)
      if (ignored(pieces.slice(0, index).join("/") + "/")) return true;
    return ignored(path);
  };
}
export async function inspectedIgnorePolicy(
  tree: {
    path: string;
    type: string;
    mode: string;
    size?: number;
    sha: string;
  }[],
  readBlob: (sha: string) => Promise<string>,
) {
  const entries = tree.filter(
    (entry) =>
      entry.type === "blob" &&
      ["100644", "100755"].includes(entry.mode) &&
      /(^|\/)(\.gitignore|\.repomixignore)$/.test(entry.path) &&
      !excludedPath(entry.path),
  );
  ensure(
    entries.length <= 100 &&
      entries.every(
        (entry) => Number.isSafeInteger(entry.size) && entry.size! <= 20000,
      ) &&
      entries.reduce((sum, entry) => sum + entry.size!, 0) <= 100000,
    "REPO_TOO_LARGE",
    "Ignore policy exceeds its inspection quote.",
  );
  const policies: IgnorePolicy[] = [];
  for (const entry of entries.sort((a, b) => a.path.localeCompare(b.path))) {
    const content = await readBlob(entry.sha);
    ensure(
      new TextEncoder().encode(content).length <= 20000,
      "REPO_TOO_LARGE",
      "Ignore blob exceeds its inspection limit.",
    );
    const split = entry.path.lastIndexOf("/");
    policies.push({
      directory: split < 0 ? "" : entry.path.slice(0, split),
      content,
    });
  }
  return repositoryIgnores(policies);
}
export function preparedTree(excerpts: RepositoryExcerpt[]) {
  ensure(
    excerpts.length <= 40 && excerpts.every((e) => !excludedPath(e.path)),
    "POLICY_BLOCKED",
    "Context paths exceed the inspected snapshot policy.",
  );
  const tree = generateTreeString(excerpts.map((e) => e.path));
  ensure(
    tree.length <= 16000,
    "REPO_TOO_LARGE",
    "Inspected tree exceeds its bound.",
  );
  return tree;
}
