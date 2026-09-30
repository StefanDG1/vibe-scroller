import { applyPatch, createTwoFilesPatch, parsePatch } from "diff";
import { ensure, validatePaths, containsSecret } from "../policy";
export async function verifyLocalPatch(
  patch: string,
  allowedPaths: string[],
  highRisk: boolean,
  readBase: (path: string) => Promise<string | null>,
) {
  ensure(
    Buffer.byteLength(patch) <= 900000 && !containsSecret(patch),
    "POLICY_BLOCKED",
    "Patch is oversized or contains credential material.",
  );
  const parsed = parsePatch(patch);
  ensure(
    parsed.length > 0 && parsed.length <= 100,
    "POLICY_BLOCKED",
    "A bounded textual patch is required.",
  );
  const changes: { path: string; content: string | null }[] = [];
  let canonical = "",
    total = 0;
  const pathOf = (value: string | undefined) => value?.replace(/^[ab]\//, "");
  for (const file of parsed) {
    ensure(
      !file.isRename &&
        !file.isCopy &&
        file.hunks.length > 0 &&
        file.hunks.length <= 200,
      "POLICY_BLOCKED",
      "Renames, copies, binary and mode-only patches require another reviewed plan.",
    );
    const oldPath = pathOf(file.oldFileName),
      nextPath = pathOf(file.newFileName);
    const added = oldPath === "/dev/null",
      deleted = nextPath === "/dev/null";
    const path = deleted ? oldPath : nextPath;
    ensure(
      path && (added || deleted || oldPath === nextPath),
      "POLICY_BLOCKED",
      "Patch headers disagree.",
    );
    validatePaths([path], allowedPaths, highRisk);
    ensure(
      !changes.some((c) => c.path === path),
      "POLICY_BLOCKED",
      "Duplicate patch file.",
    );
    const base = await readBase(path);
    ensure(
      added ? base === null : base !== null,
      "BASE_CHANGED",
      "Patch file existence differs from its approved base.",
    );
    const next = applyPatch(base ?? "", file, { fuzzFactor: 0 });
    ensure(
      next !== false && (!deleted || next === ""),
      "BASE_CHANGED",
      "Patch does not apply to the exact approved base.",
    );
    ensure(
      next.length <= 200000 && !containsSecret(next),
      "POLICY_BLOCKED",
      "Result contains a credential or oversized file.",
    );
    total += next.length;
    ensure(
      total <= 900000,
      "POLICY_BLOCKED",
      "Result exceeds its total content bound.",
    );
    changes.push({ path, content: deleted ? null : next });
    const canonicalFile = createTwoFilesPatch(
      added ? "/dev/null" : `a/${path}`,
      deleted ? "/dev/null" : `b/${path}`,
      base ?? "",
      next,
      "",
      "",
      { context: 3, timeout: 1000, maxEditLength: 20000 },
    );
    ensure(
      canonicalFile !== undefined,
      "POLICY_BLOCKED",
      "Patch generation exceeded its compute bound.",
    );
    canonical += canonicalFile;
    ensure(
      canonical.length <= 900000,
      "POLICY_BLOCKED",
      "Canonical patch exceeds its byte bound.",
    );
  }
  return { changes, patch: canonical };
}
