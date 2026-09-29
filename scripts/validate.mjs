import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname, relative, join } from "node:path";
import { createHash } from "node:crypto";
const root = resolve(import.meta.dirname, "..");
const errors = [];
const manifest = JSON.parse(
  readFileSync(join(root, "skills-manifest.json"), "utf8"),
);
for (const skill of manifest.skills) {
  for (const [file, hash] of Object.entries(skill.files)) {
    const path = join(root, ".agents/skills", skill.name, file);
    if (
      !existsSync(path) ||
      createHash("sha256").update(readFileSync(path)).digest("hex") !== hash
    )
      errors.push(
        `Skill changed without a manifest update: ${skill.name}/${file}`,
      );
  }
}
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}
const docs = [
  ...walk(join(root, "docs")).filter((p) => p.endsWith(".md")),
  ...readdirSync(root)
    .filter((p) => p.endsWith(".md"))
    .map((p) => join(root, p)),
];
for (const file of docs) {
  const text = readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, "");
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const href = match[1].split("#")[0];
    if (!href || /^(?:[a-z]+:|\/)/i.test(href)) continue;
    const path = resolve(dirname(file), decodeURIComponent(href));
    if (!existsSync(path))
      errors.push(`Broken link in ${relative(root, file)}: ${href}`);
  }
}
for (const required of [
  "LICENSE",
  "convex/schema.ts",
  "apps/starter/package.json",
  "packages/company-config/index.ts",
])
  if (!existsSync(join(root, required))) errors.push(`Missing ${required}`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `Validated ${docs.length} documents and ${manifest.skills.length} skill snapshots.`,
);
