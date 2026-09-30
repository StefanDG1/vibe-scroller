import { expect, it } from "vitest";
import {
  repositoryIgnores,
  preparedTree,
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
