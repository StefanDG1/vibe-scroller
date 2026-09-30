import { generateTreeString } from "repomix";
import ignore from "ignore";
import { excludedPath, ensure } from "../policy";
import type { RepositoryExcerpt } from "./context";

export const EXTRACTION_VERSION = "repomix-1.18.1/excerpts-v1";
export function repositoryIgnores(patterns: string[]) {
  ensure(
    patterns.every((p) => p.length <= 20000),
    "REPO_TOO_LARGE",
    "Repository ignore policy exceeds its bound.",
  );
  const rules = ignore().add(
    patterns.flatMap((pattern) => pattern.split(/\r?\n/)),
  );
  return (path: string) => excludedPath(path) || rules.ignores(path);
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
