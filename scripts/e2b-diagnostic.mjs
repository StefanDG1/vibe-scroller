import { Sandbox } from "e2b";
import { readFile } from "node:fs/promises";
import { hardenSandboxCommand } from "../packages/providers/isolation.ts";
const build = JSON.parse(
  await readFile(new URL("../infra/e2b-build.json", import.meta.url), "utf8"),
);
let sandbox;
try {
  const started = Date.now();
  sandbox = await Sandbox.create(`${build.name}:pinned-${build.buildId}`, {
    apiKey: process.env.E2B_API_KEY,
    secure: true,
    allowInternetAccess: false,
    timeoutMs: 90000,
    requestTimeoutMs: 30000,
    metadata: { product: "vibescroller", purpose: "failed command diagnostic" },
  });
  console.log(
    JSON.stringify({
      created: true,
      seconds: (Date.now() - started) / 1000,
      templateId: (await sandbox.getInfo()).templateId,
      running: await sandbox.isRunning(),
    }),
  );
  try {
    await sandbox.commands.run(hardenSandboxCommand, {
      user: "root",
      timeoutMs: 30000,
    });
    console.log("OS hardening applied");
  } catch (e) {
    console.log(
      JSON.stringify({
        hardeningFailure: true,
        exit: e.exitCode,
        stderr: String(e.stderr ?? "").slice(0, 1000),
      }),
    );
  }
  for (const [user, command] of [
    ["root", "id -u; command -v iptables; command -v nft; ls /etc/sudoers.d"],
    [
      "user",
      "python3 - <<'PY'\nimport socket, json\nfor host,port in [('1.1.1.1',443),('169.254.169.254',80)]:\n try:\n  s=socket.create_connection((host,port),timeout=3); s.sendall(b'GET / HTTP/1.0\\r\\nHost: isolation.invalid\\r\\n\\r\\n'); response=s.recv(500); print(json.dumps({'host':host,'response':response.decode('ascii','replace')}));s.close()\n except OSError as e: print(json.dumps({'host':host,'error':type(e).__name__}))\nPY",
    ],
  ]) {
    try {
      const result = await sandbox.commands.run(command, {
        user,
        timeoutMs: 30000,
        requestTimeoutMs: 30000,
      });
      console.log(
        JSON.stringify({
          user,
          exit: result.exitCode,
          stdout: result.stdout.trim(),
        }),
      );
    } catch (e) {
      console.log(JSON.stringify({ user, error: e.constructor.name }));
    }
  }
} finally {
  if (sandbox) {
    await sandbox.kill();
    console.log("Diagnostic sandbox kill acknowledged.");
  }
}
