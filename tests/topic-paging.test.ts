import { expect, it } from "vitest";
import { TopicPagingGate } from "../apps/starter/lib/topic-paging";
it("does not drain automatically when an empty batch changes the cursor", () => {
  const gate = new TopicPagingGate();
  expect(gate.take("first", false)).toBe(true);
  expect(gate.take("second", false)).toBe(false);
  gate.arm();
  expect(gate.take("second", false)).toBe(true);
  expect(gate.take("third", false)).toBe(false);
});
it("does not duplicate a pending cursor or lose intent during loading", () => {
  const gate = new TopicPagingGate();
  expect(gate.take(undefined, false)).toBe(false);
  expect(gate.take("first", true)).toBe(false);
  expect(gate.take("first", false)).toBe(true);
  gate.arm();
  expect(gate.take("first", false)).toBe(false);
  expect(gate.take("second", false)).toBe(true);
});
