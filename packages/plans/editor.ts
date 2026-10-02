import { z } from "zod";
import { planInput } from "../contracts";

// Empty fields are valid while editing. Saving uses the full execution contract.
const editablePlan = planInput.extend({
  scope: z.string().max(4000),
  files: z
    .array(z.strictObject({ path: z.string().max(300), isNew: z.boolean() }))
    .min(1)
    .max(100),
  steps: z.array(z.string().max(1000)).min(1).max(30),
  tests: z.array(z.string().max(1000)).min(1).max(20),
});
export type EditablePlan = z.infer<typeof editablePlan>;

export function readEditablePlan(text: string): EditablePlan | null {
  try {
    const result = editablePlan.safeParse(JSON.parse(text));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function reviewedPlan(text: string) {
  const value = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("The plan must be an object.");
  const cleaned = { ...value };
  for (const key of ["scope", "rollout", "rollback"])
    if (typeof cleaned[key] === "string") cleaned[key] = cleaned[key].trim();
  for (const key of ["nonGoals", "steps", "tests", "risks", "unknowns"])
    if (Array.isArray(cleaned[key]))
      cleaned[key] = cleaned[key]
        .map((entry: unknown) =>
          typeof entry === "string" ? entry.trim() : entry,
        )
        .filter((entry: unknown) => entry !== "");
  if (Array.isArray(cleaned.files))
    cleaned.files = cleaned.files.map((file: unknown) => {
      if (!file || typeof file !== "object" || Array.isArray(file)) return file;
      const entry = file as Record<string, unknown>;
      return {
        ...entry,
        path: typeof entry.path === "string" ? entry.path.trim() : entry.path,
      };
    });
  // Preserve unknown properties so the strict contract rejects them, rather than
  // silently converting a malformed or imported plan into an approved one.
  return planInput.parse(cleaned);
}
