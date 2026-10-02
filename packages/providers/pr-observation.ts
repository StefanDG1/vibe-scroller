import { github } from "./github";
import { prState } from "../policy";
import { exactRevert } from "../repositories/revert";
export type RevertEvidence = {
  mergeCommitSha: string;
  revertCommitSha: string;
  url: string;
  observedAt: number;
};
const sha = /^[a-f0-9]{40}$/;
type Run = {
  repo: { fullName: string; branch: string };
  prNumber: number;
  reverted?: RevertEvidence;
  revertProbeHead?: string;
};
type Observation = {
  state: string;
  mergedAt?: string;
  mergeCommitSha?: string;
  reverted?: RevertEvidence;
  revertStatus?: "verified" | "not_observed" | "search_limited" | "unverified";
  revertProbeHead?: string;
};
export async function observePR(
  run: Run,
  token: string,
  observedAt: number,
): Promise<Observation> {
  const root = `/repos/${run.repo.fullName}`;
  const pr = await github(`${root}/pulls/${run.prNumber}`, token);
  const observation = {
    state: prState(pr),
    mergedAt: pr.merged_at ?? undefined,
    mergeCommitSha:
      pr.merged_at && sha.test(pr.merge_commit_sha ?? "")
        ? pr.merge_commit_sha
        : undefined,
  };
  if (!observation.mergeCommitSha) return observation;
  if (run.reverted?.mergeCommitSha === observation.mergeCommitSha)
    return { ...observation, reverted: run.reverted, revertStatus: "verified" };
  // Failure to inspect a reversal does not erase a verified historical merge.
  try {
    const commits = await github(
      `${root}/commits?sha=${encodeURIComponent(run.repo.branch)}&since=${encodeURIComponent(pr.merged_at)}&per_page=20`,
      token,
    );
    if (!Array.isArray(commits) || commits.length > 20)
      throw Error("REVERT_OBSERVATION_INVALID");
    const head = commits[0]?.sha;
    if (head && !sha.test(head)) throw Error("REVERT_OBSERVATION_INVALID");
    if (head === run.revertProbeHead) return observation;
    const pattern = new RegExp(
      `^This reverts commit ${observation.mergeCommitSha}\\.\\s*$`,
      "m",
    );
    const candidates = commits
      .filter(
        (commit) =>
          sha.test(commit.sha ?? "") &&
          pattern.test(commit.commit?.message ?? ""),
      )
      .slice(0, 3);
    for (const candidate of candidates) {
      const original = await github(
        `${root}/commits/${observation.mergeCommitSha}?per_page=100`,
        token,
      );
      const undo = await github(
        `${root}/commits/${candidate.sha}?per_page=100`,
        token,
      );
      if (!original.parents?.[0] || !undo.parents?.[0]) continue;
      const trees = await Promise.all(
        [
          original.parents[0].sha,
          original.sha,
          undo.parents[0].sha,
          undo.sha,
        ].map(async (commitSha) => {
          if (!sha.test(commitSha ?? ""))
            throw Error("REVERT_OBSERVATION_INVALID");
          return github(`${root}/git/trees/${commitSha}?recursive=1`, token);
        }),
      );
      if (
        exactRevert(
          original.files,
          undo.files,
          trees[0],
          trees[1],
          trees[2],
          trees[3],
        )
      ) {
        return {
          ...observation,
          revertStatus: "verified",
          revertProbeHead: head,
          reverted: {
            mergeCommitSha: observation.mergeCommitSha,
            revertCommitSha: undo.sha,
            url: `https://github.com/${run.repo.fullName}/commit/${undo.sha}`,
            observedAt,
          },
        };
      }
    }
    return {
      ...observation,
      revertProbeHead: head,
      revertStatus: commits.length === 20 ? "search_limited" : "not_observed",
    };
  } catch {
    return { ...observation, revertStatus: "unverified" };
  }
}
