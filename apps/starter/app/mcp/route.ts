import { createRemoteJWKSet, jwtVerify } from "jose";
import {
  assistantClients,
  assistantIssuer,
  assistantResource,
} from "../../../../packages/policy/assistant";
import {
  assistantRequestAllowed,
  readAssistantBody,
} from "../../../../packages/policy/assistant-http";
import { createKnowledgeHandler } from "../../../../packages/mcp/server";
export const runtime = "nodejs";
export const maxDuration = 30;
const metadata =
  "https://scroll.companynerve.com/.well-known/oauth-protected-resource/mcp";
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
function challenge() {
  return Response.json(
    { error: "Official OAuth authorization is required." },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
        "WWW-Authenticate": `Bearer resource_metadata="${metadata}", scope="knowledge:read"`,
      },
    },
  );
}
export async function POST(request: Request) {
  if (!assistantRequestAllowed(request))
    return Response.json(
      { error: "Untrusted MCP request origin or host." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  const issuer = assistantIssuer(process.env.MCP_AUTH_ISSUER);
  if (process.env.MCP_ENABLED !== "true" || !issuer)
    return Response.json(
      { error: "VibeScroll assistant access is being prepared." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  let phase: "authentication" | "request" | "configuration" | "dispatch" =
    "authentication";
  try {
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer ([A-Za-z0-9._~-]{20,16384})$/)?.[1];
    if (!token) return challenge();
    let keys = keySets.get(issuer);
    if (!keys) {
      keys = createRemoteJWKSet(new URL(`${issuer}/oauth2/jwks`), {
        timeoutDuration: 5000,
        cacheMaxAge: 300000,
      });
      keySets.set(issuer, keys);
    }
    const { payload } = await jwtVerify(token, keys, {
      issuer,
      audience: assistantResource,
      algorithms: ["RS256"],
    });
    const client = assistantClients().find((c) => c.id === payload.client_id);
    if (
      payload.aud !== assistantResource ||
      !client ||
      typeof payload.sub !== "string" ||
      !/^user_[a-zA-Z0-9]{20,80}$/.test(payload.sub) ||
      typeof payload.sid !== "string" ||
      !/^app_consent_[a-zA-Z0-9]{20,80}$/.test(payload.sid) ||
      typeof payload.scope !== "string" ||
      payload.scope.length > 2048 ||
      typeof payload.exp !== "number" ||
      !Number.isSafeInteger(payload.exp) ||
      typeof payload.iat !== "number" ||
      !Number.isSafeInteger(payload.iat) ||
      payload.iat < 0 ||
      payload.iat > Date.now() / 1000
    )
      return challenge();
    phase = "request";
    const parsedBody = await readAssistantBody(request);
    if (parsedBody?.method === "subscriptions/listen")
      return Response.json(
        {
          jsonrpc: "2.0",
          id: parsedBody.id ?? null,
          error: {
            code: -32601,
            message: "Persistent Events delivery is not enabled.",
          },
        },
        { status: 501, headers: { "Cache-Control": "no-store" } },
      );
    phase = "configuration";
    const backend = new URL(process.env.NEXT_PUBLIC_CONVEX_URL ?? "");
    if (
      backend.protocol !== "https:" ||
      !/^([a-z0-9-]+)\.convex\.cloud$/.test(backend.hostname) ||
      backend.username ||
      backend.password ||
      backend.port ||
      backend.search ||
      backend.hash ||
      backend.pathname !== "/"
    )
      throw Error();
    const site = `https://${backend.hostname.replace(/\.cloud$/, ".site")}/assistant-tools`;
    phase = "dispatch";
    const handler = createKnowledgeHandler(async (operation, args) => {
      const response = await fetch(site, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(20000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ operation, args }),
      });
      const value = await readAssistantBody(response, 100000);
      return { ok: response.ok, status: response.status, value };
    });
    const input = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(parsedBody),
      signal: request.signal,
    });
    const response = await handler.fetch(input, {
      parsedBody,
      authInfo: {
        token,
        clientId: client.id,
        scopes: payload.scope.split(" ").filter(Boolean),
        expiresAt: payload.exp,
        resource: new URL(assistantResource),
        resourceMetadataUrl: metadata,
      },
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    if (phase === "authentication") return challenge();
    return Response.json(
      {
        error:
          phase === "request"
            ? "Use a bounded JSON MCP request."
            : "Assistant access is temporarily unavailable. Retry later or review Connections in VibeScroll.",
      },
      {
        status: phase === "request" ? 400 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
export async function GET() {
  return Response.json(
    {
      error:
        "Use stateless MCP POST. Persistent Events acceptance is separate.",
    },
    { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } },
  );
}
export const DELETE = GET;
