import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { publicPolicyDocuments } from "../packages/policy/public-documents.ts";
const root = resolve(import.meta.dirname, ".."),
  target = join(root, "apps/starter/content/legal");
await mkdir(target, { recursive: true });
for (const name of Object.values(publicPolicyDocuments)) {
  const bytes = await readFile(join(root, "legal", `${name}.md`));
  await writeFile(join(target, `${name}.md`), bytes);
}
console.log(
  "Bundled public policy drafts synchronized with canonical sources.",
);
