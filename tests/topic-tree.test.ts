import { expect, it } from "vitest";
import {
  buildTopicTree,
  topicPath,
  boundTopicHierarchy,
  singleChildTarget,
} from "../apps/starter/lib/topic-tree";
it("breadcrumbs contain only returned parents and terminate legacy cycles", () => {
  expect(
    topicPath([{ id: "child", parentId: "private" }], "child").map(
      (topic) => topic.id,
    ),
  ).toEqual(["child"]);
  expect(
    topicPath(
      [
        { id: "a", parentId: "b" },
        { id: "b", parentId: "a" },
      ],
      "a",
    ),
  ).toHaveLength(2);
  expect(
    topicPath([{ id: "a" }, { id: "b", parentId: "a" }], "b").map(
      (topic) => topic.id,
    ),
  ).toEqual(["a", "b"]);
});
it("keeps a deterministic bounded hierarchy, exposes no missing parents and survives legacy cycles", () => {
  expect(
    buildTopicTree([
      { id: "parent" },
      { id: "child", parentId: "parent" },
      { id: "orphan", parentId: "unreturned-private-parent" },
    ]),
  ).toEqual([
    {
      id: "parent",
      parentId: undefined,
      children: [{ id: "child", parentId: "parent", children: [] }],
    },
    { id: "orphan", parentId: "unreturned-private-parent", children: [] },
  ]);
  expect(
    buildTopicTree([
      { id: "a", parentId: "b" },
      { id: "b", parentId: "a" },
    ]),
  ).toHaveLength(2);
  expect(
    buildTopicTree(Array.from({ length: 90 }, (_, n) => ({ id: String(n) }))),
  ).toHaveLength(90);
});

it("retains loaded topic pages and ancestors without inventing missing ones", () => {
  const root = { id: "root", autoCategory: true };
  const product = { id: "product", autoCategory: true, parentId: "root" };
  const leaves = Array.from({ length: 60 }, (_, index) => ({
    id: `leaf-${index}`,
    parentId: "product",
  }));
  const bounded = boundTopicHierarchy([root, product, ...leaves]);
  expect(bounded).toHaveLength(62);
  expect(bounded.some((topic) => topic.id === "root")).toBe(true);
  expect(bounded.some((topic) => topic.id === "product")).toBe(true);
  expect(buildTopicTree(bounded)).toHaveLength(1);
  expect(bounded.some((topic) => topic.id === "leaf-59")).toBe(true);
  expect(
    boundTopicHierarchy([{ id: "orphan", parentId: "missing-private" }]),
  ).toEqual([{ id: "orphan", parentId: "missing-private" }]);
});

it("opens an only-child chain from any node and stops at a choice", () => {
  const topics = [
    { id: "root" },
    { id: "category", parentId: "root", autoCategory: true, ideas: 8 },
    { id: "choice", parentId: "category" },
    { id: "left", parentId: "choice" },
    { id: "right", parentId: "choice" },
    { id: "leaf", parentId: "left", ideas: 3 },
  ];
  expect(singleChildTarget(topics, "root")?.id).toBe("choice");
  expect(singleChildTarget(topics, "category")?.id).toBe("choice");
  expect(singleChildTarget(topics, "left")?.id).toBe("leaf");
  expect(singleChildTarget(topics, "leaf")?.id).toBe("leaf");
  expect(singleChildTarget(topics, "missing")).toBeUndefined();
});
it("preserves a topic's direct evidence as a choice beside its child", () => {
  expect(
    singleChildTarget(
      [
        { id: "parent", ideas: 2 },
        { id: "child", parentId: "parent" },
      ],
      "parent",
    )?.id,
  ).toBe("parent");
});
it("only follows the bounded returned hierarchy and terminates cycles", () => {
  expect(
    singleChildTarget([{ id: "orphan", parentId: "private" }], "orphan")?.id,
  ).toBe("orphan");
  const cycle = [
    { id: "a", parentId: "b" },
    { id: "b", parentId: "a" },
  ];
  expect(singleChildTarget(cycle, "a")?.id).toBe("a");
  const long = Array.from({ length: 20 }, (_, n) => ({
    id: String(n),
    ...(n ? { parentId: String(n - 1) } : {}),
  }));
  const endpoint = singleChildTarget(long, "0")!;
  const path = topicPath(long, endpoint.id);
  expect(path).toHaveLength(12);
  expect(path[0].id).toBe("0");
});

it("keeps sibling positions when another page updates an ancestor or adds a branch", () => {
  const first = [
    { id: "root", name: "Root" },
    { id: "a", parentId: "root" },
    { id: "b", parentId: "root" },
  ];
  const merged = boundTopicHierarchy([
    ...first,
    { id: "root", name: "Updated root" },
    { id: "c", parentId: "root" },
  ]);
  expect(merged.map((n) => n.id)).toEqual(["root", "a", "b", "c"]);
  expect(merged[0].name).toBe("Updated root");
  expect(buildTopicTree(merged)[0].children.map((n) => n.id)).toEqual([
    "a",
    "b",
    "c",
  ]);
});
