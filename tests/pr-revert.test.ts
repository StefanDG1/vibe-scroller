import { afterEach, expect, it, vi } from "vitest";
import { exactRevert } from "../packages/repositories/revert";
import { observePR } from "../packages/providers/pr-observation";
const remote = vi.hoisted(() => vi.fn());
vi.mock("../packages/providers/github", () => ({ github: remote }));
afterEach(() => remote.mockReset());
const entry = (path: string, char: string, mode = "100644") => ({
  path,
  sha: char.repeat(40),
  type: "blob",
  mode,
});
const tree = (...entries: ReturnType<typeof entry>[]) => ({
  tree: entries,
  truncated: false,
});
const files = [{ filename: "src/one.ts" }, { filename: "docs/new.md" }];
const before = tree(entry("src/one.ts", "a"));
const after = tree(entry("src/one.ts", "b"), entry("docs/new.md", "c"));
it("verifies an exact content and mode reversal including deletion while ignoring unrelated unchanged files", () => {
  expect(
    exactRevert(
      files,
      files,
      before,
      after,
      tree(...after.tree, entry("other.ts", "e")),
      tree(...before.tree, entry("other.ts", "e")),
    ),
  ).toBe(true);
});
it("refuses a claimed reversal with partial changes, unrelated changed files, changed executable mode or incomplete trees", () => {
  expect(
    exactRevert(
      files,
      files,
      before,
      after,
      after,
      tree(entry("src/one.ts", "a"), entry("docs/new.md", "c")),
    ),
  ).toBe(false);
  expect(
    exactRevert(
      files,
      [...files, { filename: "other.ts" }],
      before,
      after,
      after,
      before,
    ),
  ).toBe(false);
  expect(
    exactRevert(
      files,
      files,
      before,
      after,
      after,
      tree(entry("src/one.ts", "a", "100755")),
    ),
  ).toBe(false);
  expect(
    exactRevert(files, files, before, after, after, {
      ...before,
      truncated: true,
    }),
  ).toBe(false);
  expect(
    exactRevert(
      files,
      files,
      before,
      after,
      tree(entry("src/one.ts", "d"), entry("docs/new.md", "c")),
      before,
    ),
  ).toBe(false);
});
it("verifies both paths of an inverse rename and refuses symlinks", () => {
  const a = [{ filename: "new.ts", previous_filename: "old.ts" }];
  const b = [{ filename: "old.ts", previous_filename: "new.ts" }];
  const old = tree(entry("old.ts", "a")),
    next = tree(entry("new.ts", "a"));
  expect(exactRevert(a, b, old, next, next, old)).toBe(true);
  expect(
    exactRevert(a, b, old, next, next, tree(entry("old.ts", "a", "120000"))),
  ).toBe(false);
});
const merge = "a".repeat(40),
  undo = "b".repeat(40),
  originalParent = "c".repeat(40),
  undoParent = "d".repeat(40);
const run = {
  repo: { fullName: "owned/synthetic", branch: "main" },
  prNumber: 1,
};
function configure(incomplete = false) {
  remote.mockImplementation(async (path: string) => {
    if (path.endsWith("/pulls/1"))
      return {
        state: "closed",
        merged_at: "2026-10-02T00:00:00Z",
        merge_commit_sha: merge,
      };
    if (path.includes("/commits?"))
      return [
        {
          sha: undo,
          commit: {
            message: `Revert a reviewed change\n\nThis reverts commit ${merge}.`,
          },
        },
      ];
    if (path.includes(`/commits/${merge}`))
      return { sha: merge, parents: [{ sha: originalParent }], files };
    if (path.includes(`/commits/${undo}`))
      return { sha: undo, parents: [{ sha: undoParent }], files };
    if (path.includes(`/git/trees/${originalParent}`)) return before;
    if (path.includes(`/git/trees/${merge}`)) return after;
    if (path.includes(`/git/trees/${undoParent}`)) return after;
    if (path.includes(`/git/trees/${undo}`))
      return incomplete ? { ...before, truncated: true } : before;
    throw Error("Unexpected provider request");
  });
}
it("records authoritative reversal evidence separately from the historical merge and avoids re-reading unchanged heads", async () => {
  configure();
  const observed = await observePR(run, "synthetic-token", 200);
  expect(observed.state).toBe("merged");
  expect(observed.reverted).toEqual({
    mergeCommitSha: merge,
    revertCommitSha: undo,
    url: `https://github.com/owned/synthetic/commit/${undo}`,
    observedAt: 200,
  });
  remote.mockClear();
  expect(
    (await observePR({ ...run, revertProbeHead: undo }, "synthetic-token", 300))
      .reverted,
  ).toBeUndefined();
  expect(remote).toHaveBeenCalledTimes(2);
  remote.mockClear();
  expect(
    (
      await observePR(
        { ...run, reverted: observed.reverted },
        "synthetic-token",
        400,
      )
    ).reverted,
  ).toEqual(observed.reverted);
  expect(remote).toHaveBeenCalledTimes(1);
});
it("does not treat a message or transient inspection failure as proof, or erase a verified merge", async () => {
  configure(true);
  expect(
    (await observePR(run, "synthetic-token", 200)).reverted,
  ).toBeUndefined();
  remote.mockImplementation(async (path: string) => {
    if (path.endsWith("/pulls/1"))
      return {
        state: "closed",
        merged_at: "2026-10-02T00:00:00Z",
        merge_commit_sha: merge,
      };
    throw Error("Provider unavailable");
  });
  expect(await observePR(run, "synthetic-token", 200)).toMatchObject({
    state: "merged",
    revertStatus: "unverified",
  });
});
