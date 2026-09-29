import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve, relative, sep, join } from "node:path";
const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2).filter((a) => a !== "--");
const get = (flag) => args[args.indexOf(flag) + 1];
const name = get("--name"),
  out = get("--out");
if (
  !args.includes("--name") ||
  !args.includes("--out") ||
  !name ||
  !out ||
  !/^[a-z][a-z0-9-]{1,49}$/.test(name)
) {
  console.error(
    "Usage: pnpm template:export -- --name my-product --out ../my-product",
  );
  process.exit(1);
}
const dest = resolve(out),
  rel = relative(root, dest);
if (!rel.startsWith(".." + sep) || existsSync(dest)) {
  console.error(
    "Choose a new directory outside this repository. Existing paths are never overwritten.",
  );
  process.exit(1);
}
mkdirSync(dest, { recursive: true });
const omitted = new Set([
  "node_modules",
  ".next",
  ".vercel",
  ".git",
  "work",
  "outputs",
]);
function filter(path) {
  const name = path.split(/[\\/]/).at(-1);
  return (
    !omitted.has(name) &&
    (!name.startsWith(".env") || name.endsWith(".example")) &&
    !name.endsWith(".tsbuildinfo")
  );
}
for (const path of [
  "apps/marketing",
  "apps/starter",
  "convex",
  "packages",
  "docs",
  ".agents",
  "scripts",
  ".github",
  ".gitignore",
  ".gitattributes",
  ".editorconfig",
  ".env.example",
  ".nvmrc",
  ".prettierignore",
  "tsconfig.json",
  "vitest.config.ts",
  "tests",
  "skills-manifest.json",
  "LICENSE",
  "LICENSE.md",
  "THIRD_PARTY_NOTICES.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "SECURITY.md",
])
  if (existsSync(join(root, path)))
    cpSync(join(root, path), join(dest, path), { recursive: true, filter });
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
pkg.name = name;
writeFileSync(join(dest, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
cpSync(join(root, "pnpm-workspace.yaml"), join(dest, "pnpm-workspace.yaml"));
const lock = readFileSync(join(root, "pnpm-lock.yaml"), "utf8");
writeFileSync(join(dest, "pnpm-lock.yaml"), lock);
writeFileSync(join(dest, "convex.json"), "{}\n");
const config = join(dest, "packages/company-config/index.ts");
let content = readFileSync(config, "utf8");
content = content
  .replace(/slug:\s*["'][a-z][a-z0-9-]+["']/, `slug: "${name}"`)
  .replace('name: "CompanyNerve"', `name: "${name}"`)
  .replace('kind: "template"', 'kind: "product"')
  .replace(
    "Accounts, shared workspaces, and projects built with the open-source CompanyNerve template.",
    "A shared workspace for your team and its projects.",
  )
  .replaceAll("https://companynerve.com", "https://example.com")
  .replaceAll("https://app.companynerve.com", "https://app.example.com")
  .replaceAll("contact@exponentialeducation.ro", "owner@example.com")
  .replace(/    operator: \{[\s\S]*?\r?\n    \},\r?\n/, "");
writeFileSync(config, content);
writeFileSync(
  join(dest, "README.md"),
  `# ${name}\n\nCreated from CompanyNerve ${pkg.version}.\n\nUse Node 24 and the pinned pnpm version. Run \`pnpm install --frozen-lockfile\`, follow [local setup](docs/local-development.md), then run \`pnpm dev\` for the app or \`pnpm dev:marketing\` for the website.\n\nBoth applications share company configuration, design recipes, and UI. Auth, billing, and dashboard code are the same code used by CompanyNerve. No credentials or production data are included.\n\nAuthentication uses email one-time codes and Google OAuth only. Follow [authentication setup](docs/operations/authentication.md): enable Magic Auth and Google in your own WorkOS environment, disable passwords and other methods, and provision this product's own Google OAuth client/consent branding, callbacks, and session secret. Never inherit CompanyNerve or suite credentials. Exporting source does not configure or verify providers.\n\nEdit \`packages/company-config/index.ts\`, replace the example domains and support email, and choose your recipe. Review marketing copy and privacy disclosures for your product before publishing. Follow [launch operations](docs/operations/launch.md) for hosting, authentication, billing, and search setup.\n\nRun \`pnpm check\` before deployment.\n`,
);
writeFileSync(
  join(dest, "AGENTS.md"),
  "# Product instructions\n\nThis is a CompanyNerve-generated product. Read README.md, docs/local-development.md, and docs/operations/authentication.md. Authentication uses email one-time codes and Google OAuth only; disable passwords and other methods in WorkOS and do not promote password/reset flows. Provision this product's own WorkOS environment, Google OAuth client/consent branding, callbacks, and session secret. Never inherit CompanyNerve or suite credentials. Environment values do not prove provider setup. Keep backend organization authorization, billing checks, and negative tests when adding your product logic. Read relevant skills under .agents/skills. Never commit secrets. Record implemented, tested, deployed, and externally verified separately. Record your own product requirements here.\n",
);
writeFileSync(
  join(dest, "template-version.json"),
  JSON.stringify(
    {
      template: "companynerve",
      version: pkg.version,
      createdAt: new Date().toISOString(),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Exported ${name} to ${dest}. Run pnpm install --frozen-lockfile in that directory.`,
);
