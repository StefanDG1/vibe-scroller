import { Sandbox } from "e2b";
import { readFile, writeFile } from "node:fs/promises";
import { hardenSandbox } from "../packages/providers/isolation.ts";
const build = JSON.parse(
  await readFile(new URL("../infra/e2b-build.json", import.meta.url), "utf8"),
);
if (!build.verified) throw Error("Isolation evidence is required first.");
const sandbox = await Sandbox.create(build.pinnedTarget, {
  apiKey: process.env.E2B_API_KEY,
  allowInternetAccess: false,
  timeoutMs: 180000,
  metadata: { product: "vibescroller", purpose: "synthetic media acceptance" },
});
try {
  await hardenSandbox(sandbox);
  await sandbox.commands.run("mkdir -p /home/user/media", { user: "user" });
  await sandbox.files.write(
    "/home/user/media/decode.py",
    await readFile(
      new URL("../packages/media/decode.py", import.meta.url),
      "utf8",
    ),
    { user: "user" },
  );
  await sandbox.commands.run(
    "ffmpeg -nostdin -loglevel error -f lavfi -i testsrc2=size=320x240:rate=10 -f lavfi -i sine=frequency=440:sample_rate=16000 -t 8 -c:v libx264 -pix_fmt yuv420p -c:a aac -f mp4 /home/user/media/input",
    { user: "user", timeoutMs: 30000 },
  );
  await sandbox.commands.run("python3 /home/user/media/decode.py", {
    user: "user",
    timeoutMs: 90000,
  });
  const manifest = JSON.parse(
    await sandbox.files.read("/home/user/media/manifest.json"),
  );
  if (!(
    manifest.durationSeconds === 8 &&
    manifest.audio &&
    manifest.frames.length >= 2 &&
    manifest.frames.length <= 24 &&
    manifest.frames.every((f) => f.timestampMs >= 0 && f.timestampMs < 8000)
  ))
    throw Error("Invalid bounded media manifest.");
  await sandbox.files.write(
    "/home/user/media/input",
    "synthetic malformed media",
    { user: "user" },
  );
  let rejected = false;
  try {
    await sandbox.commands.run("python3 /home/user/media/decode.py", {
      user: "user",
      timeoutMs: 30000,
    });
  } catch {
    rejected = true;
  }
  if (!rejected) throw Error("Malformed media was accepted.");
  const evidence = {
    time: new Date().toISOString(),
    target: build.pinnedTarget,
    synthetic: true,
    frames: manifest.frames.length,
    audioExtracted: true,
    malformedRejected: rejected,
    providerInference: "not tested",
  };
  await writeFile(
    new URL("../infra/media-evidence.json", import.meta.url),
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(JSON.stringify(evidence));
} finally {
  await sandbox.kill();
  console.log("Media sandbox kill acknowledged.");
}
