import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { BlockList, isIP } from "node:net";
import { createHmac, timingSafeEqual } from "node:crypto";
import { publicPreviewAddress } from "../providers/source-preview";
const extraBlocked = new BlockList();
extraBlocked.addSubnet("192.88.99.0", 24, "ipv4");
for (const [address, prefix] of [
  ["2001::", 23],
  ["2002::", 16],
  ["3fff::", 20],
] as const)
  extraBlocked.addSubnet(address, prefix, "ipv6");
export function publicWebhookAddress(address: string) {
  const family = isIP(address);
  return (
    publicPreviewAddress(address) &&
    !extraBlocked.check(address, family === 4 ? "ipv4" : "ipv6")
  );
}
export function webhookUrl(raw: string) {
  const url = new URL(raw);
  if (
    raw.length > 4096 ||
    // oxlint-disable-next-line no-control-regex -- Reject ambiguous callback URL control characters.
    /[\u0000-\u0020\u007f]/.test(raw) ||
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hash ||
    (url.port && url.port !== "443") ||
    isIP(url.hostname) ||
    url.hostname.startsWith("[") ||
    url.hostname.length > 253
  )
    throw Error("CALLBACK_URL_DENIED");
  return url;
}
export function webhookKey(secret: string) {
  if (!/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(secret))
    throw Error("CALLBACK_SECRET_DENIED");
  const key = Buffer.from(secret.slice(6), "base64");
  if (
    key.length < 24 ||
    key.length > 64 ||
    key.toString("base64").replace(/=+$/, "") !==
      secret.slice(6).replace(/=+$/, "")
  )
    throw Error("CALLBACK_SECRET_DENIED");
  return key;
}
export function webhookHeaders(
  id: string,
  body: string,
  secrets: string[],
  subscriptionId?: string,
  now = Date.now(),
) {
  if (
    !/^[a-zA-Z0-9_-]{8,128}$/.test(id) ||
    !Number.isSafeInteger(now) ||
    now < 0 ||
    Buffer.byteLength(body) > 262144 ||
    secrets.length < 1 ||
    secrets.length > 2 ||
    (subscriptionId !== undefined &&
      !/^[a-zA-Z0-9_-]{8,128}$/.test(subscriptionId))
  )
    throw Error("CALLBACK_PAYLOAD_DENIED");
  const timestamp = String(Math.floor(now / 1000));
  const signatures = [...new Set(secrets)].map((secret) => {
    const key = webhookKey(secret);
    try {
      return (
        "v1," +
        createHmac("sha256", key)
          .update(`${id}.${timestamp}.${body}`)
          .digest("base64")
      );
    } finally {
      key.fill(0);
    }
  });
  return {
    "Content-Type": "application/json",
    "webhook-id": id,
    "webhook-timestamp": timestamp,
    "webhook-signature": signatures.join(" "),
    ...(subscriptionId ? { "X-MCP-Subscription-Id": subscriptionId } : {}),
  };
}
export function challengeMatches(body: Uint8Array, challenge: string) {
  try {
    const received = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(body),
    );
    if (typeof received.challenge !== "string") return false;
    const a = Buffer.from(received.challenge),
      b = Buffer.from(challenge);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
/** Resolve once per connection and pin a validated public address without changing SNI. */
export async function sendWebhook(
  raw: string,
  body: string,
  headers: Record<string, string>,
  beforeSend?: () => Promise<boolean>,
  receiptOnly = false,
): Promise<{ status: number; body: Uint8Array }> {
  const url = webhookUrl(raw);
  if (Buffer.byteLength(body) > 262144) throw Error("CALLBACK_PAYLOAD_DENIED");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const addresses = await Promise.race([
      lookup(url.hostname, { all: true }),
      new Promise<never>((_, reject) =>
        controller.signal.addEventListener(
          "abort",
          () => reject(Error("CALLBACK_TIMEOUT")),
          { once: true },
        ),
      ),
    ]);
    if (
      !addresses.length ||
      addresses.length > 16 ||
      !addresses.every((a) => publicWebhookAddress(a.address)) ||
      controller.signal.aborted
    )
      throw Error("CALLBACK_DNS_DENIED");
    if (beforeSend) {
      const authorized = await Promise.race([
        beforeSend(),
        new Promise<never>((_, reject) =>
          controller.signal.addEventListener(
            "abort",
            () => reject(Error("CALLBACK_TIMEOUT")),
            { once: true },
          ),
        ),
      ]);
      if (!authorized || controller.signal.aborted)
        throw Error("CALLBACK_AUTHORITY_CHANGED");
    }
    return await new Promise((resolve, reject) => {
      const req = request(
        url,
        {
          method: "POST",
          agent: false,
          signal: controller.signal,
          maxHeaderSize: 16384,
          headers: {
            ...headers,
            "Content-Length": Buffer.byteLength(body),
            "Accept-Encoding": "identity",
          },
          lookup: (hostname, options, callback) => {
            if (hostname !== url.hostname) {
              callback(Error("CALLBACK_DNS_DENIED"), "", 4);
              return;
            }
            const pinned = addresses[0];
            if (options.all) callback(null, [pinned]);
            else callback(null, pinned.address, pinned.family);
          },
        },
        (res) => {
          const status = res.statusCode ?? 0;
          if (status >= 300 && status < 400) {
            res.destroy();
            reject(Error("CALLBACK_REDIRECT_DENIED"));
            return;
          }
          if (receiptOnly || status === 410 || status === 413) {
            resolve({ status, body: new Uint8Array() });
            res.destroy();
            return;
          }
          if (Number(res.headers["content-length"] ?? 0) > 4096) {
            res.destroy();
            reject(Error("CALLBACK_RESPONSE_DENIED"));
            return;
          }
          let size = 0;
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > 4096) {
              reject(Error("CALLBACK_RESPONSE_DENIED"));
              res.destroy();
              return;
            }
            chunks.push(chunk);
          });
          res.on("error", () => reject(Error("CALLBACK_TRANSPORT_FAILED")));
          res.on("aborted", () => reject(Error("CALLBACK_TRANSPORT_FAILED")));
          res.on("end", () =>
            resolve({ status, body: Buffer.concat(chunks, size) }),
          );
        },
      );
      req.on("error", () =>
        reject(
          Error(
            controller.signal.aborted
              ? "CALLBACK_TIMEOUT"
              : "CALLBACK_TRANSPORT_FAILED",
          ),
        ),
      );
      req.end(body);
    });
  } finally {
    clearTimeout(timer);
  }
}
