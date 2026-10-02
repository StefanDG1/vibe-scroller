import { Template } from "e2b";
import { readFile, writeFile } from "node:fs/promises";
const downloaderRelease = JSON.parse(
  await readFile(new URL("../infra/downloader.json", import.meta.url), "utf8"),
);
const base = JSON.parse(
  await readFile(new URL("../infra/base-image.json", import.meta.url), "utf8"),
);
if (!process.env.E2B_API_KEY) throw Error("A dedicated E2B key is required.");
// Build-time binary verification; the runtime has no package manager access.
const dockerfile = `FROM ${base.image}@${base.digest}
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pil ffmpeg ca-certificates curl nftables libcap2-bin && rm -rf /var/lib/apt/lists/*
RUN curl --fail --location --max-time 120 ${downloaderRelease.url} -o /usr/local/bin/yt-dlp && echo '${downloaderRelease.sha256}  /usr/local/bin/yt-dlp' | sha256sum --check && chmod 755 /usr/local/bin/yt-dlp && test "$(/usr/local/bin/yt-dlp --version)" = '${downloaderRelease.version}'
RUN useradd --create-home --uid 1000 user || true
WORKDIR /home/user
USER user
`;
const build = await Template.build(
  new Template().fromDockerfile(dockerfile),
  "vibescroller-v1-acquisition",
  {
    apiKey: process.env.E2B_API_KEY,
    cpuCount: 2,
    memoryMB: 4096,
    tags: ["staging-v1-acquisition"],
    onBuildLogs: (log) => {
      if (log.level === "error")
        console.log("Acquisition image build reported an error.");
    },
  },
);
await writeFile(
  new URL("../infra/e2b-acquisition-build.json", import.meta.url),
  JSON.stringify(
    {
      ...build,
      baseImage: base,
      downloader: downloaderRelease,
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
    built: true,
  }),
);
