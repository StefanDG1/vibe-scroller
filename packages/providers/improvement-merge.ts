import { github, installationToken } from "./github";
import { ensure } from "../policy";
type Run = {
  _id: string;
  prNumber?: number;
  baseSha: string;
  changes?: { path: string; content: string | null }[];
};
type Repo = {
  installationId: number;
  providerId: number;
  fullName: string;
  branch?: string;
};
export async function mergeImprovement(
  repo: Repo,
  run: Run,
  requiredChecks: string[],
  stillAuthorized: () => Promise<void>,
  beginMerge: (head: string) => Promise<void>,
) {
  ensure(
    run.prNumber &&
      run.changes?.length &&
      run.changes.length <= 12 &&
      requiredChecks.length,
    "POLICY_BLOCKED",
    "A reviewed pull request and required checks are needed.",
  );
  const token = await installationToken(repo.installationId, {
      repository_ids: [repo.providerId],
      permissions: {
        contents: "write",
        pull_requests: "write",
        checks: "read",
        statuses: "read",
      },
    }),
    root = `/repos/${repo.fullName}`;
  let pr = await github(`${root}/pulls/${run.prNumber}`, token);
  ensure(
    pr.head.repo?.id === repo.providerId &&
      pr.base.repo?.id === repo.providerId &&
      pr.head.ref === `vibescroller/run-${run._id}` &&
      pr.base.ref === repo.branch &&
      pr.body?.includes(`<!-- vibescroller-run:${run._id} -->`),
    "INVALID_EVIDENCE",
    "Pull request identity changed.",
  );
  if (pr.merged_at)
    return {
      state: "merged",
      mergedAt: pr.merged_at,
      mergeCommitSha: pr.merge_commit_sha,
    };
  ensure(
    pr.state === "open" && pr.base.sha === run.baseSha,
    "BASE_CHANGED",
    "Refresh the changed repository before merging.",
  );
  const branch = await github(
    `${root}/branches/${encodeURIComponent(pr.base.ref)}`,
    token,
  );
  ensure(
    branch.protected === true && branch.commit.sha === run.baseSha,
    "POLICY_BLOCKED",
    "The target branch needs enforced protection and a current base.",
  );
  const commit = await github(`${root}/git/commits/${pr.head.sha}`, token);
  ensure(
    commit.parents?.length === 1 &&
      commit.parents[0].sha === run.baseSha &&
      pr.changed_files === run.changes.length,
    "APPROVAL_STALE",
    "The reviewed change has changed.",
  );
  const files = await github(
    `${root}/pulls/${run.prNumber}/files?per_page=100`,
    token,
  );
  ensure(
    files.length === run.changes.length &&
      files.every((f: any) =>
        run.changes!.some(
          (c) =>
            c.path === f.filename &&
            (c.content === null
              ? f.status === "removed"
              : ["added", "modified"].includes(f.status)),
        ),
      ),
    "APPROVAL_STALE",
    "The reviewed file set changed.",
  );
  const tree = await github(
    `${root}/git/trees/${commit.tree.sha}?recursive=1`,
    token,
  );
  ensure(
    !tree.truncated,
    "REPO_TOO_LARGE",
    "Cannot verify the complete review tree.",
  );
  for (const change of run.changes) {
    const entry = tree.tree.find((f: any) => f.path === change.path);
    if (change.content === null) {
      ensure(!entry, "APPROVAL_STALE", "Deleted file returned.");
      continue;
    }
    ensure(
      entry?.type === "blob" && ["100644", "100755"].includes(entry.mode),
      "POLICY_BLOCKED",
      "Reviewed file type changed.",
    );
    const blob = await github(`${root}/git/blobs/${entry.sha}`, token);
    ensure(
      blob.encoding === "base64" &&
        blob.size <= 200000 &&
        Buffer.from(blob.content, "base64").toString("utf8") === change.content,
      "APPROVAL_STALE",
      "The reviewed file contents changed.",
    );
  }
  const checked = await github(
      `${root}/commits/${pr.head.sha}/check-runs?per_page=100&filter=latest`,
      token,
    ),
    statuses = await github(
      `${root}/commits/${pr.head.sha}/status?per_page=100`,
      token,
    );
  ensure(
    checked.total_count <= 100 && statuses.total_count <= 100,
    "POLICY_BLOCKED",
    "Check coverage is incomplete.",
  );
  const checks = checked.check_runs as any[],
    legacy = statuses.statuses as any[];
  ensure(
    checks.every(
      (c) =>
        c.head_sha === pr.head.sha &&
        c.status === "completed" &&
        c.conclusion === "success",
    ) &&
      legacy.every((c) => c.state === "success") &&
      requiredChecks.every(
        (name) =>
          checks.some(
            (c) => c.name === name && c.app?.slug === "github-actions",
          ) ||
          legacy.some(
            (c) =>
              c.context === name && c.creator?.login === "github-actions[bot]",
          ),
      ),
    "CHECKS_PENDING",
    "Wait for every required check on the reviewed commit.",
  );
  await stillAuthorized();
  if (pr.draft) {
    const ready = await github("/graphql", token, "POST", {
      query:
        "mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{isDraft}}}",
      variables: { id: pr.node_id },
    });
    ensure(
      !ready.errors &&
        ready.data?.markPullRequestReadyForReview?.pullRequest?.isDraft ===
          false,
      "POLICY_BLOCKED",
      "GitHub could not prepare this pull request for review.",
    );
  }
  const current = await github(`${root}/pulls/${run.prNumber}`, token);
  ensure(
    current.head.sha === pr.head.sha &&
      current.base.sha === run.baseSha &&
      current.mergeable === true &&
      current.mergeable_state === "clean" &&
      !current.draft,
    "CHECKS_PENDING",
    "GitHub reviews and branch rules must be satisfied.",
  );
  await stillAuthorized();
  // GitHub compares the exact reviewed head. Never use an administrator bypass or retry a changed head.
  await beginMerge(pr.head.sha);
  const result = await github(
    `${root}/pulls/${run.prNumber}/merge`,
    token,
    "PUT",
    { sha: pr.head.sha, merge_method: "squash" },
  );
  ensure(
    result.merged === true,
    "MERGE_UNKNOWN",
    "Refresh GitHub before another merge attempt.",
  );
  pr = await github(`${root}/pulls/${run.prNumber}`, token);
  ensure(
    pr.merged_at && pr.merge_commit_sha === result.sha,
    "MERGE_UNKNOWN",
    "Merge needs an authoritative receipt.",
  );
  return {
    state: "merged",
    mergedAt: pr.merged_at,
    mergeCommitSha: pr.merge_commit_sha,
  };
}
export async function observeImprovementDeployment(repo: Repo, commit: string) {
  const token = await installationToken(repo.installationId, {
      repository_ids: [repo.providerId],
      permissions: { contents: "read", deployments: "read" },
    }),
    root = `/repos/${repo.fullName}`;
  const rows = await github(
    `${root}/deployments?sha=${commit}&per_page=20`,
    token,
  );
  for (const d of rows.filter(
    (d: any) => d.sha === commit && d.production_environment === true,
  )) {
    const states = await github(
        `${root}/deployments/${d.id}/statuses?per_page=1`,
        token,
      ),
      s = states[0];
    if (s?.state !== "success") continue;
    const url = new URL(s.environment_url);
    ensure(
      url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        !url.port,
      "INVALID_EVIDENCE",
      "Deployment URL is not a public page.",
    );
    return {
      state: "provider_verified",
      commit,
      url: url.toString(),
      environment: d.environment,
      observedAt: Date.now(),
    };
  }
  return null;
}
