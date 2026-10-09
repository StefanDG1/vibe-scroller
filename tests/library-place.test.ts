import { expect, it } from "vitest";
import {
  clearLibraryPlaces,
  libraryPlaceKey,
  permittedLibraryPlace,
} from "../apps/starter/lib/library-place";
it("separates workspaces and scopes without a colliding separator", () => {
  expect(libraryPlaceKey("one", "personal")).not.toBe(
    libraryPlaceKey("two", "personal"),
  );
  expect(libraryPlaceKey("one", "personal")).not.toBe(
    libraryPlaceKey("one", "business"),
  );
  expect(libraryPlaceKey("one:business", "personal")).not.toBe(
    libraryPlaceKey("one", "business:personal"),
  );
});
it("restores only a topic present in the newly authorized page", () => {
  expect(
    permittedLibraryPlace('{"representation":"tree","topicId":"revoked"}', [
      { id: "allowed" },
    ]),
  ).toEqual({ representation: "tree" });
  expect(
    permittedLibraryPlace('{"representation":"folders","topicId":"allowed"}', [
      { id: "allowed" },
    ])?.topicId,
  ).toBe("allowed");
  expect(permittedLibraryPlace("broken", [])).toBeNull();
  expect(permittedLibraryPlace('{"representation":"canvas"}', [])).toBeNull();
});

it("clears only library navigation, preserving all other configuration", () => {
  const values = new Map([
    [libraryPlaceKey("one", "personal"), "saved"],
    [libraryPlaceKey("two", "personal"), "saved"],
    ["private-configuration", "untouched"],
  ]);
  const storage = {
    get length() {
      return values.size;
    },
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  clearLibraryPlaces(storage, "one");
  expect(values.has(libraryPlaceKey("one", "personal"))).toBe(false);
  expect(values.has(libraryPlaceKey("two", "personal"))).toBe(true);
  clearLibraryPlaces(storage);
  expect([...values.keys()]).toEqual(["private-configuration"]);
});
