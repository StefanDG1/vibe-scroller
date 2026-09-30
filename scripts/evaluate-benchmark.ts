import { readFileSync, writeFileSync } from "node:fs";
import { evaluateBenchmark } from "../packages/evaluation/index.ts";
try {
  if (process.argv.length !== 4) throw Error();
  const report = evaluateBenchmark(
    JSON.parse(readFileSync(process.argv[2], "utf8")),
  );
  writeFileSync(process.argv[3], JSON.stringify(report, null, 2) + "\n", {
    flag: "wx",
  });
  console.log(
    JSON.stringify({
      completeDataset: report.completeDataset,
      suggestedQualityTargetMet: report.suggestedQualityTargetMet,
      heldOutCount: report.heldOutCount,
    }),
  );
  if (!report.completeDataset || !report.suggestedQualityTargetMet)
    process.exitCode = 2;
} catch {
  console.error(
    "Benchmark input or output invalid; private data and raw parser errors suppressed.",
  );
  process.exitCode = 1;
}
