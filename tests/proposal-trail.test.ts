import { expect, it } from "vitest";
import { proposalTrail } from "../apps/starter/lib/proposal-trail";
it("acceptance never implies coding, a PR or benefit", () => {
  const stages = proposalTrail({ sourceId: "source", review: "accepted" }, []);
  expect(stages.map((stage) => stage.state)).toEqual([
    "recorded",
    "recorded",
    "pending",
    "pending",
    "pending",
  ]);
  expect(stages[3].detail).toBe("No linked run loaded");
  expect(stages[0].label).toBe("Saved post");
  expect(proposalTrail({ planHash: "hash" }, [])[2].label).toBe("Saved plan");
});
it("a recorded merge remains separate from outcome evidence", () => {
  const stages = proposalTrail({ planHash: "hash" }, [
    {
      state: "completed",
      prUrl: "https://github.com/example/repo/pull/1",
      mergedAt: 123,
    },
  ]);
  expect(stages[4].detail).toContain("benefit needs separate evidence");
  expect(stages[0].state).toBe("pending");
});
