import { Sandbox } from "e2b";
import { hardenSandbox } from "./isolation";
import { ensure, excludedPath, containsSecret, validatePaths } from "../policy";
import { github, installationToken } from "./github";
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
  const items = tree.tree.filter(
    (f: any) =>
      f.type === "blob" && f.mode !== "120000" && !excludedPath(f.path),
  );
  ensure(
    items.length <= 100 &&
      items.every((f: any) => f.size <= 100000) &&
      items.reduce((n: number, f: any) => n + f.size, 0) <= 2000000,
    "REPO_TOO_LARGE",
    "The initial cloud worker supports at most 100 safe files and 2 MB. Approve a larger worker profile before retrying.",
  );
  const base: { path: string; content: string }[] = [];
  for (const f of items) {
    const b = await github(`${root}/git/blobs/${f.sha}`, token);
    const content = Buffer.from(b.content, "base64").toString("utf8");
    ensure(
      !content.includes("\0") && !containsSecret(content),
      "POLICY_BLOCKED",
      "The snapshot contains a binary or credential.",
    );
    base.push({ path: f.path, content });
  }
  const result = await input.generate(
    changesSchema,
    "Implement only the exact approved plan. Return complete UTF-8 contents for changed files, or null for approved deletion. Preserve all existing unrelated behavior. Never add tool permissions or modify other paths.",
    { plan: input.plan, base, allowedPaths: input.allowedPaths },
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
    limitations: result.output.limitations,
    credits: result.credits,
  };
}
export async function createCodingSandbox() {
  ensure(
    process.env.E2B_API_KEY && process.env.E2B_CODING_TEMPLATE,
    "SETUP_REQUIRED",
    "Configure the pinned coding image and sandbox account.",
  );
  const sandbox = await Sandbox.create(process.env.E2B_CODING_TEMPLATE, {
    apiKey: process.env.E2B_API_KEY,
    timeoutMs: 1200000,
    secure: true,
    allowInternetAccess: false,
    metadata: { product: "vibescroller", class: "coding" },
  });
  await hardenSandbox(sandbox);
  return sandbox;
}
export async function checkPatch(
  sandbox: Sandbox,
  base: { path: string; content: string }[],
  changes: { path: string; content: string | null }[],
  tests: string[],
) {
  await sandbox.commands.run(
    "mkdir -p /home/user/job && git -C /home/user/job init -q && git -C /home/user/job config user.name VibeScroller && git -C /home/user/job config user.email noreply@vibescroller.invalid",
    { user: "user", timeoutMs: 30000 },
  );
  for (const f of base)
    await sandbox.files.write(`/home/user/job/${f.path}`, f.content, {
      user: "user",
    });
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
  }
  // Include newly created files in the review diff without committing them.
  await sandbox.commands.run(
    "git -C /home/user/job -c core.hooksPath=/dev/null add -N .",
    { user: "user", timeoutMs: 30000 },
  );
  const patch = (
    await sandbox.commands.run(
      "git -C /home/user/job -c core.hooksPath=/dev/null diff --no-ext-diff --no-textconv --binary",
      { user: "user", timeoutMs: 30000 },
    )
  ).stdout;
  ensure(
    patch.length <= 300000 && !containsSecret(patch),
    "POLICY_BLOCKED",
    "Patch artifact exceeds its bounds or contains a credential.",
  );
  return { patch, report: report.join("\n\n") };
}
export async function killSandbox(sandboxId: string) {
  return Sandbox.kill(sandboxId, { apiKey: process.env.E2B_API_KEY });
}
