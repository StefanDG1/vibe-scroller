import { build } from "vite";
import { builtinModules } from "node:module";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
// Bundle the existing TypeScript policies instead of maintaining weaker CLI
// copies. All generated files and retained media stay in the ignored directory.
try {
  const path = resolve(process.argv[2] ?? "");
  if ((await stat(path)).size > 10000)
    throw Error("LOCAL_PREPARATION_CONFIG_INVALID");
  const request = JSON.parse(await readFile(path, "utf8"));
  await build({
    configFile: false,
    logLevel: "error",
    build: {
      outDir: "private/subscription-tools",
      emptyOutDir: false,
      minify: false,
      lib: {
        entry: "packages/runner/local-preparation.mjs",
        formats: ["es"],
        fileName: () => "local-preparation.mjs",
      },
      rollupOptions: {
        external: [
          ...builtinModules,
          ...builtinModules.map((m) => `node:${m}`),
          "zod",
          "convex/values",
        ],
      },
    },
  });
  const { prepareLocalUrl } = await import(
    pathToFileURL(resolve("private/subscription-tools/local-preparation.mjs"))
  );
  const result = await prepareLocalUrl(request);
  console.log(JSON.stringify(result));
  if (result.status !== "prepared") process.exitCode = 2;
} catch (error) {
  console.error(
    JSON.stringify({
      status: "stopped",
      reason: error?.name ?? "Error",
      code:
        typeof error?.code === "string"
          ? error.code
          : "LOCAL_PREPARATION_FAILED",
      cloudProcessing: false,
    }),
  );
  process.exitCode = 1;
}
