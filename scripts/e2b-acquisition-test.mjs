import { Template, Sandbox } from "e2b";
import { readFile, writeFile } from "node:fs/promises";
import { hardenAcquisition } from "../packages/providers/acquisition-isolation.ts";
import { hardenSandbox } from "../packages/providers/isolation.ts";
const file = new URL("../infra/e2b-acquisition-build.json", import.meta.url);
const build = JSON.parse(await readFile(file, "utf8"));
const target = `${build.name}:pinned-${build.buildId}`;
await Template.assignTags(
  `${build.name}:staging-v1-acquisition`,
  `pinned-${build.buildId}`,
  { apiKey: process.env.E2B_API_KEY },
);
const sandbox = await Sandbox.create(target, {
  apiKey: process.env.E2B_API_KEY,
  secure: true,
  allowInternetAccess: true,
  network: {
    allowOut: ["youtube.com", "*.youtube.com"],
    denyOut: ["0.0.0.0/0"],
  },
  timeoutMs: 180000,
  metadata: {
    product: "vibescroller",
    purpose: "synthetic acquisition isolation",
  },
});
try {
  await hardenAcquisition(sandbox);
  await sandbox.files.write("/root/vibe-canary", "synthetic canary", {
    user: "root",
  });
  await sandbox.commands.run("chmod 600 /root/vibe-canary", {
    user: "root",
    timeoutMs: 5000,
  });
  const result = await sandbox.commands.run(
    `python3 - <<'PY'
import os, json, socket, pathlib, urllib.request, urllib.error, subprocess
checks={}
checks['unprivileged']=os.getuid()!=0
checks['root_secret_denied']=not os.access('/root/vibe-canary',os.R_OK)
checks['host_mount_absent']=not pathlib.Path('/mnt/host').exists()
checks['no_provider_credentials']=not any(k in os.environ for k in ['E2B_API_KEY','OPENAI_API_KEY','GITHUB_APP_PRIVATE_KEY','WORKOS_API_KEY','STRIPE_SECRET_KEY'])
for name, host, port in [('mmds','169.254.169.254',80),('loopback_control','127.0.0.1',49983),('private','10.0.0.1',443),('ipv6_loopback','::1',443)]:
    try: socket.create_connection((host,port),timeout=2); checks[name+'_denied']=False
    except OSError: checks[name+'_denied']=True
try:
    with urllib.request.urlopen('https://www.youtube.com/robots.txt', timeout=10) as response:
        checks['allowed_host_response']=response.status==200 and b'User-agent' in response.read(10000)
except (OSError, urllib.error.URLError): checks['allowed_host_response']=False
try:
    with urllib.request.urlopen('https://example.com',timeout=10) as response:
        checks['unlisted_host_denied']=response.status!=200
except (OSError, urllib.error.URLError): checks['unlisted_host_denied']=True
checks['sudo_denied']=subprocess.run(['sh','-c','command -v sudo >/dev/null && sudo -n id -u'],capture_output=True).returncode!=0
checks['no_effective_capabilities']=int(next(x.split(':')[1].strip() for x in pathlib.Path('/proc/self/status').read_text().splitlines() if x.startswith('CapEff:')),16)==0
print(json.dumps(checks))
PY`,
    { user: "user", timeoutMs: 45000 },
  );
  const checks = JSON.parse(result.stdout);
  console.log(JSON.stringify({ stage: "network-isolation", checks }));
  if (!Object.values(checks).every(Boolean))
    throw Error("Acquisition isolation check failed.");
  await sandbox.updateNetwork({ allowOut: [], denyOut: ["0.0.0.0/0"] });
  await hardenSandbox(sandbox);
  const offline = await sandbox.commands.run(
    `python3 - <<'PY'
import socket, json
try: socket.create_connection(('1.1.1.1',443),timeout=2); denied=False
except OSError: denied=True
print(json.dumps({'decode_network_denied':denied}))
PY`,
    { user: "user", timeoutMs: 5000 },
  );
  const decodeChecks = JSON.parse(offline.stdout);
  if (!decodeChecks.decode_network_denied)
    throw Error("Decoder network remained accessible.");
  await sandbox.commands.run(
    "mkdir -p /home/user/acquisition-tests/packages/media /home/user/acquisition-tests/tests",
    { user: "user" },
  );
  await sandbox.files.write(
    "/home/user/acquisition-tests/packages/media/acquire.py",
    await readFile(
      new URL("../packages/media/acquire.py", import.meta.url),
      "utf8",
    ),
    { user: "user" },
  );
  await sandbox.files.write(
    "/home/user/acquisition-tests/tests/acquisition_worker_test.py",
    await readFile(
      new URL("../tests/acquisition_worker_test.py", import.meta.url),
      "utf8",
    ),
    { user: "user" },
  );
  await sandbox.commands.run(
    "python3 /home/user/acquisition-tests/tests/acquisition_worker_test.py",
    { user: "user", timeoutMs: 10000 },
  );
  await sandbox.commands.run(
    "mkdir -p /home/user/media && ffmpeg -nostdin -loglevel error -f lavfi -i testsrc2=size=320x240:rate=10 -f lavfi -i sine=frequency=440:sample_rate=16000 -t 8 -c:v libx264 -pix_fmt yuv420p -c:a aac -f mp4 /home/user/media/input",
    { user: "user", timeoutMs: 30000 },
  );
  await sandbox.files.write(
    "/home/user/media/decode.py",
    await readFile(
      new URL("../packages/media/decode-personal.py", import.meta.url),
      "utf8",
    ),
    { user: "user" },
  );
  await sandbox.commands.run("python3 /home/user/media/decode.py", {
    user: "user",
    timeoutMs: 60000,
  });
  const manifest = JSON.parse(
    await sandbox.files.read("/home/user/media/manifest.json"),
  );
  if (
    manifest.audio !== "audio.wav" ||
    manifest.frames.length < 2 ||
    manifest.durationSeconds !== 8
  )
    throw Error("Acquisition image PCM/frame check failed.");
  await sandbox.kill();
  build.pinnedTarget = target;
  build.verified = true;
  build.isolationEvidence = {
    time: new Date().toISOString(),
    synthetic: true,
    checks: { ...checks, ...decodeChecks },
    decodedFrames: manifest.frames.length,
    pcmAudio: true,
    workerBoundaryTests: 5,
    cleanupAcknowledged: true,
  };
  await writeFile(file, JSON.stringify(build, null, 2) + "\n");
  console.log(JSON.stringify(build.isolationEvidence));
} finally {
  await sandbox.kill();
}
