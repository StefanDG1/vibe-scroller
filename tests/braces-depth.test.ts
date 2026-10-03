import { createRequire } from "node:module";
import { expect, it } from "vitest";

// Resolve the actual transitive package used by Repomix, not an unrelated test
// dependency. The registry version remains affected; this tests our local patch.
const fromRepomix = createRequire(import.meta.resolve("repomix"));
const fromGlobby = createRequire(fromRepomix.resolve("globby"));
const fromMicromatch = createRequire(fromGlobby.resolve("micromatch"));
const braces = fromMicromatch("braces") as {
  compile(input: unknown, options?: Record<string, unknown>): string;
  expand(input: unknown, options?: Record<string, unknown>): string[];
  stringify(input: unknown): string;
  parse(input: string): unknown;
};

it("rejects deeply nested input before all recursive walkers regardless of supplied options", () => {
  const pattern = "{".repeat(4000) + "a,b" + "}".repeat(4000);
  const ast = braces.parse(pattern);
  for (const input of [pattern, ast]) {
    expect(() => braces.compile(input, { maxDepth: Infinity })).toThrow(
      "Unsupported brace AST depth",
    );
    expect(() => braces.expand(input, { maxDepth: Infinity })).toThrow(
      "Unsupported brace AST depth",
    );
    expect(() => braces.stringify(input)).toThrow(
      "Unsupported brace AST depth",
    );
  }
});
it("preserves ordinary literal, range, nested, escape and empty alternatives", () => {
  expect(braces.compile("a/{b,c}/d")).toBe("a/(b|c)/d");
  expect(braces.expand("a/{b,c}/d")).toEqual(["a/b/d", "a/c/d"]);
  expect(braces.expand("{1..3}")).toEqual(["1", "2", "3"]);
  expect(braces.expand("{a,{b,c}}", { nodupes: true })).toEqual([
    "a",
    "b",
    "c",
  ]);
  expect(braces.stringify(braces.parse("literal\\{brace\\}"))).toBe(
    "literal{brace}",
  );
  expect(braces.expand("{,a}")).toEqual(["", "a"]);
});
it("rejects cyclic AST child edges without following normal parser parent links", () => {
  const cyclic: { nodes: unknown[] } = { nodes: [] };
  cyclic.nodes.push(cyclic);
  expect(() => braces.compile(cyclic)).toThrow("cyclic nodes");
  expect(() => braces.expand(cyclic)).toThrow("cyclic nodes");
  expect(() => braces.stringify(cyclic)).toThrow("cyclic nodes");
  expect(braces.stringify(braces.parse("{a,b}"))).toBe("{a,b}");
});
it("bounds the direct AST API that bypasses the parser's character limit", () => {
  let ast: { type: string; value?: string; nodes?: unknown[] } = {
    type: "text",
    value: "x",
  };
  for (let index = 0; index < 12000; index++)
    ast = { type: "root", nodes: [ast] };
  expect(() => braces.compile(ast)).toThrow("Unsupported brace AST depth");
  expect(() => braces.expand(ast)).toThrow("Unsupported brace AST depth");
  expect(() => braces.stringify(ast)).toThrow("Unsupported brace AST depth");
});
