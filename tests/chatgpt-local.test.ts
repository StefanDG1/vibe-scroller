// @vitest-environment node
import { expect, it } from "vitest";
import { LocalChatGPT } from "../packages/runner/chatgpt-local.mjs";
import {
  callback,
  completedResponse,
  inferenceRequest,
  tokenRecord,
  transaction,
} from "../packages/runner/chatgpt-protocol.mjs";
const host = "urn:uuid:01234567-89ab-4cde-8123-456789abcdef";
it("bounds timestamped inline frames and excludes remote image fetches, tools and paid funding", () => {
  const frame = {
    timestampMs: 2000,
    dataUrl: "data:image/png;base64,iVBORw0KGgo=",
  };
  const request: any = inferenceRequest(
    "observed-model",
    "Transcript",
    "Untrusted evidence",
    [frame],
    "medium",
  );
  expect(request.input[0].content[2]).toEqual({
    type: "input_image",
    image_url: frame.dataUrl,
    detail: "auto",
  });
  expect(request.reasoning).toEqual({ effort: "medium" });
  expect(request.tools).toBeUndefined();
  expect(request.store).toBe(false);
  for (const invalid of [
    { ...frame, dataUrl: "https://example.com/pixel" },
    { ...frame, timestampMs: 600001 },
    { ...frame, dataUrl: "data:image/png;base64,AAAA" },
    { ...frame, hidden: "instructions" },
  ]) {
    expect(() =>
      inferenceRequest("observed-model", "text", undefined, [invalid]),
    ).toThrow("INVALID_REQUEST");
  }
  expect(() =>
    inferenceRequest(
      "observed-model",
      "text",
      undefined,
      Array(49).fill(frame),
    ),
  ).toThrow();
});
const identity = { iss: "https://auth.openai.com", sub: "test-subject" };
const token = {
  token_type: "Bearer",
  access_token: "synthetic-access",
  refresh_token: "synthetic-refresh",
  id_token: "synthetic-identity",
  scope: "chatgpt.tokens.use.direct",
  expires_in: 3600,
};
function memoryStore(profile: any) {
  let state: any = {
    version: 1,
    hostId: host,
    activeProfileId: "profile-a",
    profiles: [profile],
  };
  return {
    lock: async (operation: any) => operation(),
    read: async () => structuredClone(state),
    write: async (value: any) => {
      state = structuredClone(value);
    },
    snapshot: () => structuredClone(state),
  };
}
const profile = () => ({
  id: "profile-a",
  label: "Connection 1",
  clientId: "oaiapp_synthetic",
  ...tokenRecord(token, identity, undefined, undefined),
});
it("propagates cancellation before and during provider inference without a fallback", async () => {
  const controller = new AbortController();
  let inferenceStarted = false;
  const client = new LocalChatGPT({
    store: memoryStore(profile()),
    fetchImpl: async (url: string, init: RequestInit) => {
      if (url.endsWith("/models"))
        return Response.json({
          models: [{ slug: "observed-model", visibility: "list" }],
        });
      inferenceStarted = true;
      return new Promise((_resolve, reject) => {
        init.signal!.addEventListener(
          "abort",
          () => reject(init.signal!.reason),
          { once: true },
        );
        controller.abort(new Error("test cancellation"));
      });
    },
  });
  await expect(
    client.respond({
      model: "observed-model",
      input: "text",
      signal: controller.signal,
    }),
  ).rejects.toThrow("test cancellation");
  expect(inferenceStarted).toBe(true);
  inferenceStarted = false;
  await expect(
    client.respond({
      model: "observed-model",
      input: "text",
      signal: controller.signal,
    }),
  ).rejects.toThrow("test cancellation");
  expect(inferenceStarted).toBe(false);
});
function stream(items: any[], fragment = false) {
  const data = items
    .map((item) => `data: ${JSON.stringify(item)}\r\n\r\n`)
    .join("");
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const part of fragment ? [...data] : [data])
          controller.enqueue(new TextEncoder().encode(part));
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/event-stream" } },
  );
}
it("binds PKCE, host, callback and returning registration without exposing a client secret", () => {
  const first = transaction(host, "http://127.0.0.1:43210/auth/callback");
  const url = new URL(first.url);
  expect(url.searchParams.get("client_id")).toBe("dynamic_agent_client");
  expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  expect(url.searchParams.has("client_secret")).toBe(false);
  const returned = new URL(
    `http://127.0.0.1:43210/auth/callback?state=${first.state}&code=synthetic&client_id=oaiapp_synthetic`,
  );
  expect(callback(first, returned).clientId).toBe("oaiapp_synthetic");
  returned.searchParams.set("state", "wrong");
  expect(() => callback(first, returned)).toThrow("CHATGPT_INVALID_STATE");
  const next = transaction(host, first.redirectUri, {
    clientId: "oaiapp_synthetic",
  });
  expect(new URL(next.url).searchParams.has("agent_name_hint")).toBe(false);
  expect(() =>
    transaction(host, "http://localhost:43210/auth/callback"),
  ).toThrow();
});
it("rejects duplicate callback parameters, denial and swapped returning clients", () => {
  const pending = transaction(host, "http://127.0.0.1:43210/auth/callback", {
    clientId: "oaiapp_original",
  });
  const url = new URL(
    `${pending.redirectUri}?state=${pending.state}&code=test&client_id=oaiapp_other`,
  );
  expect(() => callback(pending, url)).toThrow("REGISTRATION_MISMATCH");
  url.searchParams.delete("client_id");
  url.searchParams.set("error", "access_denied");
  expect(() => callback(pending, url)).toThrow("PERMISSION_DENIED");
  url.searchParams.delete("error");
  url.searchParams.append("code", "second");
  expect(() => callback(pending, url)).toThrow("INVALID_CALLBACK");
});
it("rejects account replacement, nonce mismatch and invalid token response", () => {
  expect(() =>
    tokenRecord(token, { ...identity, nonce: "wrong" }, undefined, "expected"),
  ).toThrow("IDENTITY_MISMATCH");
  expect(() =>
    tokenRecord(token, identity, { subject: "different-subject" }, undefined),
  ).toThrow("IDENTITY_MISMATCH");
  expect(() =>
    tokenRecord({ ...token, expires_in: -1 }, identity, undefined, undefined),
  ).toThrow("INVALID_TOKEN_RESPONSE");
});
it("accepts fragmented SSE only after a completed nonempty response", async () => {
  const response = await completedResponse(
    stream(
      [
        { type: "response.output_text.delta", delta: "Hello" },
        {
          type: "response.completed",
          response: { id: "test-response", status: "completed" },
        },
      ],
      true,
    ),
  );
  expect(response.text).toBe("Hello");
  await expect(
    completedResponse(
      stream([{ type: "response.output_text.delta", delta: "partial" }]),
    ),
  ).rejects.toThrow("INCOMPLETE");
  await expect(
    completedResponse(
      stream([
        { type: "response.completed", response: { status: "completed" } },
      ]),
    ),
  ).rejects.toThrow("INCOMPLETE");
});
it("rejects allowance failures after deltas and never returns partial success", async () => {
  await expect(
    completedResponse(
      stream([
        { type: "response.output_text.delta", delta: "partial" },
        {
          type: "response.failed",
          response: {
            error: { code: "subscription_sharing_usage_limit_exceeded" },
          },
        },
      ]),
    ),
  ).rejects.toThrow("INCOMPLETE");
  await expect(
    completedResponse(new Response("", { status: 429 })),
  ).rejects.toThrow("ALLOWANCE_UNAVAILABLE");
  expect(inferenceRequest("observed-model", "text", "instruction")).toEqual({
    model: "observed-model",
    input: [{ role: "user", content: "text" }],
    instructions: "instruction",
    stream: true,
    store: false,
  });
});
it("validates completed SSE when the live provider omits its content-type header", async () => {
  const source = stream([
    { type: "response.output_text.delta", delta: "Connected" },
    {
      type: "response.completed",
      response: { id: "test-response", status: "completed" },
    },
  ]);
  const response = await completedResponse(new Response(source.body));
  expect(response.text).toBe("Connected");
  await expect(
    completedResponse(Response.json({ status: "completed", output: "fake" })),
  ).rejects.toThrow("REQUEST_FAILED");
  await expect(
    completedResponse(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode('{"status":"completed"}'),
            );
            controller.close();
          },
        }),
      ),
    ),
  ).rejects.toThrow("INCOMPLETE");
});
it("exposes safe account metadata while keeping local tokens private", async () => {
  const store = memoryStore(profile()),
    client = new LocalChatGPT({ store });
  const result = JSON.stringify(await client.status());
  expect(result).toContain("sharing");
  for (const value of [token.access_token, token.refresh_token, token.id_token])
    expect(result).not.toContain(value);
});
it("refuses an account switch after a source approved another local registration", async () => {
  let called = false;
  const client = new LocalChatGPT({
    store: memoryStore(profile()),
    fetchImpl: async () => {
      called = true;
      throw Error("must not call provider");
    },
  });
  await expect(
    client.respond({
      model: "observed-model",
      input: "text",
      expectedProfileId: "other-profile",
    }),
  ).rejects.toThrow("CHATGPT_PROFILE_CHANGED");
  expect(called).toBe(false);
});
it("requires granted plan scope and current account-specific model access", async () => {
  const restricted = profile();
  restricted.scopes = ["openid"];
  const denied = new LocalChatGPT({
    store: memoryStore(restricted),
    fetchImpl: async () => {
      throw new Error("must not call provider");
    },
  });
  await expect(denied.models()).rejects.toThrow("PERMISSION_REQUIRED");
  const calls: string[] = [];
  const client = new LocalChatGPT({
    store: memoryStore(profile()),
    fetchImpl: async (url: string) => {
      calls.push(url);
      return Response.json({
        models: [
          {
            slug: "observed-model",
            visibility: "list",
            display_name: "Observed",
          },
        ],
      });
    },
  });
  await expect(
    client.respond({ model: "invented", input: "text" }),
  ).rejects.toThrow("MODEL_UNAVAILABLE");
  expect(calls).toEqual(["https://api.openai.com/v1/models"]);
});
it("checkpoints uncertain refresh and blocks reuse of a rotating predecessor", async () => {
  const expired = profile();
  expired.expiresAt = 0;
  const store = memoryStore(expired);
  let calls = 0;
  const client = new LocalChatGPT({
    store,
    fetchImpl: async () => {
      calls++;
      throw new Error("network failure");
    },
  });
  await expect(client.models()).rejects.toThrow();
  expect(store.snapshot().profiles[0].pendingRefresh).toBe(true);
  await expect(client.models()).rejects.toThrow("RECONNECT_REQUIRED");
  expect(calls).toBe(1);
});
it("replaces refresh tokens atomically with verified same-account identity", async () => {
  const expired = profile();
  expired.expiresAt = 0;
  const store = memoryStore(expired);
  const client = new LocalChatGPT({
    store,
    verify: async () => identity,
    fetchImpl: async (url: string) =>
      url.includes("oauth/token")
        ? Response.json({ ...token, refresh_token: "synthetic-replacement" })
        : Response.json({ models: [] }),
  });
  await client.models();
  expect(store.snapshot().profiles[0].refreshToken).toBe(
    "synthetic-replacement",
  );
  expect(store.snapshot().profiles[0].pendingRefresh).toBeUndefined();
});
it("clears tokens after unconfirmed remote revocation while retaining registration", async () => {
  const store = memoryStore(profile());
  const client = new LocalChatGPT({
    store,
    fetchImpl: async () => {
      throw new Error("network unavailable");
    },
  });
  expect((await client.disconnect()).remoteRevoked).toBe(false);
  expect(store.snapshot().profiles[0].clientId).toBe("oaiapp_synthetic");
  expect(store.snapshot().profiles[0].accessToken).toBeUndefined();
  expect(JSON.stringify(await client.status())).not.toContain(
    token.refresh_token,
  );
});
it("completes a real loopback callback and persists registration before synthetic token exchange", async () => {
  const store = memoryStore(undefined);
  await store.write({ version: 1, hostId: host, profiles: [] });
  let nonce = "",
    registrationPersisted = false;
  const client = new LocalChatGPT({
    store,
    openBrowser: async (target: string) => {
      const authorization = new URL(target);
      nonce = authorization.searchParams.get("nonce")!;
      const redirect = new URL(authorization.searchParams.get("redirect_uri")!);
      redirect.searchParams.set(
        "state",
        authorization.searchParams.get("state")!,
      );
      redirect.searchParams.set("client_id", "oaiapp_loopback_test");
      redirect.searchParams.set("code", "synthetic-code");
      const returned = await fetch(redirect);
      expect(returned.status).toBe(200);
      expect(returned.headers.get("cache-control")).toBe("no-store");
    },
    verify: async () => ({ ...identity, nonce }),
    fetchImpl: async (_url: string, init: RequestInit) => {
      registrationPersisted =
        store.snapshot().profiles[0]?.clientId === "oaiapp_loopback_test";
      const fields = init.body as URLSearchParams;
      expect(fields.get("client_id")).toBe("oaiapp_loopback_test");
      expect(fields.get("grant_type")).toBe("authorization_code");
      expect(fields.get("code_verifier")).toHaveLength(43);
      return Response.json(token);
    },
  });
  const result = await client.signIn();
  expect(registrationPersisted).toBe(true);
  expect(result.sharing).toBe(true);
  expect((await client.status()).profiles[0].connected).toBe(true);
});
