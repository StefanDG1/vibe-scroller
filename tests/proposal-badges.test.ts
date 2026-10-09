import { expect, it } from "vitest";
import {
  appendProposalBadges,
  proposalBadgeTotals,
  openReferenceProposals,
  badgeReferenceKey,
} from "../packages/knowledge/proposal-badges";
import { insightProposalStatus } from "../packages/knowledge/proposal-status";
import { demoProposalBadges } from "../apps/starter/lib/library-demo";
const a = { sourceId: "a", insightId: "i", generation: 1, revision: 2 },
  b = { ...a, insightId: "other" };
it("deduplicates proposals across references and descendant branches, withholding pending or incomplete totals", () => {
  const first = {
    items: [
      {
        id: "one",
        state: "draft",
        references: [a, b, a],
        topicIds: ["leaf", "root", "root"],
      },
    ],
    next: "next",
    complete: true,
  };
  expect(proposalBadgeTotals(first)).toBeNull();
  const all = appendProposalBadges(first, {
    items: [
      ...first.items,
      {
        id: "two",
        state: "approved",
        references: [a],
        topicIds: ["other", "root"],
      },
    ],
    next: null,
    complete: true,
  });
  expect(proposalBadgeTotals(all)).toEqual({
    topics: { leaf: 1, root: 2, other: 1 },
    references: { [badgeReferenceKey(a)]: 2, [badgeReferenceKey(b)]: 1 },
  });
  expect(proposalBadgeTotals({ ...all, complete: false })).toBeNull();
  expect(openReferenceProposals(all, { ...a, revision: 1 })).toEqual([]);
  expect(openReferenceProposals(all, a)).toHaveLength(2);
});
it("excludes real closed-unmerged, closed issues, merged, rejected, deleted and unknown states", () => {
  for (const value of [
    { state: "published", run: { prState: "closed_unmerged" } },
    { state: "published", issueState: "closed" },
    { state: "published", run: { mergedAt: 1 } },
    { state: "rejected" },
    { state: "deleted" },
    { state: "legacy_unknown" },
  ])
    expect(insightProposalStatus(value).open).toBe(false);
  expect(insightProposalStatus({ state: "legacy_unknown" }).known).toBe(false);
});
it("keeps demo totals consistent when the same proposal appears under multiple topics and insights", () => {
  const page = demoProposalBadges(),
    totals = proposalBadgeTotals(page)!;
  expect(totals.topics).toMatchObject({
    "demo-topic": 3,
    "demo-guidance": 3,
    "demo-control": 2,
    "demo-evidence": 1,
  });
  expect(
    openReferenceProposals(page, page.items[0].references[0]),
  ).toHaveLength(3);
});
