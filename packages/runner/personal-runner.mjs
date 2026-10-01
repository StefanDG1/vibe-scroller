import { readFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { LocalChatGPT } from "./chatgpt-local.mjs";
import { vault } from "./vault.mjs";
import { processPersonalJob } from "./personal-analysis.mjs";

// Outbound HTTPS only. This process runs no repository scripts or decoder.
try {
  const path = process.argv[2];
  if (process.platform !== "win32" || !isAbsolute(path ?? ""))
    throw new Error("PERSONAL_CONFIG_INVALID");
  const bytes = await readFile(path);
  if (bytes.length > 10000) throw new Error("PERSONAL_CONFIG_INVALID");
  const config = JSON.parse(bytes.toString("utf8"));
  const url = new URL(config.server);
  if (
    url.protocol !== "https:" ||
    !/^[a-z0-9-]+\.convex\.site$/.test(url.hostname) ||
    url.port ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    config.protocolVersion !== "1.0.0" ||
    config.credentialVaultAdapter !== "windows-credential-manager" ||
    !config.credentialTarget ||
    !config.workspaceId
  )
    throw new Error("PERSONAL_CONFIG_INVALID");
  const stored = await vault("read", config.credentialTarget);
  if (!stored.secret) throw new Error("PERSONAL_CONFIG_INVALID");
  const secret = JSON.parse(stored.secret);
  if (!/^[A-Za-z0-9_-]{43}$/.test(secret.credential ?? ""))
    throw new Error("PERSONAL_CONFIG_INVALID");
  const endpoint = new URL("/runner/personal/v1", url);
  const request = async (operation, args = {}) => {
    const body = JSON.stringify({ protocolVersion: "1.0.0", operation, args });
    if (Buffer.byteLength(body) > 150000)
      throw new Error("PERSONAL_OUTPUT_LIMIT");
    const response = await fetch(endpoint, {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret.credential}`,
      },
      body,
      signal: AbortSignal.timeout(20000),
    });
    if (
      !response.ok ||
      !response.headers.get("content-type")?.includes("application/json")
    )
      throw new Error("PERSONAL_DEVICE_UNAVAILABLE");
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    try {
      for (;;) {
        const item = await reader.read();
        if (item.done) break;
        size += item.value.byteLength;
        if (size > 150000) throw new Error("PERSONAL_OUTPUT_LIMIT");
        chunks.push(Buffer.from(item.value));
      }
    } finally {
      await reader.cancel();
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  };
  const client = new LocalChatGPT(),
    shutdown = new AbortController();
  for (const name of ["SIGINT", "SIGTERM"])
    process.once(name, () => shutdown.abort());
  let announcedAt = 0;
  while (!shutdown.signal.aborted) {
    if (Date.now() - announcedAt > 30000) {
      const profile = await client.status();
      if (!profile.activeProfileId)
        throw new Error("PERSONAL_PROFILE_UNAVAILABLE");
      const status = await request("hello", {
        models: await client.models(),
        profileBinding: createHash("sha256")
          .update(profile.activeProfileId)
          .digest("hex"),
      });
      if (status.workspaceId !== config.workspaceId)
        throw new Error("PERSONAL_WORKSPACE_MISMATCH");
      announcedAt = Date.now();
    }
    const response = await request("poll");
    if (response.reconcile) {
      await request("fail", {
        id: response.reconcile.id,
        ...(response.reconcile.generation === null
          ? {}
          : { generation: response.reconcile.generation }),
      });
    } else if (response.job) {
      try {
        await processPersonalJob(response.job, {
          client,
          request,
          signal: shutdown.signal,
        });
        console.log(
          "Personal source analysis completed. Review it in the browser.",
        );
      } catch {
        try {
          await request("fail", {
            id: response.job.id,
            generation: response.job.generation,
          });
        } catch {
          /* Revoked credentials cannot acknowledge. The result remains fenced. */
        }
        console.error(
          "Personal analysis stopped. No alternate provider was used; review its state and plan usage.",
        );
      }
    }
    await delay(10000, undefined, { signal: shutdown.signal }).catch(() => {});
  }
} catch {
  console.error(
    "Personal runner stopped. Check pairing, account permission and backend setup. No credentials or source content were logged.",
  );
  process.exitCode = 1;
}
