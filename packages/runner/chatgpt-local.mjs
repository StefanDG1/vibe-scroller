import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { ChatGPTStore } from "./chatgpt-store.mjs";
import {
  appName,
  callback,
  completedResponse,
  inferenceRequest,
  issuer,
  planScope,
  resource,
  tokenRecord,
  transaction,
} from "./chatgpt-protocol.mjs";

// Independent adapter to the published protocol; no DevKit code or private APIs.
const keys = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
export class LocalChatGPT {
  constructor({
    store = new ChatGPTStore(),
    fetchImpl = fetch,
    verify = async (token, clientId) =>
      (
        await jwtVerify(token, keys, {
          issuer,
          audience: clientId,
          algorithms: ["RS256", "ES256"],
        })
      ).payload,
    openBrowser = openAuthorization,
  } = {}) {
    this.store = store;
    this.fetch = fetchImpl;
    this.verify = verify;
    this.openBrowser = openBrowser;
  }
  async json(url, init = {}) {
    const response = await this.fetch(url, {
      ...init,
      redirect: "error",
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? "CHATGPT_ALLOWANCE_UNAVAILABLE"
          : response.status === 401
            ? "CHATGPT_RECONNECT_REQUIRED"
            : "CHATGPT_PROVIDER_UNAVAILABLE",
      );
    const raw = await response.text();
    if (raw.length > 1000000) throw new Error("CHATGPT_OUTPUT_LIMIT");
    return JSON.parse(raw);
  }
  async exchange(fields) {
    return this.json(`${issuer}/api/accounts/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...fields, resource }),
    });
  }
  async status() {
    return this.store.lock(async () => {
      const state = await this.store.read();
      return {
        activeProfileId: state.activeProfileId,
        profiles: state.profiles.map((profile) => ({
          id: profile.id,
          label: profile.label,
          email: profile.email,
          connected: Boolean(profile.accessToken) && !profile.pendingRefresh,
          sharing:
            Boolean(profile.accessToken) &&
            !profile.pendingRefresh &&
            profile.scopes?.includes(planScope) === true,
        })),
        manageUsage: "https://chatgpt.com/settings/usage",
      };
    });
  }
  async signIn(profileId) {
    return this.store.lock(async () => {
      const state = await this.store.read();
      const old = profileId
        ? state.profiles.find((profile) => profile.id === profileId)
        : undefined;
      if (profileId && !old) throw new Error("CHATGPT_PROFILE_UNAVAILABLE");
      await this.store.write(state); // Stable installation ID is durable before consent.
      const server = createServer();
      server.requestTimeout = 10000;
      server.headersTimeout = 10000;
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
      });
      const address = server.address();
      const pending = transaction(
        state.hostId,
        `http://127.0.0.1:${address.port}/auth/callback`,
        old,
      );
      let timer;
      try {
        const result = await new Promise((resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error("CHATGPT_SIGN_IN_TIMEOUT")),
            10 * 60000,
          );
          server.on("request", (req, res) => {
            res.setHeader("Cache-Control", "no-store");
            res.setHeader("Content-Security-Policy", "default-src 'none'");
            if (
              req.method !== "GET" ||
              req.headers.host !== `127.0.0.1:${address.port}` ||
              (req.url?.length ?? 0) > 10000
            ) {
              res.writeHead(400).end("Invalid callback.");
              return;
            }
            try {
              const value = callback(
                pending,
                new URL(req.url, pending.redirectUri),
              );
              res
                .writeHead(200, { "Content-Type": "text/plain; charset=utf-8" })
                .end(
                  "VibeScroller received the authorization. Return to the local application to see verification.",
                );
              resolve(value);
            } catch (error) {
              res
                .writeHead(400)
                .end("Authorization was not accepted. Return to VibeScroller.");
              // Unrelated requests cannot cancel a pending valid authorization.
              if (error.message === "CHATGPT_PERMISSION_DENIED") reject(error);
            }
          });
          this.openBrowser(pending.url).catch(() =>
            reject(new Error("CHATGPT_BROWSER_UNAVAILABLE")),
          );
        });
        const profile = old ?? {
          id: randomUUID(),
          label: `Connection ${state.profiles.length + 1}`,
          clientId: result.clientId,
        };
        if (!old) state.profiles.push(profile);
        await this.store.write(state); // Retain issued registration even if code exchange fails.
        const data = await this.exchange({
          grant_type: "authorization_code",
          client_id: result.clientId,
          code: result.code,
          code_verifier: pending.verifier,
          redirect_uri: pending.redirectUri,
        });
        const identity = await this.verify(data.id_token, result.clientId);
        const verified = tokenRecord(data, identity, profile, pending.nonce);
        state.profiles = state.profiles.map((entry) =>
          entry.id === profile.id ? verified : entry,
        );
        state.activeProfileId = profile.id;
        await this.store.write(state);
        return {
          profileId: profile.id,
          sharing: verified.scopes.includes(planScope),
        };
      } finally {
        clearTimeout(timer);
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
      }
    });
  }
  async select(profileId) {
    return this.store.lock(async () => {
      const state = await this.store.read();
      if (!state.profiles.some((profile) => profile.id === profileId))
        throw new Error("CHATGPT_PROFILE_UNAVAILABLE");
      state.activeProfileId = profileId;
      await this.store.write(state);
    });
  }
  async authenticated(operation) {
    return this.store.lock(async () => {
      const state = await this.store.read();
      let profile = state.profiles.find(
        (entry) => entry.id === state.activeProfileId,
      );
      if (!profile?.accessToken || profile.pendingRefresh)
        throw new Error("CHATGPT_RECONNECT_REQUIRED");
      if (!profile.scopes?.includes(planScope))
        throw new Error("CHATGPT_PERMISSION_REQUIRED");
      if (profile.expiresAt <= Date.now() + 60000) {
        const earliest =
          typeof profile.earliestRefreshAt === "number"
            ? profile.earliestRefreshAt * 1000
            : Date.parse(profile.earliestRefreshAt ?? "");
        if (Number.isFinite(earliest) && earliest > Date.now()) {
          if (profile.expiresAt <= Date.now())
            throw new Error("CHATGPT_REFRESH_NOT_READY");
        } else {
          profile.pendingRefresh = true;
          await this.store.write(state); // An uncertain rotation never retries its predecessor.
          const data = await this.exchange({
            grant_type: "refresh_token",
            client_id: profile.clientId,
            refresh_token: profile.refreshToken,
          });
          const identity = await this.verify(data.id_token, profile.clientId);
          const refreshed = tokenRecord(data, identity, profile);
          state.profiles = state.profiles.map((entry) =>
            entry.id === profile.id ? refreshed : entry,
          );
          await this.store.write(state);
          profile = refreshed;
        }
      }
      if (!profile.scopes?.includes(planScope))
        throw new Error("CHATGPT_PERMISSION_REQUIRED");
      return operation(profile);
    });
  }
  async models() {
    return this.authenticated(async (profile) => {
      const data = await this.json(`${resource}/models`, {
        headers: { Authorization: `Bearer ${profile.accessToken}` },
      });
      if (!Array.isArray(data.models))
        throw new Error("CHATGPT_INVALID_MODEL_CATALOG");
      return data.models
        .filter(
          (model) =>
            model.visibility === "list" &&
            typeof model.slug === "string" &&
            typeof model.display_name === "string",
        )
        .map((model) => ({
          slug: model.slug,
          displayName: model.display_name,
        }));
    });
  }
  async respond({ model, input, instructions, frames, reasoningEffort }) {
    const body = inferenceRequest(
      model,
      input,
      instructions,
      frames,
      reasoningEffort,
    );
    return this.authenticated(async (profile) => {
      const catalogue = await this.json(`${resource}/models`, {
        headers: { Authorization: `Bearer ${profile.accessToken}` },
      });
      if (
        !catalogue.models?.some(
          (item) => item.slug === model && item.visibility === "list",
        )
      )
        throw new Error("CHATGPT_MODEL_UNAVAILABLE");
      const response = await this.fetch(`${resource}/responses`, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(120000),
        headers: {
          Authorization: `Bearer ${profile.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      return completedResponse(response);
    });
  }
  async disconnect() {
    return this.store.lock(async () => {
      const state = await this.store.read(),
        profile = state.profiles.find(
          (entry) => entry.id === state.activeProfileId,
        );
      if (!profile) return { remoteRevoked: true };
      let remoteRevoked = !profile.refreshToken;
      try {
        if (profile.refreshToken) {
          const metadata = await this.json(
            `${issuer}/.well-known/openid-configuration`,
          );
          const endpoint = new URL(metadata.revocation_endpoint);
          if (
            metadata.issuer !== issuer ||
            endpoint.origin !== issuer ||
            endpoint.username ||
            endpoint.password
          )
            throw new Error("CHATGPT_INVALID_ENDPOINT");
          const response = await this.fetch(endpoint, {
            method: "POST",
            redirect: "error",
            signal: AbortSignal.timeout(15000),
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              token: profile.refreshToken,
              token_type_hint: "refresh_token",
              client_id: profile.clientId,
            }),
          });
          remoteRevoked = response.status === 200;
        }
      } catch {
        remoteRevoked = false;
      }
      state.profiles = state.profiles.map((entry) =>
        entry.id === profile.id
          ? {
              id: entry.id,
              label: entry.label,
              clientId: entry.clientId,
              subject: entry.subject,
              email: entry.email,
              scopes: [],
            }
          : entry,
      );
      await this.store.write(state);
      return {
        remoteRevoked,
        manageUsage: "https://chatgpt.com/settings/usage",
      };
    });
  }
}
async function openAuthorization(url) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-File",
        fileURLToPath(new URL("./chatgpt-browser.ps1", import.meta.url)),
      ],
      { shell: false, windowsHide: true, stdio: ["pipe", "ignore", "ignore"] },
    );
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error("CHATGPT_BROWSER_UNAVAILABLE")),
    );
    child.stdin.end(url);
  });
}
export const localApplicationName = appName;
