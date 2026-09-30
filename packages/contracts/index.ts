import { z } from "zod";
import insight from "../../contracts/insight.schema.json";
import proposal from "../../contracts/proposal.schema.json";
import runner from "../../contracts/runner-job.schema.json";
// Convert the handoff's deliberately small JSON-schema vocabulary, preserving strict objects.
function validator(s: any): z.ZodType {
  if (s.const !== undefined) return z.literal(s.const);
  if (s.enum) return z.enum(s.enum);
  if (Array.isArray(s.type))
    return z.union(s.type.map((type: string) => validator({ ...s, type })));
  if (s.type === "null") return z.null();
  if (s.type === "object") {
    const shape: Record<string, z.ZodType> = {};
    for (const [key, value] of Object.entries(s.properties ?? {})) {
      const v = validator(value);
      shape[key] = s.required?.includes(key) ? v : v.optional();
    }
    return z.strictObject(shape);
  }
  if (s.type === "array") {
    let a = z.array(validator(s.items));
    if (s.minItems) a = a.min(s.minItems);
    if (s.maxItems) a = a.max(s.maxItems);
    return a;
  }
  if (s.type === "integer" || s.type === "number") {
    let n = z.number();
    if (s.type === "integer") n = n.int();
    if (s.minimum !== undefined) n = n.min(s.minimum);
    if (s.maximum !== undefined) n = n.max(s.maximum);
    return n;
  }
  let t = z.string();
  if (s.minLength) t = t.min(s.minLength);
  if (s.maxLength) t = t.max(s.maxLength);
  if (s.pattern) t = t.regex(new RegExp(s.pattern));
  return t;
}
export const insightOutput = validator(insight);
export const proposalOutput = validator(proposal);
export const runnerJob = validator(runner);
export const captureInput = z.strictObject({
  organizationId: z.string(),
  key: z.string().min(8).max(100),
  kind: z.enum(["url", "text", "upload"]),
  url: z.string().max(2048).optional(),
  title: z.string().min(1).max(160),
  text: z.string().max(60000).optional(),
  objectKey: z.string().max(400).optional(),
  rightsAttested: z.literal(true),
});
export const planInput = z.strictObject({
  scope: z.string().min(1).max(4000),
  nonGoals: z.array(z.string().max(500)).max(20),
  files: z
    .array(z.strictObject({ path: z.string().max(300), isNew: z.boolean() }))
    .min(1)
    .max(100),
  steps: z.array(z.string().max(1000)).min(1).max(30),
  tests: z.array(z.string().max(1000)).min(1).max(20),
  risks: z.array(z.string().max(1000)).max(20),
  rollout: z.string().max(2000),
  rollback: z.string().max(2000),
  unknowns: z.array(z.string().max(500)).max(20),
});
