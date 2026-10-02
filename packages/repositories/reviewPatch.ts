import { createTwoFilesPatch } from "diff";
import { ensure, containsSecret, safePath } from "../policy";

export function reviewedCloudPatch(
  base: { path: string; content: string }[],
  changes: { path: string; content: string | null }[],
) {
  ensure(
    changes.length > 0 && changes.length <= 20,
    "POLICY_BLOCKED",
    "A bounded changed-file set is required.",
  );
  const originals = new Map(base.map((file) => [file.path, file.content]));
  const seen = new Set<string>();
  let patch = "";
  for (const file of changes) {
    ensure(
      safePath(file.path) && !seen.has(file.path),
      "POLICY_BLOCKED",
      "Changed paths must be unique and safe.",
    );
    seen.add(file.path);
    const before = originals.get(file.path);
    ensure(
      file.content !== null || before !== undefined,
      "BASE_CHANGED",
      "Cannot delete a file absent from the approved base.",
    );
    ensure(
      file.content !== before && !(before === undefined && file.content === ""),
      "POLICY_BLOCKED",
      "An actual textual change is required.",
    );
    ensure(
      file.content === null ||
        (typeof file.content === "string" &&
          Buffer.byteLength(file.content) <= 100000 &&
          !containsSecret(file.content)),
      "POLICY_BLOCKED",
      "Changed content exceeds its safety bound.",
    );
    const diff = createTwoFilesPatch(
      before === undefined ? "/dev/null" : `a/${file.path}`,
      file.content === null ? "/dev/null" : `b/${file.path}`,
      before ?? "",
      file.content ?? "",
      "",
      "",
      { context: 3, timeout: 1000, maxEditLength: 20000 },
    );
    ensure(
      diff,
      "POLICY_BLOCKED",
      "Trusted review diff exceeded its compute bound.",
    );
    patch += diff;
    ensure(
      Buffer.byteLength(patch) <= 300000 && !containsSecret(patch),
      "POLICY_BLOCKED",
      "Trusted review diff exceeds its safety bound.",
    );
  }
  return patch;
}
