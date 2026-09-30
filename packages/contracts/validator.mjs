import { z } from "zod";
export function validator(s) {
  if (s.const !== undefined) return z.literal(s.const);
  if (s.enum) return z.enum(s.enum);
  if (Array.isArray(s.type))
    return z.union(s.type.map((type) => validator({ ...s, type })));
  if (s.type === "null") return z.null();
  if (s.type === "object") {
    const shape = {};
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
