import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
function parse(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [
          l.slice(0, i).trim(),
          l
            .slice(i + 1)
            .trim()
            .replace(/^(["'])(.*)\1$/, "$2"),
        ];
      }),
  );
}
const source = resolve(root, ".env.local"),
  target = resolve(root, "apps/starter/.env.local");
if (!existsSync(source)) {
  console.error(
    "Run pnpm convex:dev first, then add WORKOS_CLIENT_ID and WORKOS_API_KEY to the ignored root .env.local.",
  );
  process.exit(1);
}
const env = parse(readFileSync(source, "utf8"));
const existing = existsSync(target) ? parse(readFileSync(target, "utf8")) : {};
const values = {
  NEXT_PUBLIC_CONVEX_URL: env.CONVEX_URL || env.NEXT_PUBLIC_CONVEX_URL,
  WORKOS_CLIENT_ID: env.WORKOS_CLIENT_ID,
  WORKOS_API_KEY: env.WORKOS_API_KEY,
  WORKOS_COOKIE_PASSWORD:
    existing.WORKOS_COOKIE_PASSWORD || randomBytes(32).toString("hex"),
  NEXT_PUBLIC_WORKOS_REDIRECT_URI: "http://localhost:3001/callback",
  APP_URL: "http://localhost:3001",
};
const missing = Object.entries(values)
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length) {
  console.error(
    "Missing settings: " +
      missing.join(", ") +
      ". Add them to root .env.local. No values were printed.",
  );
  process.exit(1);
}
writeFileSync(
  target,
  Object.entries(values)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n") + "\n",
  { mode: 0o600 },
);
console.log(
  "Prepared ignored apps/starter/.env.local. Existing session secret preserved. Restart the starter.",
);
