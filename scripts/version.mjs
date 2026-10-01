import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export function buildVersion(
  ref = "HEAD",
  run = (args) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(),
) {
  const sha = run(["rev-parse", "--verify", `${ref}^{commit}`]);
  const date = run(["show", "-s", "--format=%cI", sha]);
  if (!/^[a-f0-9]{40}$/.test(sha) || !Number.isFinite(Date.parse(date)))
    throw new Error("Cannot version this commit");
  const stamp = new Date(date)
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const version = `0.1.0-alpha.${stamp}.g${sha.slice(0, 12)}`;
  return {
    version,
    tag: `v${version}`,
    commit: sha,
    committedAt: new Date(date).toISOString(),
    channel: "alpha",
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const value = buildVersion(process.argv[2] ?? "HEAD");
  process.stdout.write(
    process.argv[3] === "tag" ? value.tag + "\n" : JSON.stringify(value) + "\n",
  );
}
