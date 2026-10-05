import { afterEach, expect, it, vi } from "vitest";
import {
  policyInput,
  routinePathClass,
  routinePlanAllowed,
} from "../packages/improvements/policy";
import {
  outcomeInput,
  improvementStage,
} from "../packages/improvements/outcomes";
import { retrievalFiles } from "../packages/repositories/retrieval";
afterEach(() => vi.useRealTimers());
it("limits routine plans to one selected category and refuses protected paths", () => {
  const plan = {
    files: [{ path: "apps/starter/components/example.tsx" }],
    tests: ["pnpm verify"],
  };
  expect(routinePlanAllowed(plan, "interface", ["interface"])).toBe(true);
  for (const path of [
    "convex/jobs.ts",
    "apps/starter/app/api/product/route.ts",
    "apps/starter/components/billing/form.tsx",
    "docs/adr/001-example.md",
    "docs/foundational/Offer.md",
    "package.json",
    ".github/workflows/verify.yml",
    "../outside.tsx",
    "AGENTS.md",
  ]) {
    expect(routinePathClass(path)).toBeNull();
    expect(
      routinePlanAllowed({ ...plan, files: [{ path }] }, "interface", [
        "interface",
      ]),
    ).toBe(false);
  }
  expect(
    routinePlanAllowed({ ...plan, tests: [] }, "interface", ["interface"]),
  ).toBe(false);
  expect(routinePlanAllowed(plan, "interface", ["documentation"])).toBe(false);
  expect(() =>
    policyInput.parse({
      mode: "routine",
      monthlyCredits: 20,
      perRunCredits: 20,
      categories: ["interface"],
      requiredChecks: ["verify"],
      merge: true,
    }),
  ).toThrow();
});
it("requires actual completed comparison periods and distinguishes merged from measured", () => {
  vi.useFakeTimers();
  vi.setSystemTime(10000);
  const value = {
    verdict: "positive",
    method: "reported_data",
    note: "Synthetic operator report",
    measurement: {
      label: "Synthetic completed tasks",
      unit: "tasks",
      before: 2,
      after: 3,
      baselineStart: 100,
      baselineEnd: 200,
      observationStart: 300,
      observationEnd: 400,
      baselineSamples: 10,
      observationSamples: 10,
      limitations: "Uncontrolled observation",
    },
  };
  expect(outcomeInput.parse(value).measurement?.after).toBe(3);
  for (const measurement of [
    { ...value.measurement, observationEnd: 20000 },
    { ...value.measurement, observationStart: 150 },
    { ...value.measurement, baselineSamples: 0 },
    { ...value.measurement, before: Infinity },
  ])
    expect(() => outcomeInput.parse({ ...value, measurement })).toThrow();
  expect(() => outcomeInput.parse({ ...value, method: "judgment" })).toThrow();
  expect(
    improvementStage({
      current: false,
      deleted: false,
      plan: true,
      run: { state: "completed", mergedAt: "2026-10-04T00:00:00Z" },
    }),
  ).toBe("awaiting_outcome");
  expect(
    improvementStage({
      current: true,
      deleted: false,
      plan: true,
      run: {
        state: "completed",
        mergedAt: "2026-10-04T00:00:00Z",
        reverted: true,
      },
      outcome: { verdict: "positive" },
    }),
  ).toBe("reverted");
});
it("prioritizes the public parent journey over many studio components within the same inspection bound", () => {
  const base = { blobSha: "a".repeat(40), mode: "100644", size: 1000 };
  const entries = [
    ...Array.from({ length: 40 }, (_, i) => ({
      ...base,
      path: `src/content-studio/mobile-parent-cta-${i}.tsx`,
    })),
    { ...base, path: "apps/web/app/(public)/parents/page.tsx" },
    { ...base, path: "README.md" },
  ];
  const paths = retrievalFiles(
    entries,
    "mobile parent CTA conversion on the public landing page",
  );
  expect(paths).toHaveLength(24);
  expect(paths[0].path).toBe("apps/web/app/(public)/parents/page.tsx");
});
