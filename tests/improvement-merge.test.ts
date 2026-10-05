import { beforeEach, expect, it, vi } from "vitest";
import { github, installationToken } from "../packages/providers/github";
import {
  mergeImprovement,
  observeImprovementDeployment,
} from "../packages/providers/improvement-merge";
vi.mock("../packages/providers/github", () => ({
  github: vi.fn(),
  installationToken: vi.fn(),
}));
beforeEach(() => vi.resetAllMocks());
const repo = {
  installationId: 42,
  providerId: 55,
  fullName: "owned/synthetic",
  branch: "main",
};
const run = {
  _id: "synthetic-run",
  prNumber: 1,
  baseSha: "a".repeat(40),
  changes: [
    { path: "docs/example.md", content: "Reviewed synthetic content\n" },
  ],
};
function fixture(
  options: {
    protected?: boolean;
    contents?: string;
    failed?: boolean;
    forgedBot?: boolean;
    headChanged?: boolean;
    unknown?: boolean;
  } = {},
) {
  let reads = 0,
    merged = false;
  const head = "b".repeat(40),
    receipt = "c".repeat(40);
  vi.mocked(installationToken).mockResolvedValue("synthetic-scoped-token");
  vi.mocked(github).mockImplementation(
    async (path: string, _token: string, method?: string) => {
      if (path.endsWith("/merge") && method === "PUT") {
        if (options.unknown) throw Error("Synthetic response lost");
        merged = true;
        return { merged: true, sha: receipt };
      }
      if (path.endsWith("/pulls/1")) {
        reads++;
        return {
          head: {
            repo: { id: 55 },
            ref: "vibescroller/run-synthetic-run",
            sha: options.headChanged && reads > 1 ? "d".repeat(40) : head,
          },
          base: { repo: { id: 55 }, ref: "main", sha: run.baseSha },
          body: "<!-- vibescroller-run:synthetic-run -->",
          changed_files: 1,
          state: "open",
          draft: false,
          mergeable: true,
          mergeable_state: "clean",
          ...(merged
            ? { merged_at: "2026-10-05T00:00:00Z", merge_commit_sha: receipt }
            : {}),
        };
      }
      if (path.includes("/branches/"))
        return {
          protected: options.protected ?? true,
          commit: { sha: run.baseSha },
        };
      if (path.includes("/git/commits/"))
        return { parents: [{ sha: run.baseSha }], tree: { sha: "tree" } };
      if (path.endsWith("/files?per_page=100"))
        return [{ filename: "docs/example.md", status: "modified" }];
      if (path.includes("/git/trees/"))
        return {
          truncated: false,
          tree: [
            {
              path: "docs/example.md",
              type: "blob",
              mode: "100644",
              sha: "blob",
            },
          ],
        };
      if (path.includes("/git/blobs/")) {
        const content = options.contents ?? run.changes[0].content;
        return {
          encoding: "base64",
          size: content.length,
          content: Buffer.from(content).toString("base64"),
        };
      }
      if (path.includes("/check-runs?"))
        return {
          total_count: options.forgedBot ? 0 : 1,
          check_runs: options.forgedBot
            ? []
            : [
                {
                  name: "verify",
                  head_sha: head,
                  status: "completed",
                  conclusion: options.failed ? "failure" : "success",
                  app: { slug: "github-actions" },
                },
              ],
        };
      if (path.includes("/status?"))
        return {
          total_count: options.forgedBot ? 1 : 0,
          statuses: options.forgedBot
            ? [
                {
                  context: "verify",
                  state: "success",
                  creator: { type: "Bot", login: "untrusted-app[bot]" },
                },
              ]
            : [],
        };
      throw Error("Unexpected synthetic GitHub read");
    },
  );
  return { authorized: vi.fn(async () => {}), begin: vi.fn(async () => {}) };
}
it("merges only the verified contents and passing protected head, recording intent before the exact-sha write", async () => {
  const f = fixture();
  const result = await mergeImprovement(
    repo,
    run,
    ["verify"],
    f.authorized,
    f.begin,
  );
  expect(result.mergeCommitSha).toBe("c".repeat(40));
  expect(f.authorized).toHaveBeenCalledTimes(2);
  expect(f.begin).toHaveBeenCalledExactlyOnceWith("b".repeat(40));
  const merge = vi.mocked(github).mock.calls.find((c) => c[2] === "PUT")!;
  expect(merge[3]).toEqual({ sha: "b".repeat(40), merge_method: "squash" });
  expect(f.begin.mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(github).mock.invocationCallOrder[
      vi.mocked(github).mock.calls.indexOf(merge)
    ],
  );
  expect(installationToken).toHaveBeenCalledWith(42, {
    repository_ids: [55],
    permissions: {
      contents: "write",
      pull_requests: "write",
      checks: "read",
      statuses: "read",
    },
  });
});
it.each([
  { protected: false },
  { contents: "Unreviewed replacement" },
  { failed: true },
  { forgedBot: true },
  { headChanged: true },
])("refuses changed or untrusted merge evidence: %j", async (options) => {
  const f = fixture(options);
  await expect(
    mergeImprovement(repo, run, ["verify"], f.authorized, f.begin),
  ).rejects.toThrow();
  expect(f.begin).not.toHaveBeenCalled();
  expect(vi.mocked(github).mock.calls.some((c) => c[2] === "PUT")).toBe(false);
});
it("keeps an unknown merge response after the durable intent and does not retry the write", async () => {
  const f = fixture({ unknown: true });
  await expect(
    mergeImprovement(repo, run, ["verify"], f.authorized, f.begin),
  ).rejects.toThrow("Synthetic response lost");
  expect(f.begin).toHaveBeenCalledOnce();
  expect(
    vi.mocked(github).mock.calls.filter((c) => c[2] === "PUT"),
  ).toHaveLength(1);
});
it("observes only an exact-commit successful production deployment and refuses credential-bearing URLs", async () => {
  vi.mocked(installationToken).mockResolvedValue("synthetic-scoped-token");
  vi.mocked(github)
    .mockResolvedValueOnce([
      { id: 1, sha: run.baseSha, production_environment: false },
      { id: 2, sha: "other", production_environment: true },
      {
        id: 3,
        sha: run.baseSha,
        production_environment: true,
        environment: "Production",
      },
    ])
    .mockResolvedValueOnce([
      { state: "success", environment_url: "https://example.test/" },
    ]);
  expect(await observeImprovementDeployment(repo, run.baseSha)).toMatchObject({
    state: "provider_verified",
    commit: run.baseSha,
    url: "https://example.test/",
  });
  vi.mocked(github)
    .mockResolvedValueOnce([
      { id: 3, sha: run.baseSha, production_environment: true },
    ])
    .mockResolvedValueOnce([
      {
        state: "success",
        environment_url: "https://user:password@example.test/",
      },
    ]);
  await expect(observeImprovementDeployment(repo, run.baseSha)).rejects.toThrow(
    "INVALID_EVIDENCE",
  );
});
