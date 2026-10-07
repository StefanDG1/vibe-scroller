import { expect, it, vi } from "vitest";
import { createKnowledgeHandler } from "../packages/mcp/server";
const invoke = vi.fn(async () => ({
  ok: true,
  status: 200,
  value: { results: [] },
}));
async function packet(response: Response) {
  if (response.headers.get("content-type")?.includes("text/event-stream")) {
    const data = (await response.text())
      .split("\n")
      .find((line) => line.startsWith("data: "));
    if (!data) throw Error("Missing legacy MCP result");
    return JSON.parse(data.slice(6));
  }
  return response.json();
}
async function call(method: string, params: unknown, scopes: string[]) {
  const body = { jsonrpc: "2.0", id: 1, method, params };
  return createKnowledgeHandler(invoke).fetch(
    new Request("https://scroll.companynerve.com/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-11-25",
      },
      body: JSON.stringify(body),
    }),
    {
      parsedBody: body,
      authInfo: {
        token: "synthetic-test-token",
        clientId: "synthetic-test-client",
        scopes,
        resource: new URL("https://scroll.companynerve.com/mcp"),
        resourceMetadataUrl:
          "https://scroll.companynerve.com/.well-known/oauth-protected-resource/mcp",
      },
    },
  );
}
it("exposes bounded read and explicit intake schemas through actual stateless MCP dispatch", async () => {
  const response = await call("tools/list", {}, [
    "knowledge:read",
    "links:save",
  ]);
  expect(response.status).toBe(200);
  const result = await packet(response);
  expect(result.result.tools.map((t: { name: string }) => t.name)).toContain(
    "search",
  );
  const save = result.result.tools.find(
    (t: { name: string }) => t.name === "save_link",
  );
  expect(save.annotations.readOnlyHint).toBe(false);
  expect(save.inputSchema.required).toContain("explicitlyRequested");
  expect(save.inputSchema.additionalProperties).toBe(false);
});
it("challenges absent tool scopes before invoking the backend and rejects unknown tool input", async () => {
  invoke.mockClear();
  const response = await call(
    "tools/call",
    { name: "search", arguments: { query: "synthetic" } },
    [],
  );
  expect(response.status).toBe(403);
  expect(response.headers.get("www-authenticate")).toContain("knowledge:read");
  expect(invoke).not.toHaveBeenCalled();
  await call(
    "tools/call",
    { name: "search", arguments: { query: "synthetic", actor: "foreign" } },
    ["knowledge:read"],
  );
  expect(invoke).not.toHaveBeenCalled();
  const good = await call(
    "tools/call",
    { name: "search", arguments: { query: "synthetic" } },
    ["knowledge:read"],
  );
  expect((await packet(good)).result.structuredContent).toEqual({
    results: [],
  });
  expect(invoke).toHaveBeenCalledOnce();
});

it("requires the feedback scope and explicit request before dispatching a versioned judgment", async () => {
  invoke.mockClear();
  const input = {
    sourceId: "selected-source",
    generation: 1,
    revision: 123,
    grantVersion: 1,
    key: "feedback-key",
    expectedVersion: 0,
    explicitlyRequested: true,
    action: "later",
    note: "Review next week",
  };
  const denied = await call(
    "tools/call",
    { name: "record_feedback", arguments: input },
    ["knowledge:read"],
  );
  expect(denied.status).toBe(403);
  expect(denied.headers.get("www-authenticate")).toContain("feedback:write");
  expect(invoke).not.toHaveBeenCalled();
  await call(
    "tools/call",
    {
      name: "record_feedback",
      arguments: { ...input, explicitlyRequested: false },
    },
    ["feedback:write"],
  );
  expect(invoke).not.toHaveBeenCalled();
  const accepted = await call(
    "tools/call",
    { name: "record_feedback", arguments: input },
    ["feedback:write"],
  );
  expect(accepted.status).toBe(200);
  expect(invoke).toHaveBeenCalledWith("record_feedback", input);
});
it("blocks foreign browser origins and rebinding hosts without requiring Origin from server clients", async () => {
  const { assistantRequestAllowed, readAssistantBody } =
    await import("../packages/policy/assistant-http");
  const req = (headers: Record<string, string>) =>
    new Request("https://scroll.companynerve.com/mcp", { headers });
  expect(
    assistantRequestAllowed(req({ host: "scroll.companynerve.com" })),
  ).toBe(true);
  expect(
    assistantRequestAllowed(
      req({
        host: "scroll.companynerve.com",
        origin: "https://scroll.companynerve.com",
      }),
    ),
  ).toBe(true);
  for (const host of [
    "evil.example",
    "scroll.companynerve.com:443",
    "scroll.companynerve.com@evil.example",
    "",
  ]) {
    expect(assistantRequestAllowed(req({ host }))).toBe(false);
  }
  for (const origin of [
    "null",
    "http://scroll.companynerve.com",
    "https://scroll.companynerve.com:444",
    "https://evil.example",
    "",
  ]) {
    expect(
      assistantRequestAllowed(req({ host: "scroll.companynerve.com", origin })),
    ).toBe(false);
  }
  await expect(
    readAssistantBody(new Response("x".repeat(20)), 10),
  ).rejects.toThrow("too large");
  await expect(
    readAssistantBody(new Response(new Uint8Array([255])), 10),
  ).rejects.toThrow();
  await expect(
    readAssistantBody(
      new Response("{}", { headers: { "content-length": "-1" } }),
      10,
    ),
  ).rejects.toThrow();
});

it("serves modern MCP discovery/tools with per-request identity and rejects a missing envelope", async () => {
  const handler = createKnowledgeHandler(invoke);
  const authInfo = {
    token: "synthetic-test-token",
    clientId: "synthetic-test-client",
    scopes: ["knowledge:read"],
    resource: new URL("https://scroll.companynerve.com/mcp"),
  };
  const run = async (params: Record<string, unknown>) => {
    const body = { jsonrpc: "2.0", id: 7, method: "tools/list", params };
    return handler.fetch(
      new Request("https://scroll.companynerve.com/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          "mcp-protocol-version": "2026-07-28",
          "mcp-method": "tools/list",
        },
        body: JSON.stringify(body),
      }),
      { parsedBody: body, authInfo },
    );
  };
  const absent = await run({});
  expect(absent.status).toBe(400);
  const response = await run({
    _meta: {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientInfo": {
        name: "Synthetic acceptance client",
        version: "1.0",
      },
      "io.modelcontextprotocol/clientCapabilities": {},
    },
  });
  expect(response.status, await response.clone().text()).toBe(200);
  expect(
    (await packet(response)).result.tools.some(
      (tool: { name: string }) => tool.name === "fetch",
    ),
  ).toBe(true);
});
