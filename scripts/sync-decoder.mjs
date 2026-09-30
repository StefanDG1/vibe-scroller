import { readFile, writeFile } from "node:fs/promises";
const source = await readFile(
  new URL("../packages/media/decode.py", import.meta.url),
  "utf8",
);
await writeFile(
  new URL("../packages/media/decoder.ts", import.meta.url),
  "// Generated from decode.py for the Convex Node bundle. Regenerate with scripts/sync-decoder.mjs.\nexport const decoder = " +
    JSON.stringify(source) +
    ";\n",
);
