import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
// Run only in the dedicated staging checkout. No key material or raw CLI errors are printed.
if (process.env.CONVEX_DEPLOYMENT !== "dev:resolute-ladybug-999")
  throw Error("Dedicated staging deployment required.");
const cli = "node_modules/convex/bin/main.js";
const call = (args) =>
  execFileSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
try {
  let raw = readFileSync(".env.local", "utf8");
  const prior = raw.match(/^SECRET_KEY_2=["']?([^"'\r\n]+)["']?$/m)?.[1];
  const key = prior ?? randomBytes(32).toString("base64");
  if (!prior) raw += `\nSECRET_KEY_2="${key}"\n`;
  raw = raw.replace(/^SECRET_KEY_VERSION=.*$/gm, 'SECRET_KEY_VERSION="2"');
  if (!/^SECRET_KEY_VERSION=/m.test(raw)) raw += '\nSECRET_KEY_VERSION="2"\n';
  writeFileSync(".env.local", raw);
  call(["env", "set", "SECRET_KEY_2", key]);
  call(["env", "set", "SECRET_KEY_VERSION", "2"]);
  const result = JSON.parse(call(["run", "credentialRotation:rotate", "{}"]));
  console.log(
    JSON.stringify({
      rotated: true,
      migrated: result.migrated,
      oldKeyRetired: false,
    }),
  );
  if (process.env.RETIRE_OLD_ENCRYPTION_KEY === "true") {
    // Rerun the CAS migration before retirement; fail closed on any remaining old ciphertext.
    call(["run", "credentialRotation:rotate", "{}"]);
    const check = JSON.parse(call(["run", "credentialRotation:status", "{}"]));
    if (check.oldVersions !== 0) throw Error("Historical ciphertext remains.");
    call(["env", "remove", "SECRET_KEY_1"]);
    for (const path of [
      ".env.local",
      "apps/starter/.env.local",
      "apps/marketing/.env.local",
    ]) {
      if (!existsSync(path)) continue;
      let contents = readFileSync(path, "utf8").replace(
        /^SECRET_KEY_1=.*\r?\n?/gm,
        "",
      );
      if (path === ".env.local")
        contents = contents.replace(
          /^SECRET_KEY_VERSION=.*$/gm,
          'SECRET_KEY_VERSION="2"',
        );
      writeFileSync(path, contents);
    }
    console.log(JSON.stringify({ oldKeyRetired: true, oldVersions: 0 }));
  }
} catch {
  console.error(
    "Encryption rotation incomplete. Inspect redacted status; retain the old key until migration is confirmed.",
  );
  process.exitCode = 1;
}
