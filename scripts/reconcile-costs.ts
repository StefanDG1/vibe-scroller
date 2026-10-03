import { readFileSync, writeFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { reconcileCosts } from "../packages/evaluation/cost-reconciliation.ts";
try {
  if (
    process.argv.length !== 4 ||
    !resolve(process.argv[2]).startsWith(resolve("private") + sep) ||
    !resolve(process.argv[3]).startsWith(resolve("outputs") + sep)
  )
    throw Error();
  const report = reconcileCosts(
    JSON.parse(readFileSync(process.argv[2], "utf8")),
  );
  writeFileSync(process.argv[3], JSON.stringify(report, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  console.log(
    JSON.stringify({
      workloads: report.workloadCount,
      pending: report.pending,
      admissionReady: report.admissionReady,
    }),
  );
  if (!report.admissionReady) process.exitCode = 2;
} catch {
  console.error(
    "Cost input/output invalid; private billing data suppressed. Use private input and a fresh outputs report.",
  );
  process.exitCode = 1;
}
