import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { triageDependencyAudit } from "./audit-policy.mjs";

const result = spawnSync(
  process.platform === "win32" ? "cmd.exe" : "pnpm",
  process.platform === "win32"
    ? ["/d", "/s", "/c", "pnpm audit --prod --json"]
    : ["audit", "--prod", "--json"],
  {
    encoding: "utf8",
    timeout: 60000,
  },
);
if (result.error || ![0, 1].includes(result.status))
  throw Error("Registry audit unavailable; no passing result was recorded");
const audit = JSON.parse(result.stdout);
const record = triageDependencyAudit(
  audit,
  JSON.parse(readFileSync("infra/security-mitigations.json", "utf8")),
  readFileSync,
);
const report = {
  observedAt: new Date().toISOString(),
  ...record,
  limitation:
    "Local mitigation does not remove registry advisories or establish an upstream fixed release. Review patch tests and the dated security record.",
};
if (process.argv[2]) {
  if (existsSync(process.argv[2]))
    throw Error("Preserve the existing audit report");
  writeFileSync(
    process.argv[2],
    JSON.stringify({ report, rawAudit: audit }, null, 2) + "\n",
    { flag: "wx" },
  );
}
console.log(JSON.stringify(report));
process.exitCode = record.passed ? 0 : 1;
