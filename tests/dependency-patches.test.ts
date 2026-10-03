import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { reviewedDependencyPatches } from "../scripts/dependency-patches.mjs";

it("checks exact reviewed public patch identities before clean-image computation", () => {
  const content = Buffer.from("owned synthetic patch\n");
  const patch = {
    package: "braces@3.0.3",
    path: "patches/braces@3.0.3.patch",
    sha256: createHash("sha256").update(content).digest("hex"),
  };
  expect(reviewedDependencyPatches([patch], () => content)[0].content).toEqual(
    content,
  );
  expect(() =>
    reviewedDependencyPatches([patch], () => Buffer.from("changed")),
  ).toThrow("bytes changed");
  expect(() =>
    reviewedDependencyPatches(
      [{ ...patch, path: "patches/../private/key.patch" }],
      () => content,
    ),
  ).toThrow("identity");
  expect(() =>
    reviewedDependencyPatches([patch, patch], () => content),
  ).toThrow("identity");
  expect(() =>
    reviewedDependencyPatches(
      [{ ...patch, package: "braces@latest" }],
      () => content,
    ),
  ).toThrow("identity");
  expect(reviewedDependencyPatches(undefined, () => content)).toEqual([]);
});
