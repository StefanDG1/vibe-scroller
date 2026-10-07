import { afterEach, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { createHmac } from "node:crypto";
const dns = vi.hoisted(() => vi.fn());
const https = vi.hoisted(() => vi.fn());
vi.mock("node:dns/promises", () => ({ lookup: dns }));
vi.mock("node:https", () => ({ request: https }));
import {
  webhookUrl,
  publicWebhookAddress,
  webhookKey,
  webhookHeaders,
  challengeMatches,
  sendWebhook,
} from "../packages/mcp/webhook";
afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});
const secret = "whsec_" + Buffer.alloc(32, 7).toString("base64");
it("signs exact Standard Webhooks bytes with stable event ID and fresh attempt timestamp, including bounded rotation", () => {
  const body = JSON.stringify({
    eventId: "event-synthetic",
    name: "analysis_completed",
    data: { sourceId: "selected" },
    cursor: null,
  });
  const first = webhookHeaders(
    "event-synthetic",
    body,
    [secret],
    "subscription-synthetic",
    1700000000000,
  );
  const expected = createHmac("sha256", Buffer.alloc(32, 7))
    .update(`event-synthetic.1700000000.${body}`)
    .digest("base64");
  expect(first["webhook-signature"]).toBe("v1," + expected);
  const retry = webhookHeaders(
    "event-synthetic",
    body,
    [secret],
    "subscription-synthetic",
    1700000010000,
  );
  expect(retry["webhook-id"]).toBe(first["webhook-id"]);
  expect(retry["webhook-signature"]).not.toBe(first["webhook-signature"]);
  const rotated = webhookHeaders(
    "event-synthetic",
    body,
    [secret, "whsec_" + Buffer.alloc(32, 8).toString("base64")],
    "subscription-synthetic",
    1700000000000,
  );
  expect(rotated["webhook-signature"].split(" ")).toHaveLength(2);
  expect(() =>
    webhookHeaders("event-synthetic", body, [secret], "bad\r\nheader"),
  ).toThrow();
  expect(() =>
    webhookHeaders("event-synthetic", "x".repeat(262145), [secret]),
  ).toThrow();
});
it("requires a bounded actual signing key and exact verification response without accepting malformed text", () => {
  expect(webhookKey(secret)).toHaveLength(32);
  expect(webhookKey(secret.replace(/=+$/, ""))).toHaveLength(32);
  for (const invalid of [
    "whsec_",
    "whsec_" + Buffer.alloc(23).toString("base64"),
    "whsec_" + Buffer.alloc(65).toString("base64"),
    "whsec_invalid!",
  ])
    expect(() => webhookKey(invalid)).toThrow();
  const bytes = (s: string) => new TextEncoder().encode(s);
  expect(
    challengeMatches(bytes('{"challenge":"single-use"}'), "single-use"),
  ).toBe(true);
  for (const body of [
    '{"challenge":"wrong"}',
    '{"challenge":5}',
    "{}",
    "invalid",
  ])
    expect(challengeMatches(bytes(body), "single-use")).toBe(false);
  expect(challengeMatches(new Uint8Array([255]), "single-use")).toBe(false);
});
it("rejects nonpublic, mapped, transition and documentation addresses and callback URL credential/fragment tricks", () => {
  for (const ip of [
    "127.0.0.1",
    "10.1.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "192.0.2.1",
    "192.88.99.1",
    "::1",
    "fc00::1",
    "::ffff:8.8.8.8",
    "2002:7f00:1::1",
    "2001:db8::1",
    "3fff::1",
  ])
    expect(publicWebhookAddress(ip), ip).toBe(false);
  expect(publicWebhookAddress("1.1.1.1")).toBe(true);
  expect(publicWebhookAddress("2606:4700:4700::1111")).toBe(true);
  for (const url of [
    "http://receiver.example/event",
    "https://receiver.example:444/event",
    "https://user:password@receiver.example/event",
    "https://receiver.example/event#fragment",
    "https://127.0.0.1/event",
    "https://[::1]/event",
    "https://receiver.example/\n",
  ])
    expect(() => webhookUrl(url)).toThrow();
  expect(webhookUrl("https://receiver.example/event").hostname).toBe(
    "receiver.example",
  );
});
function response(
  status = 200,
  data = Buffer.from('{"challenge":"current"}'),
  headers: Record<string, string> = {},
) {
  https.mockImplementation((url, options, callback) => {
    const req = new EventEmitter() as EventEmitter & {
      end: (body: string) => void;
    };
    req.end = () => {
      const res = new EventEmitter() as EventEmitter & {
        statusCode: number;
        headers: Record<string, string>;
        destroy: () => void;
      };
      res.statusCode = status;
      res.headers = headers;
      res.destroy = () => {};
      callback(res);
      queueMicrotask(() => {
        res.emit("data", data);
        res.emit("end");
      });
    };
    return req;
  });
}
it("pins the validated address at connection time and rejects every mixed/private DNS answer before network dispatch", async () => {
  dns.mockResolvedValue([{ address: "1.1.1.1", family: 4 }]);
  response();
  const result = await sendWebhook(
    "https://receiver.example/event",
    "{}",
    webhookHeaders("verify-synthetic", "{}", [secret]),
  );
  expect(result.status).toBe(200);
  expect(dns).toHaveBeenCalledOnce();
  const [url, options] = https.mock.calls[0];
  expect(url.hostname).toBe("receiver.example");
  expect(options.agent).toBe(false);
  const pin = vi.fn();
  options.lookup("receiver.example", { all: false }, pin);
  expect(pin).toHaveBeenCalledWith(null, "1.1.1.1", 4);
  dns.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
  options.lookup("receiver.example", { all: false }, pin);
  expect(pin).toHaveBeenLastCalledWith(null, "1.1.1.1", 4);
  expect(dns).toHaveBeenCalledOnce();
  https.mockClear();
  dns.mockResolvedValue([
    { address: "1.1.1.1", family: 4 },
    { address: "10.0.0.1", family: 4 },
  ]);
  await expect(
    sendWebhook("https://receiver.example/event", "{}", {}),
  ).rejects.toThrow("CALLBACK_DNS_DENIED");
  expect(https).not.toHaveBeenCalled();
});
it("revalidates DNS per delivery and rejects redirects or response bounds", async () => {
  dns.mockResolvedValue([{ address: "1.1.1.1", family: 4 }]);
  response(302, Buffer.alloc(0), { location: "https://127.0.0.1/private" });
  await expect(
    sendWebhook("https://receiver.example/event", "{}", {}),
  ).rejects.toThrow("CALLBACK_REDIRECT_DENIED");
  expect(https).toHaveBeenCalledOnce();
  response(200, Buffer.alloc(0), { "content-length": "4097" });
  await expect(
    sendWebhook("https://receiver.example/event", "{}", {}),
  ).rejects.toThrow("CALLBACK_RESPONSE_DENIED");
  expect(dns).toHaveBeenCalledTimes(2);
  dns.mockResolvedValue([{ address: "10.0.0.1", family: 4 }]);
  https.mockClear();
  await expect(
    sendWebhook("https://receiver.example/event", "{}", {}),
  ).rejects.toThrow("CALLBACK_DNS_DENIED");
  expect(https).not.toHaveBeenCalled();
});
it("bounds stalled DNS without opening a connection", async () => {
  vi.useFakeTimers();
  dns.mockImplementation(() => new Promise(() => {}));
  const result = sendWebhook("https://receiver.example/event", "{}", {});
  const rejected = expect(result).rejects.toThrow("CALLBACK_TIMEOUT");
  await vi.advanceTimersByTimeAsync(10000);
  await rejected;
  expect(https).not.toHaveBeenCalled();
});

