import { expect, it } from "vitest";
import {
  clearLibraryPlaces,
  libraryPlaceKey,
  permittedLibraryPlace,
  restoredLibraryPlace,
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

it("bounds remembered location and drops closed branches absent from the authorized page", () => {
  const raw = JSON.stringify({
    representation: "tree",
    topicId: "allowed",
    closedTopicId: "revoked",
    insightId: "member",
    filing: "Personal",
    scrollTop: 40,
    rowScroll: [0, 150],
  });
  expect(permittedLibraryPlace(raw, [{ id: "allowed" }])).toEqual({
    representation: "tree",
    topicId: "allowed",
    insightId: "member",
    filing: "Personal",
    scrollTop: 40,
    rowScroll: [0, 150],
  });
  expect(
    permittedLibraryPlace(
      JSON.stringify({
        representation: "tree",
        scrollTop: -1,
        rowScroll: [20001],
      }),
      [],
    ),
  ).toEqual({ representation: "tree" });
});

it("starts a fresh scope with its available root and no identifiers or geometry from another scope", () => {
  const personalTopics = [
    { id: "personal", name: "Personal", autoCategory: true },
  ];
  expect(restoredLibraryPlace(null, personalTopics)).toEqual({
    representation: "tree",
    filing: "Personal",
  });
  expect(
    restoredLibraryPlace(
      JSON.stringify({
        representation: "folders",
        topicId: "removed",
        filing: "Business",
        insightId: "old",
        scrollTop: 999,
        rowScroll: [50],
      }),
      personalTopics,
    ),
  ).toEqual({ representation: "folders", filing: "Personal" });
  const raw = JSON.stringify({
    representation: "folders",
    topicId: "personal",
    closedTopicId: "personal",
    filing: "Personal",
    scrollTop: 40,
  });
  expect(restoredLibraryPlace(raw, personalTopics)).toMatchObject({
    topicId: "personal",
    closedTopicId: "personal",
    scrollTop: 40,
  });
});
