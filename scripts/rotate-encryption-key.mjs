import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
// Staging only. Provider ciphertext and key material never enter stdout or raw CLI errors.
if (process.env.CONVEX_DEPLOYMENT !== "dev:resolute-ladybug-999")
  throw Error("Dedicated staging deployment required.");
const cli = "node_modules/convex/bin/main.js";
const call = (args) =>
  execFileSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
const envValue = (raw, name) => {
  const values = [
    ...raw.matchAll(new RegExp(`^${name}=["']?([^"'\\r\\n]+)["']?\\r?$`, "gm")),
  ];
  if (values.length !== 1) throw Error("Unique local configuration required.");
  return values[0][1];
};
const setLocal = (raw, name, value) => {
  const expression = new RegExp(`^${name}=.*\\r?$`, "gm");
  return expression.test(raw)
    ? raw.replace(expression, `${name}="${value}"`)
    : `${raw}\n${name}="${value}"\n`;
};
try {
  let raw = readFileSync(".env.local", "utf8");
  const previousVersion = envValue(raw, "SECRET_KEY_VERSION");
  const nextVersion =
    process.env.NEXT_SECRET_KEY_VERSION ?? String(Number(previousVersion) + 1);
  if (
    !/^\d{1,4}$/.test(previousVersion) ||
    !/^\d{1,4}$/.test(nextVersion) ||
    Number(nextVersion) <= Number(previousVersion)
  )
    throw Error("A newer numeric version is required.");
  if (call(["env", "get", "SECRET_KEY_VERSION"]).trim() !== previousVersion)
    throw Error("Local and remote key versions differ.");
  if (
    call(["env", "get", `SECRET_KEY_${previousVersion}`]).trim() !==
    envValue(raw, `SECRET_KEY_${previousVersion}`)
  )
    throw Error("Local recovery key differs from the staging key.");
  const before = JSON.parse(call(["run", "credentialRotation:status", "{}"]));
  if (before.unreadable !== 0)
    throw Error("Repair unreadable credentials before rotation.");
  const name = `SECRET_KEY_${nextVersion}`;
  const existing = new RegExp(`^${name}=`, "m").test(raw);
  const key = existing
    ? envValue(raw, name)
    : randomBytes(32).toString("base64");
  if (Buffer.from(key, "base64").length !== 32)
    throw Error("Invalid replacement key.");
  // Save the replacement before the first remote write so a partial failure is recoverable.
  raw = setLocal(raw, name, key);
  writeFileSync(".env.local", raw);
  call(["env", "set", name, key]);
  call(["env", "set", "SECRET_KEY_VERSION", nextVersion]);
  raw = setLocal(raw, "SECRET_KEY_VERSION", nextVersion);
  writeFileSync(".env.local", raw);
  const result = JSON.parse(call(["run", "credentialRotation:rotate", "{}"]));
  const status = JSON.parse(call(["run", "credentialRotation:status", "{}"]));
  if (status.oldVersions !== 0 || status.unreadable !== 0)
    throw Error("Migration verification failed.");
  console.log(
    JSON.stringify({
      rotated: true,
      previousVersion,
      currentVersion: nextVersion,
      migrated: result.migrated,
      checked: status.checked,
      unreadable: status.unreadable,
      oldVersions: status.oldVersions,
      oldKeyRetired: false,
    }),
  );
  // Keep old keys for in-flight actions and recovery. Retirement is a separate operation,
  // never a change to another app's local environment or the serving production deployment.
} catch {
  console.error(
    "Encryption rotation incomplete. Retain all keys and inspect the redacted deployment status before retrying.",
  );
  process.exitCode = 1;
}
