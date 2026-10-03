import { expect, it } from "vitest";
import {
  repositoryCheckContext,
  validateGeneratedPackageChecks,
} from "../packages/plans/repository-checks";
import { retrievalFiles } from "../packages/repositories/retrieval";

const manifest = (path: string, value: unknown) => ({
  path,
  blobSha: "a".repeat(40),
  startLine: 1,
  endLine: 1,
  content: JSON.stringify(value),
});
const inspected = [
  manifest("package.json", {
    packageManager: "pnpm@12.3.4",
    scripts: { lint: "oxlint .", typecheck: "tsc --noEmit", empty: "" },
  }),
  manifest("apps/web/package.json", {
    scripts: { build: "next build", typecheck: "tsc --noEmit" },
  }),
];
it("reserves bounded planning context for actual root and containing package metadata despite source-name matches", () => {
  const row = { blobSha: "a".repeat(40), mode: "100644", size: 100 };
  const entries = [
    ...Array.from({ length: 40 }, (_, i) => ({
      ...row,
      path: `apps/web/source-provider-budget-${i}.ts`,
    })),
    { ...row, path: "package.json" },
    { ...row, path: "apps/web/package.json" },
    { ...row, path: "apps/other/package.json" },
  ];
  const cited = "apps/web/source-provider-budget-39.ts";
  const selected = retrievalFiles(
    entries,
    "source provider budget",
    [cited],
    true,
  );
  expect(selected).toHaveLength(24);
  expect(selected[0].path).toBe(cited);
  expect(selected.some((row) => row.path === "package.json")).toBe(true);
  expect(selected.some((row) => row.path === "apps/web/package.json")).toBe(
    true,
  );
  expect(selected.some((row) => row.path === "apps/other/package.json")).toBe(
    false,
  );
});
it("derives commands only from complete inspected package objects and preserves unknown metadata", () => {
  const context = repositoryCheckContext([
    ...inspected,
    {
      ...manifest("partial/package.json", {}),
      content: '{"scripts":{"test":',
      endLine: 4,
    },
    {
      ...manifest("window/package.json", { scripts: { test: "vitest" } }),
      startLine: 30,
    },
    manifest("array/package.json", []),
  ]);
  expect(context.packageManager).toBe("pnpm");
  expect(context.packages).toHaveLength(2);
  expect(context.packages[0].scripts).toEqual(["lint", "typecheck"]);
});
it("rejects the observed guessed manager and absent app lint command but accepts inspected scripts", () => {
  expect(() =>
    validateGeneratedPackageChecks(
      ["npm --prefix apps/web run lint"],
      inspected,
    ),
  ).toThrow("INVALID_EVIDENCE");
  expect(() =>
    validateGeneratedPackageChecks(["pnpm --dir apps/web run lint"], inspected),
  ).toThrow("INVALID_EVIDENCE");
  expect(() =>
    validateGeneratedPackageChecks(
      ["pnpm --dir apps/unknown run build"],
      inspected,
    ),
  ).toThrow("INVALID_EVIDENCE");
  expect(() =>
    validateGeneratedPackageChecks(
      ["pnpm lint", "pnpm typecheck", "pnpm --dir apps/web run build"],
      inspected,
    ),
  ).not.toThrow();
});
it("checks recognizable chained package commands without treating concrete commands as guessed scripts", () => {
  expect(() =>
    validateGeneratedPackageChecks(
      ["python tests/check.py && npm run lint"],
      inspected,
    ),
  ).toThrow();
  expect(() =>
    validateGeneratedPackageChecks(
      ["pnpm exec tsc --noEmit", "python tests/check.py"],
      inspected,
    ),
  ).not.toThrow();
  expect(() =>
    validateGeneratedPackageChecks(["python tests/check.py"], []),
  ).not.toThrow();
});
