import { expect, it } from "vitest";
import { buildTopicTree } from "../apps/starter/lib/topic-tree";
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
