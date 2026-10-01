import { expect, it } from "vitest";
import { Buffer } from "node:buffer";
import { exactArrayBuffer } from "../packages/providers/binary";

it("uploads only a binary view, excluding surrounding pooled memory and later mutations", async () => {
  for (const backing of [
    Buffer.alloc(65536, 42),
    new Uint8Array(65536).fill(42),
  ]) {
    backing.set([255, 216, 255, 1, 2], 17);
    const view = backing.subarray(17, 22);
    const body = exactArrayBuffer(view);
    expect(body.byteLength).toBe(5);
    expect(Array.from(new Uint8Array(body))).toEqual([255, 216, 255, 1, 2]);
    view.fill(0);
    expect(
      Array.from(new Uint8Array(await new Blob([body]).arrayBuffer())),
    ).toEqual([255, 216, 255, 1, 2]);
  }
});
