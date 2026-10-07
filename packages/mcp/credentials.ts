import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { assistantResource } from "../policy/assistant";
export type EventPrincipal = {
  subject: string;
  clientId: string;
  consentId: string;
};
export type EventCredentials = {
  token: string;
  callback: string;
  secret: string;
};
function encryptionKey(version: string) {
  if (!/^[1-9][0-9]{0,2}$/.test(version)) throw Error("EVENT_KEY_UNAVAILABLE");
  const key = Buffer.from(
    process.env[`MCP_EVENT_SECRET_KEY_${version}`] ?? "",
    "base64",
  );
  if (key.length !== 32) throw Error("EVENT_KEY_UNAVAILABLE");
  return key;
}
function aad(p: EventPrincipal, version: string) {
  return JSON.stringify([
    assistantResource,
    "completion-webhook",
    p.subject,
    p.clientId,
    p.consentId,
    version,
  ]);
}
export function sealEventCredentials(
  credentials: EventCredentials,
  p: EventPrincipal,
) {
  const version = process.env.MCP_EVENT_SECRET_KEY_VERSION ?? "1",
    key = encryptionKey(version),
    iv = randomBytes(12);
  try {
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from(aad(p, version)));
    const data = Buffer.concat([
      cipher.update(JSON.stringify(credentials), "utf8"),
      cipher.final(),
    ]);
    return {
      ciphertext: [iv, cipher.getAuthTag(), data]
        .map((b) => b.toString("base64"))
        .join("."),
      keyVersion: version,
    };
  } finally {
    key.fill(0);
  }
}
export function openEventCredentials(
  envelope: { ciphertext: string; keyVersion: string },
  p: EventPrincipal,
): EventCredentials {
  const key = encryptionKey(envelope.keyVersion);
  try {
    if (envelope.ciphertext.length > 30000) throw Error();
    const parts = envelope.ciphertext.split(".");
    if (parts.length !== 3) throw Error();
    const [iv, tag, data] = parts.map((v) => Buffer.from(v, "base64"));
    if (iv.length !== 12 || tag.length !== 16) throw Error();
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(Buffer.from(aad(p, envelope.keyVersion)));
    decipher.setAuthTag(tag);
    const value = JSON.parse(
      Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8"),
    );
    if (
      typeof value.token !== "string" ||
      value.token.length > 16384 ||
      typeof value.callback !== "string" ||
      value.callback.length > 4096 ||
      typeof value.secret !== "string" ||
      value.secret.length > 100 ||
      Object.keys(value).sort().join(",") !== "callback,secret,token"
    )
      throw Error();
    return value;
  } catch {
    throw Error("EVENT_CREDENTIALS_UNAVAILABLE");
  } finally {
    key.fill(0);
  }
}
