"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { authorizeRepository } from "./lib/githubAuthorization";
import { github, installationToken } from "../packages/providers/github";
import { verifyLocalPatch } from "../packages/runner/patch";
import { ensure, containsSecret } from "../packages/policy";
export const accept = internalAction({
  args: {
    credentialHash: v.string(),
    id: v.id("runs"),
    generation: v.number(),
    patch: v.string(),
    report: v.string(),
    terminated: v.literal(true),
  },
  handler: async (ctx, a): Promise<unknown> => {
    const { run, repo } = await ctx.runQuery(
      internal.runnerProtocol.resultContext,
      { credentialHash: a.credentialHash, id: a.id, generation: a.generation },
    );
    await authorizeRepository(ctx, repo);
    ensure(
      a.report.length <= 20000 && !containsSecret(a.report),
      "POLICY_BLOCKED",
      "Report is oversized or contains credential material.",
    );
    const token = await installationToken(repo.installationId);
    const tree = await github(
      `/repos/${repo.fullName}/git/trees/${run.baseSha}?recursive=1`,
      token,
    );
    ensure(
      !tree.truncated,
      "REPO_TOO_LARGE",
      "Base snapshot requires a bounded selection.",
    );
    const result = await verifyLocalPatch(
      a.patch,
      run.allowedPaths,
      run.highRisk,
      async (path) => {
        const entry = tree.tree.find((f: any) => f.path === path);
        if (!entry) return null;
        ensure(
          entry.type === "blob" &&
            ["100644", "100755"].includes(entry.mode) &&
            entry.size <= 200000,
          "POLICY_BLOCKED",
          "Only bounded regular text files are supported.",
        );
        const blob = await github(
          `/repos/${repo.fullName}/git/blobs/${entry.sha}`,
          token,
        );
        const bytes = Buffer.from(blob.content, "base64"),
          text = bytes.toString("utf8");
        ensure(
          bytes.length <= 200000 &&
            !text.includes("\0") &&
            Buffer.from(text).equals(bytes) &&
            !containsSecret(text),
          "POLICY_BLOCKED",
          "Base file is binary or contains credential material.",
        );
        return text;
      },
    );
    return ctx.runMutation(internal.runnerProtocol.commitResult, {
      credentialHash: a.credentialHash,
      id: a.id,
      generation: a.generation,
      ...result,
      report: `Local official Codex execution. Worker reported termination before upload. Test report is device-reported, not independently executed by the server.\n${a.report}`,
    });
  },
});
