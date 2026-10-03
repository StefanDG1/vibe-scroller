import { github, installationToken } from "./github";
import { ensure } from "../policy";
// Only the trusted publisher requests this narrow permission; no token reaches inference.
export async function issueAccess(
  repo: {
    installationId: number;
    providerId: number;
    fullName: string;
  },
  write = true,
) {
  const token = await installationToken(repo.installationId, {
    repository_ids: [repo.providerId],
    permissions: { issues: write ? "write" : "read", contents: "read" },
  });
  const current = await github(`/repos/${repo.fullName}`, token);
  ensure(
    current.id === repo.providerId &&
      current.full_name === repo.fullName &&
      current.has_issues &&
      !current.archived &&
      !current.disabled,
    "FORBIDDEN",
    "Issue publication is unavailable for this repository.",
  );
  return { token, visibility: current.private ? "private" : "public" };
}
export async function createIssue(
  token: string,
  fullName: string,
  title: string,
  body: string,
) {
  const result = await github(`/repos/${fullName}/issues`, token, "POST", {
    title,
    body,
  });
  ensure(
    Number.isSafeInteger(result.number) &&
      result.number > 0 &&
      result.html_url ===
        `https://github.com/${fullName}/issues/${result.number}` &&
      result.title === title &&
      result.body === body &&
      !result.pull_request,
    "PUBLICATION_UNKNOWN",
    "GitHub's publication response did not prove the reviewed issue bytes.",
  );
  return {
    number: result.number as number,
    url: result.html_url as string,
    state: result.state as string,
  };
}
export async function findIssue(
  token: string,
  fullName: string,
  marker: string,
  number?: number,
) {
  if (number) {
    try {
      return await github(`/repos/${fullName}/issues/${number}`, token);
    } catch (error) {
      if (error instanceof Error && "status" in error && error.status === 404)
        return { unavailable: true };
      throw error;
    }
  }
  // Bounded authoritative pagination. Absence, even after the final page, never authorizes retry.
  for (let page = 1; page <= 10; page++) {
    const issues = await github(
      `/repos/${fullName}/issues?state=all&sort=created&direction=desc&per_page=100&page=${page}`,
      token,
    );
    const found = issues.find(
      (i: any) =>
        !i.pull_request &&
        typeof i.body === "string" &&
        i.body.includes(marker),
    );
    if (found) return found;
    if (issues.length < 100) break;
  }
  return null;
}
