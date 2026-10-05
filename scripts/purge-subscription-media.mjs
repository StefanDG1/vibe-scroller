import { purgeLocalPreparation } from "../packages/runner/local-media-retention.mjs";
try {
  const directory = process.argv[2];
  let result = await purgeLocalPreparation(directory);
  if (process.argv.includes("--wait") && !result.purged) {
    if (result.expiresAt - Date.now() > 86400000)
      throw Error("LOCAL_RETENTION_MARKER_INVALID");
    await new Promise((r) =>
      setTimeout(r, Math.max(0, result.expiresAt - Date.now())),
    );
    result = await purgeLocalPreparation(directory);
  }
  console.log(JSON.stringify(result));
} catch {
  console.error(
    "Local cleanup stopped. Only the verified task directory can be cleaned.",
  );
  process.exitCode = 1;
}
