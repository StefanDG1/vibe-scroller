import { afterEach, expect, it, vi } from "vitest";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import type { JSONWebKeySet } from "jose";
let jwks: JSONWebKeySet;
vi.mock("jose", async (original) => {
  const actual = await original<typeof import("jose")>();
  return {
    ...actual,
    createRemoteJWKSet: () => actual.createLocalJWKSet(jwks),
  };
});
import { POST } from "../apps/starter/app/mcp/route";
const issuer = "https://synthetic-route.authkit.app";
const clientId = "client_01234567890123456789012345";
const subject = "user_01234567890123456789012345";
const resource = "https://scroll.companynerve.com/mcp";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("verifies actual RSA tokens, rejects foreign/expired identities and keeps the bearer out of backend arguments", async () => {
  vi.stubEnv("MCP_ENABLED", "true");
  vi.stubEnv("MCP_AUTH_ISSUER", issuer);
  vi.stubEnv(
    "MCP_CLIENTS",
    JSON.stringify([
      { id: clientId, name: "Synthetic client", scopes: ["knowledge:read"] },
    ]),
  );
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic-test.convex.cloud");
  const keys = await generateKeyPair("RS256");
  jwks = {
    keys: [
      {
        ...(await exportJWK(keys.publicKey)),
        kid: "synthetic-rsa-key",
        alg: "RS256",
      },
    ],
  };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: issuer,
    aud: resource,
    sub: subject,
    client_id: clientId,
    scope: "knowledge:read",
    sid: "app_consent_01234567890123456789012345",
    iat: now,
    exp: now + 300,
  };
  const sign = (changes: Record<string, unknown> = {}) =>
    new SignJWT({ ...claims, ...changes })
      .setProtectedHeader({ alg: "RS256", kid: "synthetic-rsa-key" })
      .sign(keys.privateKey);
  const token = await sign();
  const backend = vi.fn(async (url: string, init: RequestInit) => {
    expect(url).toBe("https://synthetic-test.convex.site/assistant-tools");
    expect(new Headers(init.headers).get("authorization")).toBe(
      `Bearer ${token}`,
    );
    expect(JSON.parse(init.body as string)).toEqual({
      operation: "search",
      args: { query: "synthetic" },
    });
    expect(init.redirect).toBe("error");
    return Response.json({ results: [] });
  });
  vi.stubGlobal("fetch", backend);
  const request = (
    bearer: string,
    overrides: Record<string, string> = {},
    body?: string,
  ) =>
    new Request(resource, {
      method: "POST",
      headers: {
        host: "scroll.companynerve.com",
        authorization: `Bearer ${bearer}`,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-11-25",
        ...overrides,
      },
      body:
        body ??
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "search", arguments: { query: "synthetic" } },
        }),
    });
  for (const change of [
    { iss: "https://foreign.authkit.app" },
    { aud: "https://evil.example/mcp" },
    { aud: [resource, "https://evil.example"] },
    { sub: "org_01234567890123456789012345" },
    { client_id: "client_foreign0123456789012345" },
    { sid: "not-a-consent" },
    { exp: now - 1 },
    { iat: now + 100 },
    { iat: now - 0.5 },
    { exp: now + 299.5 },
  ]) {
    const result = await POST(request(await sign(change)));
    expect(result.status).toBe(401);
    expect(result.headers.get("cache-control")).toBe("no-store");
  }
  expect(backend).not.toHaveBeenCalled();
  expect(
    (await POST(request(token, { origin: "https://evil.example" }))).status,
  ).toBe(403);
  expect((await POST(request(token, { host: "evil.example" }))).status).toBe(
    403,
  );
  expect((await POST(request(token, {}, "x".repeat(32769)))).status).toBe(400);
  expect(
    (
      await POST(
        request(
          token,
          {},
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "subscriptions/listen",
            params: {},
          }),
        ),
      )
    ).status,
  ).toBe(501);
  expect(backend).not.toHaveBeenCalled();
  const good = await POST(request(token));
  expect(good.status).toBe(200);
  expect(good.headers.get("cache-control")).toBe("no-store");
  expect(backend).toHaveBeenCalledOnce();
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "http://127.0.0.1:9000");
  expect((await POST(request(token))).status).toBe(503);
  expect(backend).toHaveBeenCalledOnce();
});

