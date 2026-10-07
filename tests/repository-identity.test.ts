import { expect, it } from "vitest";
import { isVibeScrollRepository } from "../scripts/repository-identity.mjs";

it("preserves release and backup authority across the rename of the same repository", () => {
  for (const name of ["StefanDG1/vibe-scroller", "StefanDG1/vibescroll"]) {
    expect(isVibeScrollRepository(name, "1396686369")).toBe(true);
    expect(isVibeScrollRepository(name, 1396686369)).toBe(true);
    expect(isVibeScrollRepository(name, "another-repository")).toBe(false);
    expect(isVibeScrollRepository(name, undefined)).toBe(false);
  }
  expect(isVibeScrollRepository("another-owner/vibescroll", "1396686369")).toBe(
    false,
  );
  expect(isVibeScrollRepository("StefanDG1/replacement", "1396686369")).toBe(
    false,
  );
});
