import { z } from "zod";
import { safePath, sensitivePath } from "../policy";
export const routineCategories = ["interface", "documentation"] as const;
export const policyInput = z
  .strictObject({
    mode: z.enum(["review", "routine"]),
    monthlyCredits: z.number().int().min(1).max(10000),
    perRunCredits: z.number().int().min(2).max(10000),
    categories: z.array(z.enum(routineCategories)).min(1).max(2),
    requiredChecks: z.array(z.string().trim().min(1).max(120)).min(1).max(12),
    merge: z.boolean(),
  })
  .superRefine((p, c) => {
    if (p.perRunCredits + 10 > p.monthlyCredits)
      c.addIssue({
        code: "custom",
        message:
          "Include the coding maximum and a 10-credit review in the monthly ceiling.",
      });
    if (
      new Set(p.categories).size !== p.categories.length ||
      new Set(p.requiredChecks).size !== p.requiredChecks.length
    )
      c.addIssue({
        code: "custom",
        message: "Use distinct categories and check names.",
      });
  });
export function routinePathClass(path: string) {
  if (
    !safePath(path) ||
    sensitivePath(path) ||
    /(?:^|[/._-])(?:auth|authentication|billing|payment|payments|privacy|legal|security|retention|permissions|authorization|credentials|terms|decisions|prd|api-contracts|data-model|state-machines)(?:[/._-]|$)/i.test(
      path,
    ) ||
    /(?:^|\/)(?:tests?|scripts|__tests__|fixtures|adr|foundational|operations)(?:\/|$)|(?:^|\/)(?:AGENTS|SKILL|DESIGN|PRODUCT)\.md$/i.test(
      path,
    )
  )
    return null;
  if (/^docs\/[^/]+\.md$/.test(path)) return "documentation";
  if (
    /^(?:(?:apps|src)\/[^/]+\/)?(?:app|components|styles)\/.+\.(?:tsx|jsx|css)$/.test(
      path,
    ) &&
    !/(?:^|\/)(?:api|auth|billing|admin|account|settings)(?:\/|$)/i.test(path)
  )
    return "interface";
  return null;
}
export function routinePlanAllowed(
  plan: { files: { path: string }[]; tests: string[] },
  category: string,
  categories: string[],
) {
  return (
    categories.includes(category) &&
    plan.files.length > 0 &&
    plan.files.length <= 12 &&
    plan.tests.length > 0 &&
    plan.tests.length <= 10 &&
    plan.files.every((f) => routinePathClass(f.path) === category)
  );
}
