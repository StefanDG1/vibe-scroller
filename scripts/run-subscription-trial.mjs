import { readFile, writeFile, realpath, lstat } from "node:fs/promises";
import { resolve, sep, join } from "node:path";
import {
  analyzeSubscriptionTrial,
  checkTrialBundle,
} from "../packages/runner/subscription-trial.mjs";
try {
  const base = resolve("private"),
    path = resolve(process.argv[2] ?? "");
  if (
    (await realpath(base)) !== base ||
    !path.startsWith(base + sep) ||
    (await realpath(path)) !== path ||
    (await lstat(path)).size > 500000
  )
    throw Error("SUBSCRIPTION_PRIVATE_PATH_INVALID");
  const bundle = JSON.parse(await readFile(path, "utf8"));
  checkTrialBundle(bundle);
  const session = JSON.parse(
    await readFile(join(base, "subscription-session.json"), "utf8"),
  );
  const result = await analyzeSubscriptionTrial(bundle, session, {
    claimAttempt: (sourceId) =>
      writeFile(
        join(base, `subscription-attempt-${bundle.trialId}-${sourceId}.json`),
        JSON.stringify({
          trialId: bundle.trialId,
          sourceId,
          bundleHash: bundle.bundleHash,
          startedAt: Date.now(),
          state: "usage_unknown_until_result",
        }),
        { flag: "wx", mode: 0o600 },
      ),
  });
  const output = join(base, `subscription-result-${bundle.trialId}.json`);
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(bundle.trialId))
    throw Error("SUBSCRIPTION_TRIAL_INVALID");
  await writeFile(output, JSON.stringify(result, null, 2), {
    flag: "wx",
    mode: 0o600,
  });
  console.log(
    JSON.stringify({
      status: "completed",
      posts: result.results.length,
      output,
      appComputeCredits: 0,
      paidApiFallback: false,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      status: "stopped",
      code: /^SUBSCRIPTION_[A-Z_]+$/.test(error.message)
        ? error.message
        : "SUBSCRIPTION_TRANSPORT_OR_VALIDATION",
      paidApiFallback: false,
    }),
  );
  process.exitCode = 1;
}
