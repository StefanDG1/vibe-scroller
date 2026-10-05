import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { subscriptionConfig } from "../packages/runner/subscription-trial.mjs";
import { AppServer } from "../packages/runner/app-server.mjs";
const exec = promisify(execFile),
  image = JSON.parse(
    await readFile(resolve("private/subscription-images.json"), "utf8"),
  ).codex,
  prefix = "vibe-trial-" + randomUUID(),
  worker = prefix + "-codex",
  proxy = prefix + "-proxy",
  socket = prefix + "-socket";
const run = async (args) =>
  (
    await exec("docker", args, {
      windowsHide: true,
      timeout: 20000,
      maxBuffer: 200000,
    })
  ).stdout.trim();
if (!/^sha256:[a-f0-9]{64}$/.test(image))
  throw Error("SUBSCRIPTION_IMAGE_INVALID");
let server;
try {
  await run([
    "volume",
    "create",
    "--driver",
    "local",
    "--opt",
    "type=tmpfs",
    "--opt",
    "device=tmpfs",
    "--opt",
    "o=size=1m,uid=0,gid=1001,mode=0770",
    socket,
  ]);
  await run([
    "run",
    "-d",
    "--rm",
    "--name",
    proxy,
    "--read-only",
    "--cap-drop",
    "ALL",
    "--cap-add",
    "CHOWN",
    "--security-opt",
    "no-new-privileges",
    "--user",
    "0:0",
    "--memory",
    "128m",
    "--cpus",
    "0.5",
    "--pids-limit",
    "32",
    "--tmpfs",
    "/root:rw,noexec,nosuid,size=1m",
    "--mount",
    `type=volume,source=${socket},target=/run`,
    image,
    "python3",
    "-c",
    "import pathlib,time,runpy,threading,os;threading.Timer(2700,lambda:os._exit(0)).start();\nwhile not pathlib.Path('/root/ready').exists(): time.sleep(.1)\nrunpy.run_path('/opt/vibe/public_proxy.py',run_name='__main__')",
  ]);
  await run([
    "exec",
    proxy,
    "python3",
    "-c",
    "import pathlib,sys;pathlib.Path('/root/vibe-public-policy.json').write_text(sys.argv[1]);pathlib.Path('/root/ready').touch()",
    JSON.stringify({
      domains: ["auth.openai.com", "chatgpt.com", "api.openai.com"],
    }),
  ]);
  await run([
    "run",
    "-d",
    "--rm",
    "--name",
    worker,
    "--network",
    "none",
    "--read-only",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--group-add",
    "1001",
    "--memory",
    "1g",
    "--cpus",
    "2",
    "--pids-limit",
    "96",
    "--tmpfs",
    "/tmp:rw,exec,nosuid,nodev,size=64m",
    "--tmpfs",
    "/home/node/auth:rw,exec,nosuid,nodev,size=32m,uid=1000,gid=1000",
    "--tmpfs",
    "/home/node/evidence:rw,noexec,nosuid,size=1m,uid=1000,gid=1000",
    "--mount",
    `type=volume,source=${socket},target=/run,readonly`,
    "-e",
    "CODEX_HOME=/home/node/auth",
    "-e",
    "HTTPS_PROXY=http://127.0.0.1:47891",
    "-e",
    "HTTP_PROXY=http://127.0.0.1:47891",
    image,
    "node",
    "-e",
    "setTimeout(()=>process.exit(0),2700000)",
  ]);
  await run([
    "exec",
    "-d",
    worker,
    "socat",
    "TCP-LISTEN:47891,bind=127.0.0.1,reuseaddr,fork",
    "UNIX-CONNECT:/run/vibe-public.sock",
  ]);
  const configs = subscriptionConfig;
  server = new AppServer("docker", [
    "exec",
    "-i",
    worker,
    "codex",
    "app-server",
    "--listen",
    "stdio://",
    ...configs.flatMap((c) => ["-c", c]),
  ]);
  let loginResolve;
  const loggedIn = new Promise((r) => (loginResolve = r));
  server.onEvent((m) => {
    if (m.id !== undefined) server.deny(m);
    if (m.method === "account/login/completed") {
      console.log(
        JSON.stringify({ loginCompleted: m.params.success === true }),
      );
      loginResolve(m.params.success === true);
    }
  });
  await server.request("initialize", {
    clientInfo: { name: "vibescroller_trial", version: "0.1.0" },
    capabilities: { experimentalApi: true },
  });
  server.send({ method: "initialized", params: {} });
  await writeFile(
    resolve("private/subscription-session.json"),
    JSON.stringify({
      worker,
      proxy,
      socket,
      image,
      expiresAt: Date.now() + 1800000,
    }),
    { mode: 0o600 },
  );
  const login = await server.request("account/login/start", {
    type: "chatgptDeviceCode",
  });
  console.log(
    JSON.stringify({
      verificationUrl: login.verificationUrl,
      userCode: login.userCode,
    }),
  );
  const success = await Promise.race([
    loggedIn,
    new Promise((r) => setTimeout(() => r(false), 900000)),
  ]);
  if (!success) throw Error("LOGIN_NOT_COMPLETED");
  const account = await server.account();
  if (account.account?.type !== "chatgpt" || !account.account.email)
    throw Error("LOGIN_NOT_COMPLETED");
  const profileBinding = createHash("sha256")
    .update(account.account.email)
    .digest("hex");
  await writeFile(
    resolve("private/subscription-session.json"),
    JSON.stringify({
      worker,
      proxy,
      socket,
      image,
      profileBinding,
      expiresAt: Date.now() + 1800000,
    }),
    { mode: 0o600 },
  );
  console.log(JSON.stringify({ status: "own_account_connected", worker }));
  // Keep only this ephemeral official-client session for the bounded trial.
  await new Promise((r) => setTimeout(r, 1800000));
} catch (e) {
  console.log(
    JSON.stringify({
      status: "blocked",
      code: /^LOGIN_[A-Z_]+$/.test(e.message)
        ? e.message
        : "SUBSCRIPTION_SESSION_SETUP_FAILED",
    }),
  );
  process.exitCode = 1;
} finally {
  server?.close();
  for (const name of [worker, proxy])
    await run(["rm", "-f", name]).catch(() => {});
  await run(["volume", "rm", socket]).catch(() => {});
}
