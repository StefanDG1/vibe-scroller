import { expect, it } from "vitest";
import { buildVersion } from "../scripts/version.mjs";

it("binds an immutable prerelease to the exact commit and UTC commit time", () => {
  const sha = "abcdef012345" + "a".repeat(28);
  const run = (args: string[]) =>
    args[0] === "rev-parse" ? sha : "2026-10-01T04:30:00+02:00";
  const value = buildVersion("HEAD", run);
  expect(value).toMatchObject({
    commit: sha,
    version: "0.1.0-alpha.20261001023000.gabcdef012345",
    tag: "v0.1.0-alpha.20261001023000.gabcdef012345",
  });
  expect(buildVersion("HEAD", run)).toEqual(value);
  expect(
    buildVersion("HEAD", (args) =>
      args[0] === "rev-parse" ? "b".repeat(40) : run(args),
    ).tag,
  ).not.toBe(value.tag);
});

it("refuses missing or malformed commit evidence", () => {
  expect(() => buildVersion("HEAD", () => "missing")).toThrow();
  expect(() =>
    buildVersion("HEAD", (args) =>
      args[0] === "rev-parse" ? "a".repeat(40) : "not a date",
    ),
  ).toThrow();
});
