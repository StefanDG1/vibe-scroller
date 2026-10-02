import { expect, it } from "vitest";
import { reviewedCloudPatch } from "../packages/repositories/reviewPatch";
import { verifyLocalPatch } from "../packages/runner/patch";
import { checkPatch } from "../packages/providers/cloud";
import type { JobSandbox } from "../packages/providers/sandbox";

it("trusted review patches reconstruct the exact added, changed and deleted contents", async () => {
  const base = [
    { path: "changed.txt", content: "before\n" },
    { path: "deleted.txt", content: "remove me" },
  ];
  const changes = [
    { path: "changed.txt", content: "after\n" },
    { path: "deleted.txt", content: null },
    { path: "docs/owned' canary.txt", content: "new\n" },
  ];
  const patch = reviewedCloudPatch(base, changes);
  const verified = await verifyLocalPatch(
    patch,
    changes.map((file) => file.path),
    false,
    async (path) => base.find((file) => file.path === path)?.content ?? null,
  );
  expect(verified.changes).toEqual(changes);
  for (const invalid of [
    [changes[0], changes[0]],
    [{ path: "absent.txt", content: null }],
    [{ path: "../escape", content: "no" }],
    [{ path: "changed.txt", content: "before\n" }],
  ])
    expect(() => reviewedCloudPatch(base, invalid)).toThrow();
});

it("checks cannot supply a forged guest diff or mutate a tested source into the publication artifact", async () => {
  const commands: string[] = [];
  const snapshots: unknown[] = [];
  let mutated = false;
  const sandbox = {
    files: { write: async () => {}, remove: async () => {} },
    verifySnapshot: async (files: unknown) => {
      snapshots.push(files);
      if (mutated) throw Error("POLICY_BLOCKED: source mutated");
    },
    commands: {
      run: async (command: string) => {
        commands.push(command);
        if (command === "mutate source") mutated = true;
        return { exitCode: 0, stdout: "forged guest diff", stderr: "" };
      },
    },
  } as unknown as JobSandbox;
  const base = [{ path: "README.md", content: "original\n", mode: "100644" }];
  const changes = [{ path: "README.md", content: "reviewed\n" }];
  const result = await checkPatch(sandbox, base, changes, ["approved check"]);
  expect(result.patch).toContain("+reviewed");
  expect(result.patch).not.toContain("forged guest diff");
  expect(commands.some((command) => command.includes("diff --"))).toBe(false);
  expect(snapshots).toHaveLength(3);
  await expect(
    checkPatch(sandbox, base, changes, ["mutate source"]),
  ).rejects.toThrow("POLICY_BLOCKED");
});
