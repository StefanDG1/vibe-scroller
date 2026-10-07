import { it, expect } from "vitest";
import {
  availableProcessingCredits,
  cloudExecutionEstimate,
} from "../packages/plans/execution-quote";
it("excludes expired, consumed and concurrently reserved allowance from the advisory ceiling", () => {
  expect(
    availableProcessingCredits(
      [
        { granted: 30, spent: 7, reserved: 10, expiresAt: 200 },
        { granted: 65, spent: 0, reserved: 0, expiresAt: 100 },
        { granted: 10, spent: 20, reserved: 0 },
        { granted: 20, spent: 3, reserved: 2, revoked: 15 },
      ],
      100,
    ),
  ).toBe(13);
});
it("shows the bounded runtime/compute split without granting execution", () => {
  expect(cloudExecutionEstimate(30, 10, 0.02)).toEqual({
    computeCredits: 10,
    inferenceCredits: 20,
    maximumSeconds: 500,
  });
  expect(cloudExecutionEstimate(100, 90, 0.02)?.maximumSeconds).toBe(1200);
  expect(cloudExecutionEstimate(1, 10, 0.02)).toBeNull();
  expect(cloudExecutionEstimate(2, 10, 1)).toBeNull();
  for (const x of [0, -1, 1.5, Infinity, NaN, 10001])
    expect(cloudExecutionEstimate(x, 10, 0.02)).toBeNull();
  expect(cloudExecutionEstimate(30, NaN, 0.02)).toBeNull();
  expect(cloudExecutionEstimate(30, 10, 0)).toBeNull();
});
