import { buildVersion } from "./version.mjs";
const {
  GITHUB_TOKEN,
  GITHUB_REPOSITORY,
  GITHUB_SHA,
  VERSION_COMMIT,
  PUBLISH_RELEASE,
} = process.env;
if (!GITHUB_TOKEN || GITHUB_REPOSITORY !== "StefanDG1/vibe-scroller")
  throw new Error("Repository release credentials required");
const value = buildVersion(VERSION_COMMIT ?? GITHUB_SHA ?? "HEAD");
const api = `https://api.github.com/repos/${GITHUB_REPOSITORY}`;
async function request(path, method = "GET", body) {
  const response = await fetch(api + path, {
    method,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(`GitHub version request failed (${response.status})`);
  return response.status === 204 ? {} : await response.json();
}
const current = await request(`/git/ref/tags/${value.tag}`);
if (current) {
  if (current.object.sha !== value.commit)
    throw new Error("Version tag points at another commit");
} else
  await request("/git/refs", "POST", {
    ref: `refs/tags/${value.tag}`,
    sha: value.commit,
  });
if (PUBLISH_RELEASE === "true") {
  const release = await request(`/releases/tags/${value.tag}`);
  if (!release)
    await request("/releases", "POST", {
      tag_name: value.tag,
      target_commitish: value.commit,
      name: `VibeScroller ${value.version}`,
      prerelease: true,
      generate_release_notes: true,
      body: `Alpha build. Commit: ${value.commit}. Required CI passed for this commit. External release gates and production integration evidence remain in docs/implementation-status.md. This release does not certify a complete or legally cleared paid V1.`,
    });
}
console.log(
  `${PUBLISH_RELEASE === "true" ? "Verified release" : "Version tag"}: ${value.tag}`,
);
