import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, copyFile, realpath, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
const execute = promisify(execFile),
  base = resolve("private");
if ((await realpath(base)) !== base)
  throw Error("SUBSCRIPTION_PRIVATE_PATH_INVALID");
const images = {};
for (const [name, files] of [
  ["media", ["acquire.py", "decode-personal.py", "public_proxy.py"]],
  ["codex", ["public_proxy.py"]],
]) {
  const directory = join(base, `subscription-${name}-image`);
  await mkdir(directory, { recursive: false, mode: 0o700 }).catch((e) => {
    if (e.code !== "EEXIST") throw e;
  });
  if ((await realpath(directory)) !== directory)
    throw Error("SUBSCRIPTION_PRIVATE_PATH_INVALID");
  for (const file of files)
    await copyFile(resolve("packages/media", file), join(directory, file));
  if (name === "media")
    await copyFile(
      resolve("infra/downloader.json"),
      join(directory, "downloader.json"),
    );
  await copyFile(
    resolve(`infra/subscription-${name}.Dockerfile`),
    join(directory, "Dockerfile"),
  );
  // No repository-wide build context, host mounts, provider secrets or build args.
  await execute(
    "docker",
    ["build", "--tag", `vibescroller-subscription-${name}:local`, directory],
    { windowsHide: true, timeout: 600000, maxBuffer: 2000000 },
  );
  images[name] = (
    await execute(
      "docker",
      [
        "image",
        "inspect",
        "--format",
        "{{.Id}}",
        `vibescroller-subscription-${name}:local`,
      ],
      { windowsHide: true, timeout: 20000 },
    )
  ).stdout.trim();
  console.log(
    JSON.stringify({ image: name, status: "built", digest: images[name] }),
  );
}
await writeFile(
  join(base, "subscription-images.json"),
  JSON.stringify(images),
  { mode: 0o600 },
);
