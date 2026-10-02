import { expect, it, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { publish } from "../packages/providers/github";
import { reviewedCloudPatch } from "../packages/repositories/reviewPatch";

it("preserves trusted executable modes and rejects symbolic links before writing GitHub objects", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  vi.stubEnv("GITHUB_APP_ID", "1");
  vi.stubEnv(
    "GITHUB_APP_PRIVATE_KEY",
    privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  );
  const writes: any[] = [];
  let mode = "100755";
  const baseSha = "a".repeat(40);
  vi.stubGlobal("fetch", async (url: string, options: any) => {
    const path = new URL(url).pathname;
    if (options.method === "POST")
      writes.push({ path, body: JSON.parse(options.body) });
    let body: any;
    if (path.endsWith("access_tokens")) body = { token: "synthetic-token" };
    else if (path.endsWith("pulls") && options.method === "GET") body = [];
    else if (path.endsWith("pulls"))
      body = {
        number: 1,
        html_url: "https://github.com/test/synthetic/pull/1",
        state: "open",
        draft: true,
      };
    else if (path === "/repos/test/synthetic")
      body = { default_branch: "main" };
    else if (path.endsWith("/git/ref/heads/main"))
      body = { object: { sha: baseSha } };
    else if (path.includes("/git/ref/heads/vibescroller"))
      return new Response("{}", { status: 404 });
    else if (path.endsWith(`/git/commits/${baseSha}`))
      body = { tree: { sha: "base-tree" } };
    else if (path.endsWith("/git/trees/base-tree"))
      body = {
        truncated: false,
        tree: [
          { path: "scripts/task.sh", mode, type: "blob", sha: "base-blob" },
        ],
      };
    else if (path.endsWith("/git/blobs/base-blob"))
      body = {
        encoding: "base64",
        content: Buffer.from("echo before\n").toString("base64"),
      };
    else body = { sha: "synthetic-object" };
    return Response.json(body);
  });
  const input = {
    installationId: 1,
    fullName: "test/synthetic",
    baseSha,
    runId: "synthetic-run",
    createdAt: Date.now(),
    title: "Synthetic test",
    files: [{ path: "scripts/task.sh", content: "echo approved\n" }],
    allowedPaths: ["scripts/task.sh"],
    highRisk: false,
    report: "Synthetic test only",
    reviewedPatch: reviewedCloudPatch(
      [{ path: "scripts/task.sh", content: "echo before\n" }],
      [{ path: "scripts/task.sh", content: "echo approved\n" }],
    ),
  };
  try {
    await publish(input);
    expect(
      writes.find((w) => w.path.endsWith("/git/trees")).body.tree[0].mode,
    ).toBe("100755");
    writes.length = 0;
    await expect(
      publish({
        ...input,
        files: [{ path: "scripts/task.sh", content: "echo different\n" }],
      }),
    ).rejects.toThrow("APPROVAL_STALE");
    expect(
      writes.some((w) => /\/git\/(blobs|trees|commits|refs)$/.test(w.path)),
    ).toBe(false);
    writes.length = 0;
    mode = "120000";
    await expect(publish(input)).rejects.toThrow("POLICY_BLOCKED");
    expect(
      writes.some((w) => /\/git\/(blobs|trees|commits|refs)$/.test(w.path)),
    ).toBe(false);
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});

it("reconciles the existing run marker after a lost publication receipt without another Git write", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  vi.stubEnv("GITHUB_APP_ID", "1");
  vi.stubEnv(
    "GITHUB_APP_PRIVATE_KEY",
    privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  );
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (url: string, options: any) => {
    const path = new URL(url).pathname;
    calls.push(`${options.method} ${path}`);
    if (path.endsWith("access_tokens"))
      return Response.json({ token: "synthetic-token" });
    if (path.endsWith("pulls") && options.method === "GET")
      return Response.json([
        {
          number: 42,
          body: "<!-- vibescroller-run:synthetic-retry -->",
          html_url: "https://github.com/test/synthetic/pull/42",
          state: "open",
          draft: true,
        },
      ]);
    throw Error("Unexpected duplicate publication operation");
  });
  try {
    const input = {
      installationId: 1,
      fullName: "test/synthetic",
      baseSha: "a".repeat(40),
      runId: "synthetic-retry",
      createdAt: Date.now(),
      title: "Synthetic retry",
      files: [{ path: "README.md", content: "approved\n" }],
      allowedPaths: ["README.md"],
      highRisk: false,
      report: "Synthetic",
      reviewedPatch: reviewedCloudPatch(
        [],
        [{ path: "README.md", content: "approved\n" }],
      ),
    };
    const receipt = await publish(input);
    expect(receipt).toMatchObject({ number: 42, state: "draft" });
    expect(await publish(input)).toEqual(receipt);
    expect(
      calls.filter(
        (call) => call.includes("POST") && !call.endsWith("access_tokens"),
      ),
    ).toEqual([]);
    expect(calls.filter((call) => call.includes("/git/"))).toEqual([]);
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});
