import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
export const issuer = "https://auth.openai.com";
export const resource = "https://api.openai.com/v1";
export const planScope = "chatgpt.tokens.use.direct";
export const appName = "VibeScroller";
const random = () => randomBytes(32).toString("base64url");
export function transaction(hostId, redirectUri, profile) {
  if (
    !/^urn:uuid:[a-f0-9-]{36}$/.test(hostId) ||
    !/^http:\/\/127\.0\.0\.1:\d+\/auth\/callback$/.test(redirectUri)
  )
    throw new Error("CHATGPT_INVALID_HOST");
  const state = random(),
    nonce = random(),
    verifier = random();
  const params = new URLSearchParams({
    client_id: profile?.clientId ?? "dynamic_agent_client",
    ext_agent_host_id: hostId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope:
      "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct",
    resource,
    state,
    nonce,
    code_challenge_method: "S256",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
  });
  if (!profile?.clientId) params.set("agent_name_hint", appName);
  if (profile?.idToken) params.set("id_token_hint", profile.idToken);
  return {
    state,
    nonce,
    verifier,
    redirectUri,
    clientId: profile?.clientId,
    url: `${issuer}/api/accounts/authorize?${params}`,
  };
}
export function callback(pending, url) {
  if (
    url.pathname !== "/auth/callback" ||
    [...url.searchParams.keys()].some(
      (key) => url.searchParams.getAll(key).length !== 1,
    )
  )
    throw new Error("CHATGPT_INVALID_CALLBACK");
  const returned = url.searchParams.get("state") ?? "";
  if (
    !/^[a-zA-Z0-9_-]{43}$/.test(returned) ||
    !timingSafeEqual(Buffer.from(returned), Buffer.from(pending.state))
  )
    throw new Error("CHATGPT_INVALID_STATE");
  if (url.searchParams.has("error"))
    throw new Error("CHATGPT_PERMISSION_DENIED");
  const clientId = url.searchParams.get("client_id") ?? pending.clientId;
  if (
    !clientId ||
    !/^oaiapp_[a-zA-Z0-9_-]{1,200}$/.test(clientId) ||
    (pending.clientId && clientId !== pending.clientId)
  )
    throw new Error("CHATGPT_REGISTRATION_MISMATCH");
  const code = url.searchParams.get("code");
  if (!code || code.length > 4096) throw new Error("CHATGPT_INVALID_CALLBACK");
  return { code, clientId };
}
export function tokenRecord(data, identity, prior, nonce, now = Date.now()) {
  if (
    identity.iss !== issuer ||
    typeof identity.sub !== "string" ||
    !identity.sub ||
    (nonce && identity.nonce !== nonce) ||
    (prior?.subject && prior.subject !== identity.sub)
  )
    throw new Error("CHATGPT_IDENTITY_MISMATCH");
  if (
    data.token_type?.toLowerCase() !== "bearer" ||
    typeof data.access_token !== "string" ||
    !data.access_token ||
    typeof data.refresh_token !== "string" ||
    !data.refresh_token ||
    typeof data.id_token !== "string" ||
    typeof data.scope !== "string" ||
    !Number.isSafeInteger(data.expires_in) ||
    data.expires_in <= 0 ||
    data.expires_in > 86400
  )
    throw new Error("CHATGPT_INVALID_TOKEN_RESPONSE");
  return {
    ...prior,
    subject: identity.sub,
    email: typeof identity.email === "string" ? identity.email : undefined,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    idToken: data.id_token,
    scopes: data.scope.split(/\s+/),
    expiresAt: now + data.expires_in * 1000,
    earliestRefreshAt: data.earliest_refresh_at,
    pendingRefresh: undefined,
  };
}
export function inferenceRequest(model, input, instructions) {
  if (
    typeof model !== "string" ||
    !model ||
    model.length > 150 ||
    typeof input !== "string" ||
    !input.trim() ||
    input.length > 120000 ||
    (instructions !== undefined &&
      (typeof instructions !== "string" || instructions.length > 20000))
  )
    throw new Error("CHATGPT_INVALID_REQUEST");
  return {
    model,
    input: [{ role: "user", content: input }],
    ...(instructions ? { instructions } : {}),
    store: false,
    stream: true,
  };
}
export async function completedResponse(response) {
  const contentType = response.headers.get("content-type");
  if (
    !response.ok ||
    !response.body ||
    (contentType && !contentType.startsWith("text/event-stream"))
  )
    throw new Error(
      response.status === 429
        ? "CHATGPT_ALLOWANCE_UNAVAILABLE"
        : "CHATGPT_REQUEST_FAILED",
    );
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let pending = "",
    bytes = 0,
    text = "",
    result;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.length;
      if (bytes > 2000000) throw new Error("CHATGPT_OUTPUT_LIMIT");
      pending += decoder.decode(chunk.value, { stream: true });
      let boundary;
      while ((boundary = /\r?\n\r?\n/.exec(pending))) {
        const event = pending.slice(0, boundary.index);
        pending = pending.slice(boundary.index + boundary[0].length);
        const data = event
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (!data || data === "[DONE]") continue;
        const item = JSON.parse(data);
        if (
          ["error", "response.failed", "response.incomplete"].includes(
            item.type,
          )
        )
          throw new Error("CHATGPT_RESPONSE_INCOMPLETE");
        if (
          item.type === "response.output_text.delta" &&
          typeof item.delta === "string"
        )
          text += item.delta;
        if (item.type === "response.completed") {
          if (item.response?.status !== "completed")
            throw new Error("CHATGPT_RESPONSE_INCOMPLETE");
          result = {
            text,
            responseId: item.response.id,
            usage: item.response.usage,
          };
        }
      }
    }
    if (!result || !result.text.trim())
      throw new Error("CHATGPT_RESPONSE_INCOMPLETE");
    return result;
  } finally {
    await reader.cancel().catch(() => {});
  }
}
