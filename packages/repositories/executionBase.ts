import { github } from "../providers/github";
import { ensure, safePath } from "../policy";

export async function verifyExecutionBase(
  repo: { fullName: string; branch?: string },
  current: { default_branch?: string },
  baseSha: string,
  token: string,
) {
  ensure(
    safePath(repo.fullName) &&
      /^[\w.-]+\/[\w.-]+$/.test(repo.fullName) &&
      /^[a-f0-9]{40}$/.test(baseSha),
    "INVALID_INPUT",
    "Invalid execution repository or commit.",
  );
  ensure(
    typeof repo.branch === "string" &&
      repo.branch.length <= 200 &&
      current.default_branch === repo.branch,
    "BASE_CHANGED",
    "The repository branch changed. Refresh and review a new plan.",
  );
  const head = await github(
    `/repos/${repo.fullName}/git/ref/heads/${encodeURIComponent(repo.branch)}`,
    token,
  );
  ensure(
    head.object?.sha === baseSha,
    "BASE_CHANGED",
    "The repository base changed. Refresh and review a new plan.",
  );
}
