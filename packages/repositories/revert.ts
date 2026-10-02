type Entry = { path: string; type: string; sha: string; mode: string };
type Tree = { truncated?: boolean; tree: Entry[] };
type Changed = { filename: string; previous_filename?: string };
const sha = /^[a-f0-9]{40}$/;

// Commit messages supply candidates, never proof. Both sides of the changed
// paths must have exactly opposite immutable blob identities and modes.
export function exactRevert(
  originalFiles: Changed[],
  candidateFiles: Changed[],
  originalBefore: Tree,
  originalAfter: Tree,
  candidateBefore: Tree,
  candidateAfter: Tree,
) {
  const trees = [
    originalBefore,
    originalAfter,
    candidateBefore,
    candidateAfter,
  ];
  if (
    trees.some(
      (tree) =>
        tree.truncated || !Array.isArray(tree.tree) || tree.tree.length > 20000,
    )
  )
    return false;
  const paths = (files: Changed[]) => {
    if (!Array.isArray(files) || !files.length || files.length > 20)
      return null;
    const list = files.flatMap((file) => [
      file.filename,
      ...(file.previous_filename ? [file.previous_filename] : []),
    ]);
    if (
      list.some(
        (path) =>
          typeof path !== "string" ||
          path.length > 300 ||
          /^(?:\/|[A-Za-z]:)/.test(path) ||
          path
            .split("/")
            .some((part) => !part || part === ".." || part === "."),
      )
    )
      return null;
    return [...new Set(list)].sort();
  };
  const original = paths(originalFiles),
    candidate = paths(candidateFiles);
  if (
    !original ||
    !candidate ||
    JSON.stringify(original) !== JSON.stringify(candidate)
  )
    return false;
  const entries = trees.map(
    (tree) =>
      new Map(
        tree.tree
          .filter((entry) => original.includes(entry.path))
          .map((entry) => [entry.path, entry]),
      ),
  );
  const identity = (entry?: Entry) =>
    !entry
      ? null
      : entry.type === "blob" &&
          sha.test(entry.sha) &&
          ["100644", "100755"].includes(entry.mode)
        ? `${entry.sha}:${entry.mode}`
        : undefined;
  return original.every((path) => {
    const [before, after, undoBefore, undoAfter] = entries.map((map) =>
      identity(map.get(path)),
    );
    return (
      before !== undefined &&
      after !== undefined &&
      undoBefore !== undefined &&
      undoAfter !== undefined &&
      before !== after &&
      before === undoAfter &&
      after === undoBefore
    );
  });
}
