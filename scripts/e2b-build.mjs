import { Template, Sandbox } from "e2b";
import { readFile, writeFile } from "node:fs/promises";
const base = JSON.parse(
  await readFile(new URL("../infra/base-image.json", import.meta.url), "utf8"),
);
if (!process.env.E2B_API_KEY)
  throw Error("A dedicated staging E2B key is required.");
const dockerfile = `FROM ${base.image}@${base.digest}\nRUN apt-get update && apt-get install -y --no-install-recommends git python3 python3-pil ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*\nRUN npm install -g pnpm@12.3.4\nRUN useradd --create-home --uid 1000 user || true\nWORKDIR /home/user\nUSER user\n`;
const build = await Template.build(
  new Template().fromDockerfile(dockerfile),
  "vibescroller-v1-node24-media",
  {
    apiKey: process.env.E2B_API_KEY,
    cpuCount: 2,
    memoryMB: 4096,
    tags: ["staging-v1"],
    onBuildLogs: (log) => {
      if (log.level === "error")
        console.log("Template build reported an error.");
    },
  },
);
await writeFile(
  new URL("../infra/e2b-build.json", import.meta.url),
  JSON.stringify(
    {
      ...build,
      baseImage: base,
      createdAt: new Date().toISOString(),
      verified: false,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    templateId: build.templateId,
    buildId: build.buildId,
    name: build.name,
    built: true,
  }),
);
