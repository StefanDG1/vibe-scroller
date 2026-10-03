import { expect, it } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  copyFileSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { resolve, join, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { parseEnv } from "node:util";
it("prepares a clean account config without discarding existing settings or rotating a session on rerun", () => {
  const parent = resolve("private");
  mkdirSync(parent, { recursive: true });
  const dir = mkdtempSync(join(parent, "setup-unit-"));
  if (!dir.startsWith(parent + sep)) throw Error("Unsafe test cleanup target");
  try {
    mkdirSync(join(dir, "scripts"));
    mkdirSync(join(dir, "apps/starter"), { recursive: true });
    for (const name of ["setup-local.mjs", "setup-preflight.mjs"])
      copyFileSync(join("scripts", name), join(dir, "scripts", name));
    writeFileSync(
      join(dir, ".env.local"),
      'CONVEX_URL=https://synthetic.convex.cloud\nWORKOS_CLIENT_ID=client_Synthetic\nWORKOS_API_KEY="synthetic\\nvalue"\n',
    );
    writeFileSync(
      join(dir, "apps/starter/.env.local"),
      'OPTIONAL_SETTING="retained value"\n',
    );
    const run = () =>
      spawnSync(process.execPath, [join(dir, "scripts/setup-local.mjs")], {
        encoding: "utf8",
      });
    const first = run();
    expect(first.status).toBe(0);
    expect(first.stdout + first.stderr).not.toContain("synthetic\\nvalue");
    const target = join(dir, "apps/starter/.env.local");
    const config = parseEnv(readFileSync(target, "utf8"));
    expect(config.OPTIONAL_SETTING).toBe("retained value");
    expect(config.WORKOS_API_KEY).toBe("synthetic\nvalue");
    expect(config.WORKOS_COOKIE_PASSWORD).toHaveLength(64);
    expect(run().status).toBe(0);
    expect(parseEnv(readFileSync(target, "utf8")).WORKOS_COOKIE_PASSWORD).toBe(
      config.WORKOS_COOKIE_PASSWORD,
    );
    writeFileSync(
      join(dir, ".env.local"),
      "CONVEX_URL=https://evil.invalid\nWORKOS_CLIENT_ID=client_Synthetic\nWORKOS_API_KEY=synthetic\n",
    );
    const before = readFileSync(target, "utf8");
    expect(run().status).toBe(1);
    expect(readFileSync(target, "utf8")).toBe(before);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
