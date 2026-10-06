import { expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  sessionDeadline,
  workerExpiryScript,
} from "../packages/runner/session-lifetime.mjs";

it("keeps cleanup alive after the last client handle closes", () => {
  const moduleUrl = pathToFileURL(
    resolve("packages/runner/session-lifetime.mjs"),
  ).href;
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import {waitForSessionExpiry} from ${JSON.stringify(moduleUrl)};try{await waitForSessionExpiry(Date.now()+40,new Promise(()=>{}))}finally{console.log('cleanup reached')}`,
    ],
    { encoding: "utf8", timeout: 5000, windowsHide: true },
  );
  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe("cleanup reached");
  expect(result.stderr).not.toContain("unsettled top-level await");
});

it("uses a fixed bounded deadline and stops the worker at that same deadline", () => {
  expect(sessionDeadline(4 * 3600000, 1000)).toBe(14401000);
  expect(() => sessionDeadline(4 * 3600000 + 1)).toThrow(
    "SUBSCRIPTION_SESSION_LIFETIME_INVALID",
  );
  expect(() => workerExpiryScript(NaN)).toThrow(
    "SUBSCRIPTION_SESSION_LIFETIME_INVALID",
  );
  const result = spawnSync(process.execPath, ["-e", workerExpiryScript(1)], {
    encoding: "utf8",
    timeout: 5000,
    windowsHide: true,
  });
  expect(result.status).toBe(0);
});