it("seals Events credentials before backend dispatch and derives unsubscribe identity from the verified owner and canonical filter", async () => {
  const eventIssuer = "https://synthetic-events-route.authkit.app";
  const { openEventCredentials } = await import("../packages/mcp/credentials");
  const { eventSubscriptionId } = await import("../packages/mcp/events");
  for (const [key, value] of Object.entries({
    MCP_ENABLED: "true",
    MCP_EVENTS_ENABLED: "true",
    MCP_AUTH_ISSUER: eventIssuer,
    NEXT_PUBLIC_CONVEX_URL: "https://synthetic-test.convex.cloud",
    MCP_EVENT_SECRET_KEY_1: Buffer.alloc(32, 5).toString("base64"),
    MCP_CLIENTS: JSON.stringify([
      { id: clientId, name: "Synthetic Events", scopes: ["events:subscribe"] },
    ]),
  }))
    vi.stubEnv(key, value);
  const keys = await generateKeyPair("RS256");
  jwks = {
    keys: [
      {
        ...(await exportJWK(keys.publicKey)),
        kid: "synthetic-rsa-key",
        alg: "RS256",
      },
    ],
  };
  const now = Math.floor(Date.now() / 1000),
    sid = "app_consent_01234567890123456789012345";
  const token = await new SignJWT({
    iss: eventIssuer,
    aud: resource,
    sub: subject,
    client_id: clientId,
    sid,
    scope: "events:subscribe",
    iat: now,
    exp: now + 600,
  })
    .setProtectedHeader({ alg: "RS256", kid: "synthetic-rsa-key" })
    .sign(keys.privateKey);
  const principal = { subject, clientId, consentId: sid };
  const selected = {
    profileId: "private-profile",
    sourceId: "selected-source",
    generation: 1,
    grantVersion: 3,
  };
  const secret = "whsec_" + Buffer.alloc(32, 4).toString("base64"),
    url = "https://receiver.example/callback";
  const backend = vi.fn(async (target: string, init: RequestInit) => {
    expect(target).toBe("https://synthetic-test.convex.site/assistant-events");
    expect(new Headers(init.headers).get("authorization")).toBe(
      `Bearer ${token}`,
    );
    const body = JSON.parse(init.body as string);
    expect(init.body).not.toContain(token);
    expect(init.body).not.toContain(secret);
    if (body.operation === "events/subscribe") {
      expect(body.args).toMatchObject(selected);
      expect(openEventCredentials(body.args, principal)).toEqual({
        token,
        callback: url,
        secret,
      });
      return Response.json({
        id: "sub_verified",
        refreshBefore: new Date().toISOString(),
        cursor: null,
        truncated: false,
      });
    }
    expect(body.args).toEqual({
      subscriptionId: eventSubscriptionId(principal, url, selected),
    });
    return Response.json({});
  });
  vi.stubGlobal("fetch", backend);
  const request = (method: string, params: Record<string, unknown>) =>
    new Request(resource, {
      method: "POST",
      headers: {
        host: "scroll.companynerve.com",
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2026-07-28",
        "mcp-method": method,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params: {
          ...params,
          _meta: {
            "io.modelcontextprotocol/protocolVersion": "2026-07-28",
            "io.modelcontextprotocol/clientInfo": {
              name: "Synthetic Events",
              version: "1",
            },
            "io.modelcontextprotocol/clientCapabilities": {},
          },
        },
      }),
    });
  const result = await POST(
    request("events/subscribe", {
      name: "analysis_completed",
      arguments: selected,
      delivery: { mode: "webhook", url, secret },
      cursor: null,
    }),
  );
  expect(result.status, await result.clone().text()).toBe(200);
  expect((await result.json()).result.id).toBe("sub_verified");
  const stopped = await POST(
    request("events/unsubscribe", {
      name: "analysis_completed",
      arguments: selected,
      delivery: { mode: "webhook", url },
    }),
  );
  expect(stopped.status).toBe(200);
  expect(backend).toHaveBeenCalledTimes(2);
});
