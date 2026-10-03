import { expect, it } from "vitest";
import {
  reuseExcerpt,
  manifestDelta,
} from "../packages/repositories/snapshotCache";
import { EXTRACTION_VERSION } from "../packages/repositories/prepare";
import {
  repositoryIgnores,
  preparedTree,
  inspectedIgnorePolicy,
} from "../packages/repositories/prepare";
import {
  snapshotPaths,
  withinSnapshot,
  preparationFailure,
  snapshotScopeCurrent,
} from "../packages/repositories/scope";
it("bounds literal snapshot scope and refuses secrets, traversal, globs and sibling-prefix inclusion", () => {
  const paths = snapshotPaths(["src/", " README.md ", "src"]);
  expect(paths).toEqual(["README.md", "src"]);
  expect(withinSnapshot("src/main.ts", paths)).toBe(true);
  expect(withinSnapshot("src2/main.ts", paths)).toBe(false);
  expect(withinSnapshot("src/.env", paths)).toBe(false);
  expect(withinSnapshot("docs/readme.md", [])).toBe(true);
  expect(snapshotScopeCurrent({})).toBe(true);
  expect(
    snapshotScopeCurrent({
      snapshotPaths: ["src"],
      snapshotSummary: { selectedPaths: ["src/"] },
    }),
  ).toBe(true);
  expect(
    snapshotScopeCurrent({
      snapshotPaths: ["src", "docs"],
      snapshotSummary: { selectedPaths: ["src"] },
    }),
  ).toBe(false);
  for (const path of [
    "",
    "/src",
    "../src",
    "src/../other",
    "src\\other",
    "C:/src",
    ".env",
    "src/secrets",
    "src/*",
    "src//",
    "src\nother",
  ])
    expect(() => snapshotPaths([path])).toThrow("INVALID_INPUT");
  expect(() =>
    snapshotPaths(Array.from({ length: 21 }, (_, n) => `src${n}`)),
  ).toThrow();
  expect(() =>
    snapshotPaths(
      Array.from({ length: 20 }, (_, n) => `${n}${"a".repeat(210)}`),
    ),
  ).toThrow();
  expect(
    preparationFailure(new Error("REPO_TOO_LARGE: upstream private text")),
  ).toBe("REPO_TOO_LARGE");
  expect(
    preparationFailure(new Error("credential-shaped arbitrary provider error")),
  ).toBe("PREPARATION_FAILED");
});
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
it("reuses only recent unchanged inspected blobs and identifies eligible-manifest differences", () => {
  const entry = {
    path: "README.md",
    blobSha: "a".repeat(40),
    mode: "100644",
    size: 9,
  };
  const previous = {
    updatedAt: Date.now(),
    extractionVersion: EXTRACTION_VERSION,
    profileVersion: 1,
    manifestEntries: [entry],
    contextExcerpts: [
      {
        path: entry.path,
        startLine: 1,
        endLine: 1,
        blobSha: entry.blobSha,
        content: "synthetic",
      },
    ],
  };
  expect(reuseExcerpt(entry, previous, 8000)?.content).toBe("synthetic");
  expect(
    reuseExcerpt({ ...entry, blobSha: "b".repeat(40) }, previous, 8000),
  ).toBeNull();
  expect(
    reuseExcerpt(
      entry,
      { ...previous, updatedAt: Date.now() - 86400001 },
      8000,
    ),
  ).toBeNull();
  expect(
    reuseExcerpt(entry, { ...previous, extractionVersion: "old" }, 8000),
  ).toBeNull();
  expect(
    reuseExcerpt(
      { ...entry, size: 5000 },
      { ...previous, manifestEntries: [{ ...entry, size: 5000 }] },
      8000,
    ),
  ).toBeNull();
  const next = [
    { ...entry, blobSha: "b".repeat(40) },
    { ...entry, path: "new.md" },
  ];
  expect(
    manifestDelta(next, [entry, { ...entry, path: "removed.md" }]),
  ).toEqual({
    addedToManifest: ["new.md"],
    changedBlobs: ["README.md"],
    removedFromManifest: ["removed.md"],
  });
});
