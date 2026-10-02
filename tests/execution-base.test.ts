import { afterEach, expect, it, vi } from "vitest";
import { verifyExecutionBase } from "../packages/repositories/executionBase";
afterEach(() => vi.unstubAllGlobals());
it("refuses a changed default branch or immutable head before metered execution", async () => {
  const calls: string[] = [];
  let head = "a".repeat(40);
  vi.stubGlobal("fetch", async (url: string) => {
    calls.push(url);
    return Response.json({ object: { sha: head } });
  });
  const repo = { fullName: "owned/synthetic", branch: "review/main" };
  await verifyExecutionBase(
    repo,
    { default_branch: "review/main" },
    head,
    "synthetic-token",
  );
  expect(calls[0]).toContain("heads/review%2Fmain");
  calls.length = 0;
  await expect(
    verifyExecutionBase(
      repo,
      { default_branch: "different" },
      head,
      "synthetic-token",
    ),
  ).rejects.toThrow("BASE_CHANGED");
  expect(calls).toHaveLength(0);
  head = "b".repeat(40);
  await expect(
    verifyExecutionBase(
      repo,
      { default_branch: "review/main" },
      "a".repeat(40),
      "synthetic-token",
    ),
  ).rejects.toThrow("BASE_CHANGED");
  await expect(
    verifyExecutionBase(
      { ...repo, fullName: "../other" },
      { default_branch: "review/main" },
      head,
      "synthetic-token",
    ),
  ).rejects.toThrow("INVALID_INPUT");
});
