import { ensure, excludedPath } from "../policy";

/** Literal repository-relative files/folders. Empty means the existing eligible tree. */
export function snapshotPaths(paths: string[] = []) {
  ensure(
    paths.length <= 20 &&
      paths.every((p) => p.length <= 300) &&
      paths.join("\n").length <= 4000,
    "INVALID_INPUT",
    "Choose at most twenty repository-relative files or folders within 4,000 characters.",
  );
  const normalized = paths.map((p) => p.trim().replace(/\/$/, ""));
  ensure(
    normalized.every((p) => !excludedPath(p) && !/[?*[\]{}]/.test(p)),
    "INVALID_INPUT",
    "Use literal safe repository-relative paths, without wildcards or traversal.",
  );
  return [...new Set(normalized)].sort();
}

export function withinSnapshot(path: string, paths: string[]) {
  return (
    !excludedPath(path) &&
    (!paths.length || paths.some((p) => path === p || path.startsWith(`${p}/`)))
  );
}

export function snapshotScopeCurrent(repo: {
  snapshotPaths?: string[];
  snapshotSummary?: { selectedPaths?: string[] };
}) {
  return (
    JSON.stringify(snapshotPaths(repo.snapshotPaths)) ===
    JSON.stringify(snapshotPaths(repo.snapshotSummary?.selectedPaths))
  );
}

// Only allow known codes out of the preparation worker. Never expose provider text.
export function preparationFailure(error: unknown) {
  const allowed = [
    "REPO_TOO_LARGE",
    "CONTEXT_REQUIRED",
    "FORBIDDEN",
    "REAUTH_REQUIRED",
    "APPROVAL_STALE",
    "BUDGET_EXCEEDED",
    "INSUFFICIENT_CREDITS",
    "OPERATOR_BUDGET_REACHED",
    "SETUP_REQUIRED",
    "POLICY_BLOCKED",
    "GITHUB_UNAVAILABLE",
  ];
  const candidate = error as {
    code?: string;
    message?: string;
    data?: unknown;
  } | null;
  return (
    allowed.find(
      (code) =>
        candidate?.code === code ||
        (typeof candidate?.data === "string" &&
          candidate.data.startsWith(`${code}:`)) ||
        candidate?.message?.startsWith(`${code}:`),
    ) ?? "PREPARATION_FAILED"
  );
}
