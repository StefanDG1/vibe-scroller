import { readFile, writeFile } from "node:fs/promises";
import { randomBytes, generateKeyPairSync, createHash } from "node:crypto";
import { vault } from "./vault.mjs";
const configPath = process.argv[2];
if (!configPath)
  throw new Error(
    "Usage: node packages/runner/pair.mjs /absolute/path/to/private-config.json",
  );
const config = JSON.parse(await readFile(configPath, "utf8"));
if (config.credentialTarget)
  throw new Error(
    "This configuration already has a device credential. Revoke and uninstall it before pairing again.",
  );
if (
  new URL(config.server).protocol !== "https:" ||
  typeof config.workspaceId !== "string" ||
  config.workspaceId.length < 10 ||
  typeof config.deviceName !== "string" ||
  config.deviceName.length < 1 ||
  config.deviceName.length > 80
)
  throw new Error("Set a valid HTTPS backend and device name first.");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const publicBytes = publicKey.export({ format: "der", type: "spki" });
const token = randomBytes(32).toString("base64url"),
  code = randomBytes(32).toString("base64url");
const target = `VibeScroller/device-${randomBytes(16).toString("hex")}`;
try {
  await vault(
    "write",
    target,
    JSON.stringify({
      credential: token,
      privateKey: privateKey.export({ format: "pem", type: "pkcs8" }),
    }),
  );
  config.credentialTarget = target;
  config.fingerprint = hash(publicBytes);
  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", {
    mode: 0o600,
  });
} catch (error) {
  await vault("delete", target);
  throw error;
}
console.log(
  "Paste this public request in your workspace Computers screen. Compare the fingerprint before confirming. It expires ten minutes after browser submission. No login token is printed.",
);
console.log(
  JSON.stringify(
    {
      workspaceId: config.workspaceId,
      name: config.deviceName,
      fingerprint: config.fingerprint,
      codeHash: hash(code),
      credentialHash: hash(token),
    },
    null,
    2,
  ),
);
