import { createJobSandbox, stopJobSandbox, type JobSandbox } from "./sandbox";
import { hardenSandbox } from "./isolation";
import { ensure, containsSecret, validatePaths } from "../policy";
import { github, installationToken, repositoryArchive } from "./github";
import { inspectedIgnorePolicy } from "../repositories/prepare";
import { archiveSnapshot } from "../repositories/archive";
import { reviewedCloudPatch } from "../repositories/reviewPatch";
const changesSchema = {
  type: "object",
  additionalProperties: false,
  required: ["files", "limitations"],
  properties: {
    files: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path", "content"],
        properties: {
          path: { type: "string" },
          content: { type: ["string", "null"] },
        },
      },
    },
    limitations: { type: "array", items: { type: "string" } },
  },
};
export async function codeChanges(input: {
  repo: { installationId: number; fullName: string };
  baseSha: string;
  plan: any;
  allowedPaths: string[];
  highRisk: boolean;
  maxCredits: number;
  generate: (
    schema: unknown,
    prompt: string,
    input: unknown,
    maxOutput: number,
  ) => Promise<{ output: any; credits: number }>;
}) {
  const token = await installationToken(input.repo.installationId),
    root = `/repos/${input.repo.fullName}`;
  const tree = await github(
    `${root}/git/trees/${input.baseSha}?recursive=1`,
    token,
  );
  ensure(
    !tree.truncated,
    "REPO_TOO_LARGE",
    "The repository needs a reviewed larger snapshot quote.",
  );
  const ignored = await inspectedIgnorePolicy(tree.tree, async (sha) => {
    const blob = await github(`${root}/git/blobs/${sha}`, token);
    return Buffer.from(blob.content, "base64").toString("utf8");
  });
  ensure(
    input.allowedPaths.every((path) => !ignored(path)),
    "POLICY_BLOCKED",
    "An approved path is excluded by the repository ignore policy.",
  );
  const items = tree.tree.filter(
    (f: any) =>
      f.type === "blob" &&
      ["100644", "100755"].includes(f.mode) &&
      !ignored(f.path) &&
      !/\.(png|jpe?g|gif|webp|ico|pdf|zip|xlsx?|woff2?|ttf|mp[34]|wav)$/i.test(
        f.path,
      ),
  );
  ensure(
    items.length <= 2048 &&
      items.every((f: any) => f.size <= 1000000) &&
      items.reduce((n: number, f: any) => n + f.size, 0) <= 20000000,
    "REPO_TOO_LARGE",
    "The cloud worker supports at most 2,048 safe text files, 1 MB per file and 20 MB total. Binary files and symlinks require another reviewed profile.",
  );
  const { base, omitted } = archiveSnapshot(
    await repositoryArchive(input.repo.fullName, input.baseSha, token),
    items.map((file: any) => ({
      path: file.path,
      blobSha: file.sha,
      mode: file.mode,
      size: file.size,
    })),
    input.allowedPaths,
  );
  const result = await input.generate(
    changesSchema,
    "Implement only the exact approved plan. Return complete UTF-8 contents for changed files, or null for approved deletion. Preserve all existing unrelated behavior. Never add tool permissions or modify other paths.",
    {
      plan: input.plan,
      base: base.filter(
        (file) =>
          input.allowedPaths.includes(file.path) ||
          ["README.md", "package.json"].includes(file.path),
      ),
      allowedPaths: input.allowedPaths,
    },
    4000,
  );
  validatePaths(
    result.output.files.map((f: any) => f.path),
    input.allowedPaths,
    input.highRisk,
  );
  ensure(
    result.output.files.every(
      (f: any) =>
        f.content === null ||
        (f.content.length <= 100000 && !containsSecret(f.content)),
    ),
    "POLICY_BLOCKED",
    "Generated files contain a credential or exceed their bounds.",
  );
  return {
    base,
    changes: result.output.files as { path: string; content: string | null }[],
    limitations: [
      ...result.output.limitations,
      ...(omitted.length
        ? [
            `The isolated text snapshot excluded ${omitted.length} binary or credential-bearing files. Checks requiring those files cannot establish full repository coverage. Omitted paths: ${omitted.join(", ")}`,
          ]
        : []),
    ],
    credits: result.credits,
  };
}
export async function createCodingSandbox(maxSeconds = 1200) {
  ensure(
    process.env.CLOUD_VERIFIED === "true",
    "SETUP_REQUIRED",
    "Configure the pinned coding image and sandbox account.",
  );
  ensure(
    Number.isSafeInteger(maxSeconds) && maxSeconds >= 30 && maxSeconds <= 1200,
    "QUOTE_CHANGED",
    "Review the bounded execution time.",
  );
  const sandbox = await createJobSandbox("coding", maxSeconds);
  await hardenSandbox(sandbox);
  return sandbox;
}
export async function checkPatch(
  sandbox: JobSandbox,
  base: { path: string; content: string; mode?: string }[],
  changes: { path: string; content: string | null }[],
  tests: string[],
) {
  // The review artifact comes from trusted input, never guest Git output.
  const patch = reviewedCloudPatch(base, changes);
  await sandbox.commands.run(
    "mkdir -p /home/user/job && git -C /home/user/job init -q && git -C /home/user/job config user.name VibeScroller && git -C /home/user/job config user.email noreply@vibescroller.invalid",
    { user: "user", timeoutMs: 30000 },
  );
  for (let offset = 0; offset < base.length; offset += 100)
    await sandbox.files.write(
      base
        .slice(offset, offset + 100)
        .map((f) => ({ path: `/home/user/job/${f.path}`, data: f.content })),
      { user: "user" },
    );
  const preserveExecutableModes = async (removed = new Set<string>()) => {
    const paths = base
      .filter((file) => file.mode === "100755" && !removed.has(file.path))
      .map((file) => `/home/user/job/${file.path}`);
    for (let offset = 0; offset < paths.length; offset += 100)
      await sandbox.commands.run(
        `chmod 755 -- ${paths
          .slice(offset, offset + 100)
          .map((path) => "'" + path.replaceAll("'", "'\\''") + "'")
          .join(" ")}`,
        { user: "user", timeoutMs: 30000 },
      );
  };
  await preserveExecutableModes();
  await sandbox.commands.run(
    "git -C /home/user/job -c core.hooksPath=/dev/null add . && git -C /home/user/job -c core.hooksPath=/dev/null commit -qm baseline",
    { user: "user", timeoutMs: 30000 },
  );
  for (const f of changes) {
    if (f.content === null)
      await sandbox.files.remove(`/home/user/job/${f.path}`, { user: "user" });
    else
      await sandbox.files.write(`/home/user/job/${f.path}`, f.content, {
        user: "user",
      });
  }
  // Exclude explicitly deleted paths before applying modes again.
  const removed = new Set(
    changes.filter((file) => file.content === null).map((file) => file.path),
  );
  await preserveExecutableModes(removed);
  const expected = new Map<
    string,
    { path: string; content: string | null; mode?: string; executable: boolean }
  >(
    base.map((file) => [
      file.path,
      { ...file, executable: file.mode === "100755" },
    ]),
  );
  for (const file of changes)
    expected.set(file.path, {
      ...file,
      mode: undefined,
      executable:
        base.find((original) => original.path === file.path)?.mode === "100755",
    });
  await sandbox.verifySnapshot([...expected.values()]);
  const report: string[] = [];
  for (const command of tests.slice(0, 10)) {
    ensure(
      command.length <= 1000,
      "INVALID_INPUT",
      "Test command exceeds its bound.",
    );
    const result = await sandbox.commands
      .run(command, {
        cwd: "/home/user/job",
        user: "user",
        timeoutMs: 90000,
      })
      .catch((error: any) => {
        if (typeof error.exitCode === "number")
          return {
            exitCode: error.exitCode,
            stdout: String(error.stdout ?? ""),
            stderr: String(error.stderr ?? "Check failed"),
          };
        throw error;
      });
    report.push(
      `Exit ${result.exitCode}: ${command}\n${result.stdout.slice(-1500)}\n${result.stderr.slice(-1500)}`,
    );
    // A check may create build outputs, but cannot rewrite the tested sources.
    await sandbox.verifySnapshot([...expected.values()]);
  }
  return { patch, report: report.join("\n\n") };
}
export async function killSandbox(sandboxId: string) {
  return stopJobSandbox(sandboxId);
}
