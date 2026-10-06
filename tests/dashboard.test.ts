import { describe, it, expect } from "vitest";
import { dashboardActions } from "../packages/knowledge/dashboard";
const base = { sources: [], proposals: [], repositories: [], runs: [] };
describe("current authorized dashboard priorities", () => {
  it("prioritizes recoverable failure and exact review before a ready result", () => {
    const result = dashboardActions({
      ...base,
      sources: [
        { _id: "ready", state: "ready" },
        { _id: "failed", state: "failed" },
      ],
      proposals: [{ _id: "review", review: "unreviewed" }],
    });
    expect(result.slice(0, 3).map((a) => a.destination)).toEqual([
      "source",
      "proposal",
      "source",
    ]);
    expect(result[0].target?._id).toBe("failed");
    expect(result[1].target?._id).toBe("review");
  });
  it("does not reopen completed decisions or deselected projects", () => {
    const result = dashboardActions({
      ...base,
      proposals: [{ _id: "done", review: "accepted" }],
      repositories: [{ _id: "off", enabled: false, confirmed: false }],
      runs: [{ _id: "done", state: "completed" }],
    });
    expect(result.map((a) => a.key)).toEqual(["capture"]);
  });
  it("bounds candidates and distinguishes waiting from completed analysis", () => {
    expect(
      dashboardActions({
        ...base,
        sources: [
          ...Array.from({ length: 30 }, () => ({ state: "saved" })),
          { _id: "offpage", state: "ready" },
        ],
      }).map((a) => a.key),
    ).toEqual(["capture"]);
    expect(
      dashboardActions({
        ...base,
        sources: [{ _id: "queued", state: "queued" }],
      })[0],
    ).toMatchObject({
      title: "Saved. Waiting to analyze.",
      character: "waiting",
    });
  });
});
