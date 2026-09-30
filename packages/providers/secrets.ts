import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ensure } from "../policy";
function key(version: string) {
  const raw = process.env[`SECRET_KEY_${version}`];
  ensure(raw, "SETUP_REQUIRED", "Secret encryption is not configured.");
  const k = Buffer.from(raw, "base64");
  ensure(k.length === 32, "SETUP_REQUIRED", "Invalid encryption key.");
  return k;
}
export function encrypt(secret: string, workspace: string, provider: string) {
  const version = process.env.SECRET_KEY_VERSION ?? "1",
    iv = randomBytes(12),
    c = createCipheriv("aes-256-gcm", key(version), iv);
  c.setAAD(Buffer.from(`${workspace}:${provider}:${version}`));
  const data = Buffer.concat([c.update(secret, "utf8"), c.final()]);
  return {
    ciphertext: [iv, c.getAuthTag(), data]
      .map((b) => b.toString("base64"))
      .join("."),
    keyVersion: version,
  };
}
export function decrypt(
  ciphertext: string,
  version: string,
  workspace: string,
  provider: string,
) {
  const [iv, tag, data] = ciphertext
    .split(".")
    .map((x) => Buffer.from(x, "base64"));
  const c = createDecipheriv("aes-256-gcm", key(version), iv);
  c.setAAD(Buffer.from(`${workspace}:${provider}:${version}`));
  c.setAuthTag(tag);
  return Buffer.concat([c.update(data), c.final()]).toString("utf8");
}
