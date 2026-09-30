import { expect, it } from "vitest";
import {
  repositoryIgnores,
  preparedTree,
  inspectedIgnorePolicy,
} from "../packages/repositories/prepare";
it("applies project ignores without allowing negated rules to admit secrets or unsafe paths", () => {
  const ignored = repositoryIgnores(["private/**\n!.env\n!.ssh/id_rsa\n"]);
  expect(ignored("private/notes.md")).toBe(true);
  expect(ignored(".env")).toBe(true);
  expect(ignored(".ssh/id_rsa")).toBe(true);
  expect(ignored("../escape.md")).toBe(true);
  expect(ignored("src/main.ts")).toBe(false);
  expect(() => repositoryIgnores(["x".repeat(20001)])).toThrow();
});
it("scopes nested exclusions, permits valid child overrides and never resurrects an excluded directory", () => {
  const ignored = repositoryIgnores([
    "*.log\nprivate/\n",
    { directory: "src", content: "!keep.log\n/generated/\n*.private\n" },
    { directory: "private", content: "!README.md\n" },
    { directory: "src/generated", content: "!safe.ts\n" },
  ]);
  expect(ignored("src/keep.log")).toBe(false);
  expect(ignored("docs/keep.log")).toBe(true);
  expect(ignored("src/generated/safe.ts")).toBe(true);
  expect(ignored("docs/generated/safe.ts")).toBe(false);
  expect(ignored("private/README.md")).toBe(true);
  expect(ignored("src/config.private")).toBe(true);
  expect(ignored("docs/config.private")).toBe(false);
});
it("inspects bounded ignore blobs and fails closed on oversized policies", async () => {
  const files = [
    {
      path: "src/.gitignore",
      type: "blob",
      mode: "100644",
      size: 8,
      sha: "synthetic",
    },
  ];
  const ignored = await inspectedIgnorePolicy(files, async () => "private/");
  expect(ignored("src/private/key.ts")).toBe(true);
  expect(ignored("private/key.ts")).toBe(false);
  await expect(
    inspectedIgnorePolicy([{ ...files[0], size: 20001 }], async () => ""),
  ).rejects.toThrow("REPO_TOO_LARGE");
  await expect(
    inspectedIgnorePolicy(files, async () => "x".repeat(20001)),
  ).rejects.toThrow("REPO_TOO_LARGE");
});
it("uses Repomix to prepare only the inspected bounded context tree", () => {
  const tree = preparedTree([
    {
      path: "src/main.ts",
      startLine: 1,
      endLine: 1,
      blobSha: "a".repeat(40),
      content: "synthetic owned fixture",
    },
  ]);
  expect(tree).toBe("src/\n  main.ts");
  expect(tree).not.toContain("synthetic owned fixture");
  expect(() =>
    preparedTree([
      {
        path: ".env",
        startLine: 1,
        endLine: 1,
        blobSha: "a".repeat(40),
        content: "synthetic",
      },
    ]),
  ).toThrow("POLICY_BLOCKED");
});
