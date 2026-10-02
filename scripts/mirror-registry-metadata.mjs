// Runs only in a clean, registry-restricted operator build VM. Never receives
// customer lockfiles, credentials, source code or package lifecycle scripts.
import { readFileSync, mkdirSync, writeFileSync, linkSync } from "node:fs";
import { dirname } from "node:path";
const names = JSON.parse(readFileSync(process.argv[2], "utf8"));
if (
  !Array.isArray(names) ||
  names.length < 1 ||
  names.length > 1000 ||
  !names.every((name) => /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/.test(name))
)
  throw Error("Reviewed public package names required");
let cursor = 0,
  total = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (cursor < names.length) {
      const name = names[cursor++];
      const response = await fetch(
        "https://registry.npmjs.org/" + encodeURIComponent(name),
        {
          headers: { Accept: "application/json" },
          redirect: "error",
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!response.ok || !response.body)
        throw Error("Public registry metadata unavailable");
      const parts = [];
      let bytes = 0;
      const reader = response.body.getReader();
      try {
        while (true) {
          const item = await reader.read();
          if (item.done) break;
          bytes += item.value.byteLength;
          total += item.value.byteLength;
          if (bytes > 64 * 1024 * 1024 || total > 1024 * 1024 * 1024)
            throw Error("Public metadata exceeds reviewed size");
          parts.push(item.value);
        }
      } finally {
        await reader.cancel();
        reader.releaseLock();
      }
      const metadata = JSON.parse(Buffer.concat(parts).toString("utf8"));
      if (
        metadata.name !== name ||
        !metadata.versions ||
        typeof metadata.versions !== "object"
      )
        throw Error("Public metadata identity mismatch");
      const file =
        "/opt/vibe/pnpm-metadata/v11/metadata-full/registry.npmjs.org/" +
        name +
        ".jsonl";
      const abbreviated = file.replace("/metadata-full/", "/metadata/");
      mkdirSync(dirname(file), { recursive: true });
      mkdirSync(dirname(abbreviated), { recursive: true });
      writeFileSync(
        file,
        JSON.stringify({
          etag: response.headers.get("etag"),
          modified: response.headers.get("last-modified"),
        }) +
          "\n" +
          JSON.stringify(metadata) +
          "\n",
      );
      linkSync(file, abbreviated);
    }
  }),
);
console.log(
  JSON.stringify({ publicMetadataPackages: names.length, bytes: total }),
);
