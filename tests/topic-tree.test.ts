import { expect, it } from "vitest";
import {
  buildTopicTree,
  topicPath,
  boundTopicHierarchy,
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
  ).toHaveLength(40);
});

it("caps accumulated topic pages without dropping retained category ancestors or inventing missing ones", () => {
  const root = { id: "root", autoCategory: true };
  const product = { id: "product", autoCategory: true, parentId: "root" };
  const leaves = Array.from({ length: 60 }, (_, index) => ({
    id: `leaf-${index}`,
    parentId: "product",
  }));
  const bounded = boundTopicHierarchy([root, product, ...leaves]);
  expect(bounded).toHaveLength(40);
  expect(bounded.some((topic) => topic.id === "root")).toBe(true);
  expect(bounded.some((topic) => topic.id === "product")).toBe(true);
  expect(buildTopicTree(bounded)).toHaveLength(1);
  expect(bounded.some((topic) => topic.id === "leaf-59")).toBe(true);
  expect(
    boundTopicHierarchy([{ id: "orphan", parentId: "missing-private" }]),
  ).toEqual([{ id: "orphan", parentId: "missing-private" }]);
});
