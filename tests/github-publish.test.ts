import { expect, it, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { publish } from "../packages/providers/github";

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
        tree: [{ path: "scripts/task.sh", mode, type: "blob" }],
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
  };
  try {
    await publish(input);
    expect(
      writes.find((w) => w.path.endsWith("/git/trees")).body.tree[0].mode,
    ).toBe("100755");
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
