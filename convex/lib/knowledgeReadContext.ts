import type { QueryCtx } from "../_generated/server";

/** Reuse document reads only within one immutable query snapshot. */
export function knowledgeReadContext(ctx: QueryCtx): QueryCtx {
  const reads = new Map<string, Promise<unknown>>();
  const db = new Proxy(ctx.db, {
    get(target, property) {
      if (property === "get")
        return (...args: unknown[]) => {
          const key = JSON.stringify(args);
          let read = reads.get(key);
          if (!read) {
            read = Reflect.apply(target.get, target, args);
            reads.set(key, read!);
          }
          return read;
        };
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return { ...ctx, db };
}
