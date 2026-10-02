import { it, expect } from "vitest";
import { prepareOfflineDependencies } from "../packages/providers/offline-dependencies";
import type { JobSandbox } from "../packages/providers/sandbox";

it("pnpm preparation has no network, hooks, lifecycle scripts, cache writes or version download", async () => {
  const commands: string[] = [];
  const sandbox = {
    commands: {
      run: async (command: string) => {
        commands.push(command);
        return { exitCode: 0, stdout: "", stderr: "" };
      },
    },
  } as unknown as JobSandbox;
  const files = [
    { path: "package.json", content: '{"packageManager":"pnpm@12.3.4"}' },
    { path: "pnpm-lock.yaml", content: "lockfileVersion: '9.0'" },
  ];
  await prepareOfflineDependencies(sandbox, files, ["grep owned README.md"]);
  expect(commands).toHaveLength(0);
  await prepareOfflineDependencies(sandbox, files, ["pnpm exec tsc --noEmit"]);
  expect(commands).toHaveLength(3);
  for (const flag of [
    "--offline",
    "--frozen-store",
    "--frozen-lockfile",
    "--ignore-scripts",
    "--ignore-pnpmfile",
    "--no-runtime",
    "--config.manage-package-manager-versions=false",
    "--config.verify-store-integrity=true",
  ])
    expect(commands[2]).toContain(flag);
  await expect(
    prepareOfflineDependencies(sandbox, [], ["pnpm test"]),
  ).rejects.toThrow("SETUP_REQUIRED");
  await expect(
    prepareOfflineDependencies(
      sandbox,
      [{ ...files[0], content: '{"packageManager":"pnpm@13.0.0"}' }, files[1]],
      ["pnpm test"],
    ),
  ).rejects.toThrow("SETUP_REQUIRED");
  expect(commands).toHaveLength(3);
});

it("missing cache or an offline package miss stops before the approved checks", async () => {
  let calls = 0;
  const sandbox = {
    commands: {
      run: async () => ({ exitCode: ++calls <= 2 ? 0 : 1 }),
    },
  } as unknown as JobSandbox;
  const files = [
    { path: "package.json", content: '{"packageManager":"pnpm@12.3.4"}' },
    { path: "pnpm-lock.yaml", content: "lockfileVersion: '9.0'" },
  ];
  await expect(
    prepareOfflineDependencies(sandbox, files, ["pnpm test"]),
  ).rejects.toThrow("no network, install scripts or fallback");
  expect(calls).toBe(3);
  await expect(
    prepareOfflineDependencies(sandbox, files, ["pnpm test"]),
  ).rejects.toThrow("no verified offline dependency cache");
  expect(calls).toBe(4);
});
