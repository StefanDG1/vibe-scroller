import { expect, it } from "vitest";
import {
  branchConnectorPaths,
  syncConnectorPaths,
} from "../apps/starter/lib/tree-connectors";

it("anchors branch lines in their own frame, preserving geometry through page scroll and following horizontal row scroll", () => {
  const frame = { left: 20, top: 100, width: 390, height: 200 };
  const parent = { left: 100, top: 30, width: 200, height: 64 };
  const children = [
    { id: "left", box: { left: 20, top: 130, width: 200, height: 64 } },
    { id: "right", box: { left: 230, top: 130, width: 200, height: 64 } },
  ];
  const evidence = { left: 20, top: 220, width: 390, height: 80 };
  const paths = branchConnectorPaths(frame, parent, children, evidence);
  expect(paths).toEqual([
    { id: "left", d: "M 180 0 V 15 H 100 V 30" },
    { id: "right", d: "M 180 0 V 15 H 310 V 30" },
    { id: "evidence", d: "M 180 0 V 69 H 195 V 138" },
  ]);
  const translate = <T extends { top: number }>(box: T) => ({
    ...box,
    top: box.top - 80,
  });
  expect(
    branchConnectorPaths(
      translate(frame),
      translate(parent),
      children.map((child) => ({ ...child, box: translate(child.box) })),
      translate(evidence),
    ),
  ).toEqual(paths);
  expect(
    branchConnectorPaths(
      frame,
      parent,
      children.map((child) => ({
        ...child,
        box: { ...child.box, left: child.box.left - 60 },
      })),
    )[1],
  ).toEqual({ id: "right", d: "M 180 0 V 15 H 250 V 30" });
});

it("updates the SVG geometry atomically without remounting unchanged path nodes or writing identical attributes", () => {
  const attributes = new Map<string, string>();
  const nodes: ReturnType<typeof makePath>[] = [];
  let writes = 0;
  function makePath() {
    const attrs = new Map<string, string>();
    return {
      getAttribute: (key: string) => attrs.get(key) ?? null,
      setAttribute: (key: string, value: string) => {
        writes++;
        attrs.set(key, value);
      },
      remove() {
        nodes.splice(nodes.indexOf(this), 1);
      },
    };
  }
  const svg = {
    getAttribute: (key: string) => attributes.get(key) ?? null,
    setAttribute: (key: string, value: string) => {
      writes++;
      attributes.set(key, value);
    },
    querySelectorAll: () => nodes,
    ownerDocument: { createElementNS: makePath },
    append: (node: ReturnType<typeof makePath>) => nodes.push(node),
  } as unknown as SVGSVGElement;
  const frame = { left: 0, top: 0, width: 390, height: 200 };
  const paths = [{ id: "child", d: "M 100 0 V 15 H 200 V 30" }];
  syncConnectorPaths(svg, frame, paths);
  const node = nodes[0];
  writes = 0;
  syncConnectorPaths(svg, frame, paths);
  expect(writes).toBe(0);
  syncConnectorPaths(svg, { ...frame, height: 100 }, [
    {
      id: "child",
      d: "M 100 0 V 10 H 200 V 20",
    },
  ]);
  expect(nodes[0]).toBe(node);
  expect(attributes.get("viewBox")).toBe("0 0 390 100");
  expect(node.getAttribute("d")).toBe("M 100 0 V 10 H 200 V 20");
  syncConnectorPaths(svg, frame, []);
  expect(nodes).toHaveLength(0);
});
