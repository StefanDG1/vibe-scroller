import { expect, it } from "vitest";
import { sharedEvidenceLabel } from "../apps/starter/lib/shared-evidence-label";

it("does not invent a timestamp for the null user-note reference returned by sharing", () => {
  expect(sharedEvidenceLabel({ kind: "user_note", startMs: null })).toBe(
    "user_note",
  );
  expect(sharedEvidenceLabel({ kind: "user_note" })).toBe("user_note");
});

it("keeps genuine zero and timed references, excluding invalid times", () => {
  expect(sharedEvidenceLabel({ kind: "transcript", startMs: 0 })).toBe(
    "transcript: 0.0s",
  );
  expect(sharedEvidenceLabel({ kind: "frame", startMs: 12500 })).toBe(
    "frame: 12.5s",
  );
  for (const startMs of [-1, NaN, Infinity])
    expect(sharedEvidenceLabel({ kind: "user_note", startMs })).toBe(
      "user_note",
    );
});
