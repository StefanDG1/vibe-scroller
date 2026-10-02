import type { JobSandbox } from "./sandbox";
import { ensure } from "../policy";

// Only previously reviewed public packages enter the clean tools image.
// Customer repositories never get online installation or a mutable shared cache.
export async function prepareOfflineDependencies(
  sandbox: JobSandbox,
  files: { path: string; content: string | null }[],
  tests: string[],
) {
  if (!tests.some((command) => /\bpnpm\b/.test(command))) return;
  const manifest = files.find((file) => file.path === "package.json")?.content;
  const lock = files.find((file) => file.path === "pnpm-lock.yaml")?.content;
  ensure(
    manifest && lock && Buffer.byteLength(lock) <= 1000000,
    "SETUP_REQUIRED",
    "pnpm checks require a bounded committed package.json and pnpm-lock.yaml.",
  );
  const pkg = JSON.parse(manifest);
  ensure(
    pkg.packageManager === "pnpm@12.3.4",
    "SETUP_REQUIRED",
    "This worker requires the reviewed pnpm 12.3.4 tool profile. Export the plan or prepare a compatible verified profile.",
  );
  const cached = await sandbox.commands.run(
    "test -r /opt/vibe/foundation-cache.sha256 && test -d /opt/vibe/pnpm-store",
    { user: "user", timeoutMs: 10000 },
  );
  ensure(
    cached.exitCode === 0,
    "SETUP_REQUIRED",
    "The selected coding image has no verified offline dependency cache.",
  );
  const metadata = await sandbox.commands.run(
    "mkdir -p /home/user/.cache/pnpm/v11 && cp -r /opt/vibe/pnpm-metadata/v11/metadata /opt/vibe/pnpm-metadata/v11/metadata-full /home/user/.cache/pnpm/v11/",
    { user: "user", timeoutMs: 30000 },
  );
  ensure(
    metadata.exitCode === 0,
    "SETUP_REQUIRED",
    "The reviewed public registry metadata is unavailable.",
  );
  const installed = await sandbox.commands.run(
    "pnpm install --offline --frozen-store --frozen-lockfile --ignore-scripts --ignore-pnpmfile --no-runtime --store-dir /opt/vibe/pnpm-store --config.package-import-method=copy --config.manage-package-manager-versions=false --config.package-manager-strict=false --config.verify-store-integrity=true --reporter=append-only",
    { user: "user", cwd: "/home/user/job", timeoutMs: 120000 },
  );
  ensure(
    installed.exitCode === 0,
    "SETUP_REQUIRED",
    "Offline dependency preparation failed. The manifest/lockfile must agree and every required package must exist in the reviewed cache; no network, install scripts or fallback was used.",
  );
}
