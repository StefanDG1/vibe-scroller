import { Sandbox } from "@vercel/sandbox";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const token = process.env.VERCEL_OIDC_TOKEN ?? process.env.VERCEL_SANDBOX_TOKEN;
if (
  !token ||
  !process.env.VERCEL_SANDBOX_TEAM_ID ||
  !process.env.VERCEL_SANDBOX_PROJECT_ID
)
  throw Error("Dedicated project authorization missing");
const credentials = {
  token,
  projectId: process.env.VERCEL_SANDBOX_PROJECT_ID,
  teamId: process.env.VERCEL_SANDBOX_TEAM_ID,
};
const kind = process.argv[2];
if (!["media", "coding"].includes(kind)) throw Error("Use media or coding");
const base =
  "vercel/sandbox/universal@sha256:c77f7436b9bc0a8b01ef7b09dbcea2de6a18a9fe2aafa89996d2da193da72cf0";
const release = JSON.parse(readFileSync("infra/downloader.json", "utf8"));
let sandbox;
try {
  sandbox = await Sandbox.create({
    ...credentials,
    image: base,
    persistent: false,
    networkPolicy: {
      allow:
        kind === "media"
          ? ["archive.ubuntu.com", "security.ubuntu.com"]
          : ["registry.npmjs.org"],
      subnets: {
        deny: [
          "10.0.0.0/8",
          "127.0.0.0/8",
          "169.254.0.0/16",
          "172.16.0.0/12",
          "192.168.0.0/16",
        ],
      },
    },
    ports: [],
    resources: { vcpus: 2 },
    timeout: 300000,
    region: "fra1",
    failoverRegions: [],
    tags: { product: "vibescroller", class: "clean-tool-image" },
  });
  const install = await sandbox.runCommand({
    sudo: true,
    cmd: "bash",
    args: [
      "-c",
      kind === "coding"
        ? 'set -eu; npm install -g pnpm@12.3.4 --ignore-scripts --registry=https://registry.npmjs.org >/dev/null; test "$(pnpm --version)" = 12.3.4; node --version; pnpm --version; git --version'
        : "set -eu; sed -i 's#http://#https://#g' /etc/apt/sources.list.d/ubuntu.sources; apt-get update -qq; DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ffmpeg python3-pil iproute2 >/dev/null; rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*",
    ],
    timeoutMs: 200000,
  });
  if (install.exitCode !== 0) {
    console.log(
      JSON.stringify({
        installExit: install.exitCode,
        diagnostic: (await install.stderr()).slice(-1800),
      }),
    );
    throw Error("Clean image installation failed");
  }
  let versions = (await install.stdout()).trim();
  if (kind === "media") {
    const res = await fetch(release.url, {
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) throw Error("Downloader artifact unavailable");
    const bytes = Buffer.from(await res.arrayBuffer());
    if (
      bytes.length > 50_000_000 ||
      createHash("sha256").update(bytes).digest("hex") !== release.sha256
    )
      throw Error("Downloader artifact failed size or hash verification");
    await sandbox.writeFiles([
      { path: "/vercel/sandbox/yt-dlp", content: bytes },
    ]);
    const finish = await sandbox.runCommand({
      sudo: true,
      cmd: "bash",
      args: [
        "-c",
        `set -eu; install -m 755 /vercel/sandbox/yt-dlp /usr/local/bin/yt-dlp; rm -f /vercel/sandbox/yt-dlp; test "$(/usr/local/bin/yt-dlp --version)" = '${release.version}'; python3 -c 'from PIL import Image'; ffmpeg -version | head -1; node --version; pnpm --version`,
      ],
      timeoutMs: 20000,
    });
    if (finish.exitCode !== 0) throw Error("Tool image verification failed");
    versions = (await finish.stdout()).trim();
  }
  await sandbox.update({ networkPolicy: "deny-all" });
  const snapshot = await sandbox.snapshot({
    expiration: 7 * 24 * 60 * 60 * 1000,
  });
  const proof = {
    createdAt: new Date().toISOString(),
    snapshotId: snapshot.snapshotId,
    baseImage: base,
    region: "fra1",
    customerDataPresent: false,
    credentialsInVm: false,
    kind,
    downloadRelease: kind === "media" ? release : undefined,
    toolVersions: versions,
    expiresAfterDays: 7,
    verified: false,
  };
  writeFileSync(
    "private/vercel-" + kind + "-build.json",
    JSON.stringify(proof, null, 2),
  );
  console.log(JSON.stringify(proof));
} catch {
  console.error("Sandbox image build failed. Verification remains disabled.");
  process.exitCode = 1;
} finally {
  if (sandbox) {
    await sandbox.stop();
    await sandbox.delete();
    console.log(JSON.stringify({ stopped: true, deleted: true }));
  }
}
