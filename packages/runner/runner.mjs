import { readFile, realpath, writeFile, unlink } from "node:fs/promises";
import { parse, resolve, dirname, sep } from "node:path";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { vault } from "./vault.mjs";
import { RunnerTransport } from "./transport.mjs";
import { executeJob } from "./runtime.mjs";
const configPath = process.argv[2];
if (!configPath)
  throw new Error(
    "Usage: node packages/runner/runner.mjs /absolute/path/to/private-config.json",
  );
const config = JSON.parse(await readFile(configPath, "utf8"));
if (
  process.platform !== "win32" ||
  config.protocolVersion !== "1.0.0" ||
  config.codexVersion !== "0.142.3"
)
  throw new Error(
    "Only the pinned Windows runner protocol is supported by this package.",
  );
if (
  !config.isolation?.adapter ||
  !config.isolation.adapterSha256 ||
  !config.isolation.verifiedEvidence ||
  config.credentialVaultAdapter !== "windows-credential-manager" ||
  !config.credentialTarget ||
  !config.workspaceId
)
  throw new Error(
    "Execution blocked: pair this device and supply reviewed Windows isolation evidence and adapter. A worktree does not satisfy isolation.",
  );
const serverURL = new URL(config.server);
if (
  serverURL.protocol !== "https:" ||
  !serverURL.hostname.endsWith(".convex.site") ||
  serverURL.username ||
  serverURL.password
)
  throw new Error("Use the dedicated HTTPS Convex backend URL.");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const adapterFile = await realpath(config.isolation.adapter),
  evidenceFile = await realpath(config.isolation.verifiedEvidence);
const evidenceBytes = await readFile(evidenceFile),
  evidence = JSON.parse(evidenceBytes.toString("utf8")),
  evidenceHash = sha(evidenceBytes);
const adapterBytes = await readFile(adapterFile);
const checks = [
  "write_boundary",
  "home_secret_denial",
  "unrelated_repository_denial",
  "network_policy",
  "descendant_termination",
  "snapshot_symlink_denial",
  "credential_separation",
  "official_codex_auth",
  "hook_denial",
];
if (
  sha(adapterBytes) !== config.isolation.adapterSha256 ||
  evidence.adapterSha256 !== config.isolation.adapterSha256 ||
  evidence.platform !== "win32" ||
  evidence.codexVersion !== config.codexVersion ||
  evidence.schemaVersion !== "1.0.0" ||
  !checks.every((key) => evidence.checks?.[key] === true) ||
  Date.parse(evidence.validUntil) <= Date.now() ||
  !Number.isFinite(Date.parse(evidence.validUntil))
)
  throw new Error(
    "Execution blocked: isolation evidence is missing, expired or does not bind this exact adapter.",
  );
for (const mapping of config.repositories) {
  const root = await realpath(mapping.directory),
    normalized = root.toLowerCase();
  if (
    normalized === parse(root).root.toLowerCase() ||
    normalized === process.env.USERPROFILE?.toLowerCase() ||
    root.startsWith("\\\\")
  )
    throw new Error("Repository root mapping is forbidden.");
  if (
    [adapterFile, evidenceFile].some((file) =>
      file.toLowerCase().startsWith(normalized + sep),
    )
  )
    throw new Error(
      "Isolation code/evidence cannot live inside an untrusted repository.",
    );
  const result = await promisify(execFile)(
    "git",
    [
      "-c",
      "core.hooksPath=NUL",
      "-c",
      "core.fsmonitor=false",
      "-C",
      root,
      "config",
      "--get",
      "remote.origin.url",
    ],
    { windowsHide: true, timeout: 10000, maxBuffer: 4000 },
  );
  const remote = result.stdout.trim().replace(/\.git$/, ""),
    expected = `https://github.com/${mapping.fullName}`;
  if (remote !== expected && remote !== `git@github.com:${mapping.fullName}`)
    throw new Error(
      "Mapped directory does not have the expected GitHub remote. No repository or credential was changed.",
    );
  mapping.directory = root;
}
// Reviewed adapters must be bundled, immutable ESM. Import the exact hashed bytes,
// so a replacement between verification and import cannot execute another file.
const adapter = await import(
  `data:text/javascript;base64,${adapterBytes.toString("base64")}`
);
if (
  !["prepare", "check", "terminate", "collect"].every(
    (key) => typeof adapter[key] === "function",
  )
)
  throw new Error("Isolation adapter is incomplete.");
const stored = await vault("read", config.credentialTarget);
if (!stored.secret)
  throw new Error("Pair this computer before starting the runner.");
const localCredential = JSON.parse(stored.secret);
const transport = new RunnerTransport(
  config.server,
  localCredential.credential,
);
const status = await transport.request("status");
if (status.workspaceId !== config.workspaceId)
  throw new Error("Device credential belongs to another workspace.");
const statePath = resolve(dirname(configPath), "vibescroller-run-state.json");
const persist = async (value) => {
  if (value === null) {
    await unlink(statePath).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
    return;
  }
  await writeFile(statePath, JSON.stringify(value), { mode: 0o600 });
};
let prior;
try {
  const bytes = await readFile(statePath);
  if (bytes.length > 2000) throw new Error("Invalid local run state.");
  prior = JSON.parse(bytes.toString("utf8"));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
if (prior) {
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(prior.handle))
    throw new Error("Invalid isolated recovery handle.");
  const receipt = await adapter.terminate(prior.handle);
  if (receipt?.terminated !== true)
    throw new Error(
      "Prior isolated worker termination is unconfirmed. New dispatch remains blocked.",
    );
  if (status.activeRunId === prior.jobId)
    await transport.request("fail", {
      id: prior.jobId,
      generation: prior.generation,
      terminated: true,
    });
  await persist(null);
} else if (status.activeRunId)
  throw new Error(
    "Server reports a prior worker without a local recovery record. Operator reconciliation is required.",
  );
const abort = new AbortController();
process.once("SIGINT", () => abort.abort());
process.once("SIGTERM", () => abort.abort());
console.log(
  "Runner connected. Authentication stays local. Only approved, fenced jobs for mapped repositories can execute.",
);
while (!abort.signal.aborted) {
  const reply = await transport.request("poll");
  if (reply.blocked)
    throw new Error(
      "Server isolation or dispatch gate is closed. Complete its reviewed setup before retrying.",
    );
  if (reply.reconcile)
    throw new Error(
      "A prior worker needs confirmed termination. Restart for reconciliation; never run a duplicate attempt.",
    );
  if (reply.lease)
    await executeJob({
      lease: reply.lease,
      config,
      evidenceHash,
      adapter,
      transport,
      signal: abort.signal,
      persist,
    });
  else
    await new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        abort.signal.removeEventListener("abort", done);
        resolve();
      };
      const timer = setTimeout(done, 15000);
      abort.signal.addEventListener("abort", done, { once: true });
    });
}
console.log("Runner stopped.");
