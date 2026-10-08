import { expect, it } from "vitest";
import {
  summarizeDashboard,
  buildDashboardTrace,
} from "../apps/starter/lib/dashboard-visuals";
it("counts distinct current records and canonical merged PRs without equating acceptance or completion to benefit", () => {
  const result = summarizeDashboard({
    sources: [
      { _id: "a", state: "ready" },
      { _id: "a", state: "ready" },
      { _id: "b", state: "deleted" },
      { _id: "c", state: "needs_upload" },
    ],
    proposals: [
      { _id: "p", review: "accepted" },
      { _id: "q", review: "unreviewed" },
    ],
    repositories: [{ _id: "r", enabled: false }],
    runs: [
      {
        _id: "1",
        prState: "merged",
        prUrl: "https://github.com/demo/repo/pull/1",
      },
      {
        _id: "2",
        mergedAt: 1,
        prUrl: "https://github.com/demo/repo/pull/1?test=1",
      },
      {
        _id: "3",
        state: "completed",
        prState: "open",
        prUrl: "https://github.com/demo/repo/pull/2",
      },
      { _id: "4", prState: "merged" },
      { _id: "5", prState: "merged", prUrl: "https://example.test/pull/1" },
    ],
  });
  expect(result).toMatchObject({
    sources: 2,
    ready: 1,
    accepted: 1,
    merged: 1,
    projects: 0,
  });
  expect(result.states.find((s) => s.id === "attention")?.count).toBe(1);
  expect(result.reviews.find((r) => r.id === "unreviewed")?.count).toBe(1);
});
it("draws only available recorded source/proposal/run links and keeps unlinked work out", () => {
  expect(
    buildDashboardTrace({
      sources: [{ _id: "s" }, { _id: "deleted", state: "deleted" }],
      proposals: [
        { _id: "p", sourceId: "s" },
        { _id: "other", sourceId: "offpage" },
        { _id: "removed", sourceId: "deleted" },
      ],
      runs: [
        { _id: "r", proposalId: "p" },
        { _id: "not-linked", proposalId: "other" },
      ],
    }),
  ).toEqual([
    {
      source: { _id: "s" },
      proposal: { _id: "p", sourceId: "s" },
      runs: [{ _id: "r", proposalId: "p" }],
    },
  ]);
});
