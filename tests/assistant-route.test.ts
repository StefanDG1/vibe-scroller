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
