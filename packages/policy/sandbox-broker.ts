import { z } from "zod";
const envelope = z
  .object({
    purpose: z.literal("vibescroller-sandbox-credentials"),
    at: z.number().int(),
    nonce: z.string().regex(/^[a-f0-9]{32}$/),
  })
  .strict();
const encoder = new TextEncoder();
async function key(secret: string) {
  if (!/^[a-f0-9]{64}$/.test(secret))
    throw Error("Sandbox broker is not configured.");
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
export async function signSandboxRequest(body: string, secret: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.sign("HMAC", await key(secret), encoder.encode(body)),
    ),
  ]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
export async function verifySandboxRequest(
  body: string,
  signature: string,
  secret: string,
  now = Date.now(),
) {
  if (body.length > 256 || !/^[a-f0-9]{64}$/.test(signature)) return null;
  try {
    const request = envelope.parse(JSON.parse(body));
    if (request.at > now + 5000 || request.at < now - 30000) return null;
    const bytes = new Uint8Array(
      signature.match(/../g)!.map((x) => parseInt(x, 16)),
    );
    return (await crypto.subtle.verify(
      "HMAC",
      await key(secret),
      bytes,
      encoder.encode(body),
    ))
      ? request
      : null;
  } catch {
    return null;
  }
}
