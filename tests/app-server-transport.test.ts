import { expect, it } from "vitest";
import { AppServer } from "../packages/runner/app-server.mjs";

it("closes the client when a protocol response exceeds the size bound", async () => {
  const server = new AppServer(process.execPath, [
    "-e",
    `process.stdin.once('data',b=>{const m=JSON.parse(b);console.log(JSON.stringify({id:m.id,result:{text:'x'.repeat(16000001)}}))})`,
  ]);
  try {
    await expect(server.request("synthetic")).rejects.toThrow("exited");
  } finally {
    server.close();
  }
});

it("delivers a bounded image-sized protocol response instead of silently losing it", async () => {
  const server = new AppServer(process.execPath, [
    "-e",
    `process.stdin.once('data',b=>{const m=JSON.parse(b);console.log(JSON.stringify({id:m.id,result:{text:'x'.repeat(1100000)}}))})`,
  ]);
  try {
    const result = await server.request<{ text: string }>("synthetic");
    expect(result.text.length).toBe(1100000);
  } finally {
    server.close();
  }
});

it("notifies active turns and rejects requests immediately when the client exits", async () => {
  const server = new AppServer(process.execPath, [
    "-e",
    `process.stdin.once('data',()=>process.exit(1))`,
  ]);
  const closed = new Promise<void>((resolve) =>
    server.onEvent((m: { method: string }) => {
      if (m.method === "connection/closed") resolve();
    }),
  );
  try {
    await expect(server.request("synthetic")).rejects.toThrow("exited");
    await closed;
    await expect(server.request("synthetic")).rejects.toThrow("exited");
  } finally {
    server.close();
  }
});
