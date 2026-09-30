import { Template, Sandbox } from "e2b";
import { readFile, writeFile } from "node:fs/promises";
import { hardenSandbox } from "../packages/providers/isolation.ts";
const file = new URL("../infra/e2b-build.json", import.meta.url),
  build = JSON.parse(await readFile(file, "utf8"));
const tag = `pinned-${build.buildId}`;
await Template.assignTags(`${build.name}:staging-v1`, tag, {
  apiKey: process.env.E2B_API_KEY,
});
const target = `${build.name}:${tag}`;
const sandboxes = [];
try {
  for (let i = 0; i < 2; i++)
    sandboxes.push(
      await Sandbox.create(target, {
        apiKey: process.env.E2B_API_KEY,
        secure: true,
        allowInternetAccess: false,
        timeoutMs: 180000,
        metadata: {
          product: "vibescroller",
          purpose: "synthetic isolation test",
        },
      }),
    );
  for (const sandbox of sandboxes) await hardenSandbox(sandbox);
  const s = sandboxes[0],
    other = sandboxes[1];
  const versions = [];
  for (const command of [
    "id -u",
    "node --version",
    "python3 --version",
    "ffmpeg -version",
    "git --version",
  ]) {
    const result = await s.commands.run(command, {
      user: "user",
      timeoutMs: 30000,
      requestTimeoutMs: 30000,
    });
    versions.push(result.stdout.split("\n")[0]);
    console.log(JSON.stringify({ tool: command, exit: result.exitCode }));
  }
  const tools = { stdout: versions.join("\n") };
  const canary = "synthetic isolation canary, no customer data";
  await s.files.write("/root/vibe-canary", canary, { user: "root" });
  await s.commands.run("chmod 600 /root/vibe-canary", {
    user: "root",
    timeoutMs: 5000,
  });
  await s.commands.run(
    "nohup python3 -m http.server 48765 --bind 127.0.0.1 >/tmp/vibe-test-server.log 2>&1 &",
    { user: "root", timeoutMs: 5000 },
  );
  const isolation = await s.commands.run(
    "python3 - <<'PY'\nimport os, pathlib, socket, subprocess, json\nchecks={}\nchecks['unprivileged']=os.getuid()!=0\nchecks['root_secret_denied']=not os.access('/root/vibe-canary',os.R_OK)\nchecks['host_mount_absent']=not pathlib.Path('/mnt/host').exists()\nchecks['no_provider_credentials']=not any(k in os.environ for k in ['E2B_API_KEY','OPENAI_API_KEY','GITHUB_APP_PRIVATE_KEY','CLOUDFLARE_AI_TOKEN','WORKOS_API_KEY'])\ntry: socket.create_connection(('1.1.1.1',443),timeout=3); checks['external_network_denied']=False\nexcept OSError: checks['external_network_denied']=True\ntry: socket.create_connection(('169.254.169.254',80),timeout=3); checks['metadata_network_denied']=False\nexcept OSError: checks['metadata_network_denied']=True\ntry: socket.create_connection(('127.0.0.1',48765),timeout=3); checks['trusted_loopback_denied']=False\nexcept OSError: checks['trusted_loopback_denied']=True\ntry: socket.create_connection(('127.0.0.1',49983),timeout=3); checks['control_service_denied']=False\nexcept OSError: checks['control_service_denied']=True\nstatus=pathlib.Path('/proc/self/status').read_text()\nchecks['no_effective_capabilities']=int(next(x.split(':')[1].strip() for x in status.splitlines() if x.startswith('CapEff:')),16)==0\nchecks['sudo_escalation_denied']=subprocess.run(['sh','-c','command -v sudo >/dev/null && sudo -n id -u'],capture_output=True).returncode!=0\nprint(json.dumps(checks))\nassert all(checks.values())\nPY",
    { user: "user", timeoutMs: 15000 },
  );
  const second = await other.commands.run(
    "test ! -e /root/vibe-canary && echo cross_sandbox_canary_absent",
    { user: "root", timeoutMs: 5000 },
  );
  build.isolationEvidence = {
    time: new Date().toISOString(),
    target,
    checks: JSON.parse(isolation.stdout.trim()),
    crossSandboxDenied: second.exitCode === 0,
    toolVersions: tools.stdout.trim(),
    synthetic: true,
  };
  build.verified =
    Object.values(build.isolationEvidence.checks).every(Boolean) &&
    build.isolationEvidence.crossSandboxDenied;
  build.pinnedTarget = target;
  await writeFile(file, JSON.stringify(build, null, 2) + "\n");
  console.log(JSON.stringify(build.isolationEvidence));
} finally {
  const cleanup = await Promise.allSettled(sandboxes.map((s) => s.kill()));
  console.log(
    JSON.stringify({
      cleanupAcknowledged: cleanup.every((r) => r.status === "fulfilled"),
      sandboxes: sandboxes.length,
    }),
  );
}