it("bounds response streams and honors terminal 410/413 before consuming oversized bodies", async () => {
  dns.mockResolvedValue([{ address: "1.1.1.1", family: 4 }]);
  response(200, Buffer.alloc(4097));
  await expect(
    sendWebhook("https://receiver.example/event", "{}", {}),
  ).rejects.toThrow("CALLBACK_RESPONSE_DENIED");
  for (const status of [410, 413]) {
    response(status, Buffer.alloc(50000), { "content-length": "50000" });
    expect(
      (await sendWebhook("https://receiver.example/event", "{}", {})).status,
    ).toBe(status);
  }
});

it("checks current authority after DNS and bounds a stalled last-minute authorization fence", async () => {
  dns.mockResolvedValue([{ address: "1.1.1.1", family: 4 }]);
  const fence = vi.fn(async () => false);
  await expect(
    sendWebhook("https://receiver.example/event", "{}", {}, fence),
  ).rejects.toThrow("CALLBACK_AUTHORITY_CHANGED");
  expect(fence).toHaveBeenCalledOnce();
  expect(https).not.toHaveBeenCalled();
  vi.useFakeTimers();
  const result = sendWebhook(
    "https://receiver.example/event",
    "{}",
    {},
    () => new Promise(() => {}),
  );
  const rejection = expect(result).rejects.toThrow("CALLBACK_TIMEOUT");
  await vi.advanceTimersByTimeAsync(10000);
  await rejection;
  expect(https).not.toHaveBeenCalled();
});

it("records delivery receipt from HTTP status without retaining an unnecessary oversized response body", async () => {
  dns.mockResolvedValue([{ address: "1.1.1.1", family: 4 }]);
  response(204, Buffer.alloc(50000), { "content-length": "50000" });
  const result = await sendWebhook(
    "https://receiver.example/event",
    "{}",
    {},
    async () => true,
    true,
  );
  expect(result.status).toBe(204);
  expect(result.body.byteLength).toBe(0);
  response(200, Buffer.alloc(50000), { "content-length": "50000" });
  await expect(
    sendWebhook("https://receiver.example/verify", "{}", {}),
  ).rejects.toThrow("CALLBACK_RESPONSE_DENIED");
});
