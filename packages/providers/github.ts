import { excerpt, type RepositoryExcerpt } from "../repositories/context";
import {
  inspectedIgnorePolicy,
  preparedTree,
  EXTRACTION_VERSION,
} from "../repositories/prepare";
import { createPrivateKey, sign, createHash } from "node:crypto";
import {
  reuseExcerpt,
  manifestDelta,
  type PreviousSnapshot,
} from "../repositories/snapshotCache";
import { ensure, containsSecret, prState, validatePaths } from "../policy";
import {
  focusedExcerpt,
  retrievalFiles,
  validateInspectedContext,
} from "../repositories/retrieval";
import { validateRepositoryEvidence } from "../repositories/context";
import type { ManifestEntry } from "../repositories/snapshotCache";
export async function github(
  path: string,
  token: string,
  method = "GET",
  body?: unknown,
) {
  ensure(path.startsWith("/"), "INVALID_INPUT", "Invalid GitHub path.");
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    ...(body !== undefined && method !== "GET"
      ? { body: JSON.stringify(body) }
      : {}),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok)
    throw Object.assign(
      new Error(
        `GITHUB_UNAVAILABLE: ${[401, 403, 404].includes(res.status) ? "Repository access unavailable. Reconnect GitHub." : "GitHub request failed."}`,
      ),
      { status: res.status },
    );
  return res.status === 204 ? null : res.json();
}
export async function installationToken(installationId: number) {
  const id = process.env.GITHUB_APP_ID,
    key = process.env.GITHUB_APP_PRIVATE_KEY;
  ensure(id && key, "SETUP_REQUIRED", "Configure the VibeScroller GitHub App.");
  const now = Math.floor(Date.now() / 1000),
    enc = (s: unknown) => Buffer.from(JSON.stringify(s)).toString("base64url");
  const p = `${enc({ alg: "RS256", typ: "JWT" })}.${enc({ iat: now - 30, exp: now + 540, iss: id })}`;
  const jwt = `${p}.${sign("RSA-SHA256", Buffer.from(p), createPrivateKey(key.replaceAll("\\n", "\n"))).toString("base64url")}`;
  const result = await github(
    `/app/installations/${installationId}/access_tokens`,
    jwt,
    "POST",
    {},
  );
  return result.token as string;
}
export async function snapshot(
  installationId: number,
  providerId: number,
  fullName: string,
  previous?: PreviousSnapshot | null,
) {
  ensure(
    /^[\w.-]+\/[\w.-]+$/.test(fullName),
    "INVALID_INPUT",
    "Invalid repository.",
  );
  const token = await installationToken(installationId);
  const permitted = await github(
    "/installation/repositories?per_page=100",
    token,
  );
  ensure(
    permitted.repositories.some(
      (r: any) => r.id === providerId && r.full_name === fullName,
    ),
    "FORBIDDEN",
    "Repository is not in this selected installation.",
  );
  const repo = await github(`/repos/${fullName}`, token);
  const ref = await github(
    `/repos/${fullName}/git/ref/heads/${encodeURIComponent(repo.default_branch)}`,
    token,
  );
  const sha = ref.object.sha;
  const tree = await github(
    `/repos/${fullName}/git/trees/${sha}?recursive=1`,
    token,
  );
  ensure(
    !tree.truncated,
    "REPO_TOO_LARGE",
    "Repository requires a bounded snapshot selection.",
  );
  const ignored = await inspectedIgnorePolicy(tree.tree, async (sha) => {
    const blob = await github(`/repos/${fullName}/git/blobs/${sha}`, token);
    return Buffer.from(blob.content, "base64").toString("utf8");
  });
  const files = tree.tree.filter(
    (f: any) =>
      f.type === "blob" &&
      f.mode !== "120000" &&
      !ignored(f.path) &&
      f.size <= 100000,
  );
  const manifest = files.map((f: any) => f.path);
  const manifestEntries = files.map((f: any) => ({
    path: f.path,
    blobSha: f.sha,
    mode: f.mode,
    size: f.size,
  }));
  ensure(
    manifestEntries.length <= 5000 &&
      Buffer.byteLength(
        JSON.stringify(manifestEntries) + JSON.stringify(manifest),
      ) <= 600000,
    "REPO_TOO_LARGE",
    "Select a smaller repository snapshot before analysis.",
  );
  let context = "";
  const contextFiles: string[] = [];
  const contextExcerpts: RepositoryExcerpt[] = [];
  let reusedExcerpts = 0;
  let remaining = 40000;
  for (const f of files
    .filter((f: any) => /README|package\.json|\.(tsx?|py|md)$/.test(f.path))
    .sort((a: any, b: any) => {
      const score = (path: string) =>
        /^(README\.md|package\.json)$/.test(path)
          ? 0
          : /^(convex\/|apps\/starter\/components\/)/.test(path)
            ? 1
            : 2;
      return score(a.path) - score(b.path) || a.path.localeCompare(b.path);
    })
    .slice(0, 40)) {
    if (remaining < 100) break;
    const cached = reuseExcerpt(
      { path: f.path, blobSha: f.sha, mode: f.mode, size: f.size },
      previous,
      remaining,
    );
    if (cached) {
      reusedExcerpts++;
      remaining -= cached.content.length + 1;
      contextExcerpts.push(cached);
      contextFiles.push(f.path);
      context += `\nFile: ${f.path}, lines ${cached.startLine}-${cached.endLine}\n${cached.content}\n`;
      continue;
    }
    const b = await github(`/repos/${fullName}/git/blobs/${f.sha}`, token);
    const text = Buffer.from(b.content, "base64").toString("utf8");
    if (!text.includes("\0") && !containsSecret(text)) {
      const selected = excerpt(f.path, text, f.sha, remaining);
      if (!selected) continue;
      remaining -= selected.content.length + 1;
      contextExcerpts.push(selected);
      contextFiles.push(f.path);
      context += `\nFile: ${f.path}, lines ${selected.startLine}-${selected.endLine}\n${selected.content}\n`;
    }
  }
  const delta = manifestDelta(manifestEntries, previous?.manifestEntries);
  return {
    sha,
    branch: repo.default_branch,
    manifest,
    manifestEntries,
    context,
    contextFiles,
    contextExcerpts,
    contextTree: preparedTree(contextExcerpts),
    extractionVersion: EXTRACTION_VERSION,
    snapshotDelta: {
      addedCount: delta.addedToManifest.length,
      changedCount: delta.changedBlobs.length,
      removedCount: delta.removedFromManifest.length,
      addedExamples: delta.addedToManifest.slice(0, 25),
      changedExamples: delta.changedBlobs.slice(0, 25),
      removedExamples: delta.removedFromManifest.slice(0, 25),
      reusedExcerpts,
    },
    snapshotSummary: {
      baseSha: sha,
      profileVersion: previous?.profileVersion ?? 1,
      extractionVersion: EXTRACTION_VERSION,
      cacheKey: createHash("sha256")
        .update(
          JSON.stringify({
            sha,
            profileVersion: previous?.profileVersion ?? 1,
            extractionVersion: EXTRACTION_VERSION,
            manifestEntries,
          }),
        )
        .digest("hex"),
      eligibleFileCount: manifestEntries.length,
      inspectedPaths: contextFiles,
      languageFileCounts: manifestEntries.reduce(
        (counts: Record<string, number>, entry: { path: string }) => {
          const suffix = entry.path.includes(".")
            ? entry.path.split(".").at(-1)!.toLowerCase()
            : "no_extension";
          const extension = /^[a-z0-9_]{1,15}$/.test(suffix) ? suffix : "other";
          Object.defineProperty(counts, extension, {
            value:
              (Object.hasOwn(counts, extension) ? counts[extension] : 0) + 1,
            enumerable: true,
            writable: true,
            configurable: true,
          });
          return counts;
        },
        {},
      ),
      limitation:
        "Structural manifest and inspected-path summary only. Eligible files were not all read; no semantic implementation or business outcome is inferred.",
    },
  };
}
export async function retrieveContext(
  repo: {
    installationId: number;
    providerId: number;
    fullName: string;
    sha: string;
    manifestEntries?: ManifestEntry[];
  },
  focus: string,
  evidence: { path: string; startLine: number; endLine: number }[] = [],
) {
  ensure(
    /^[\w.-]+\/[\w.-]+$/.test(repo.fullName) && /^[a-f0-9]{40}$/.test(repo.sha),
    "INVALID_INPUT",
    "Invalid repository snapshot.",
  );
  ensure(
    repo.manifestEntries?.length,
    "CONTEXT_REQUIRED",
    "Refresh the selected repository's immutable manifest before matching.",
  );
  const files = retrievalFiles(repo.manifestEntries, focus, [
    ...new Set(evidence.map((row) => row.path)),
  ]);
  const token = await installationToken(repo.installationId);
  const current = await github(`/repos/${repo.fullName}`, token);
  ensure(
    current.id === repo.providerId,
    "FORBIDDEN",
    "Repository identity changed.",
  );
  // Blob identities come from the approved manifest, never from model-supplied refs.
  const excerpts: RepositoryExcerpt[] = [];
  let remaining = 40000;
  for (const file of files) {
    if (remaining < 100) break;
    const blob = await github(
      `/repos/${repo.fullName}/git/blobs/${file.blobSha}`,
      token,
    );
    ensure(
      blob.encoding === "base64",
      "INVALID_EVIDENCE",
      "Unsupported repository blob encoding.",
    );
    const bytes = Buffer.from(blob.content, "base64");
    ensure(
      bytes.length === file.size &&
        bytes.length <= 100000 &&
        createHash("sha1")
          .update(`blob ${bytes.length}\0`)
          .update(bytes)
          .digest("hex") === file.blobSha,
      "INVALID_EVIDENCE",
      "Repository blob does not match the selected snapshot.",
    );
    const cited = evidence.filter((row) => row.path === file.path);
    const selected = focusedExcerpt(
      file,
      bytes.toString("utf8"),
      focus,
      remaining,
      cited.length ? Math.min(...cited.map((row) => row.startLine)) : undefined,
    );
    if (!selected) continue;
    excerpts.push(selected);
    remaining -= selected.content.length;
  }
  validateInspectedContext(excerpts, repo.manifestEntries);
  validateRepositoryEvidence(evidence, excerpts);
  return { excerpts, tree: preparedTree(excerpts) };
}
export async function publish(input: {
  installationId: number;
  fullName: string;
  baseSha: string;
  runId: string;
  createdAt: number;
  title: string;
  files: { path: string; content: string | null }[];
  allowedPaths: string[];
  highRisk: boolean;
  report: string;
}) {
  validatePaths(
    input.files.map((f) => f.path),
    input.allowedPaths,
    input.highRisk,
  );
  ensure(
    input.files.every(
      (f) =>
        f.content === null ||
        (f.content.length < 200000 && !containsSecret(f.content)),
    ),
    "POLICY_BLOCKED",
    "Patch contains a secret or oversized file.",
  );
  const token = await installationToken(input.installationId),
    root = `/repos/${input.fullName}`,
    branch = `vibescroller/run-${input.runId}`,
    marker = `<!-- vibescroller-run:${input.runId} -->`;
  const existing = await github(
    `${root}/pulls?state=all&head=${encodeURIComponent(input.fullName.split("/")[0] + ":" + branch)}`,
    token,
  );
  const found = existing.find((p: any) => p.body?.includes(marker));
  if (found)
    return {
      number: found.number,
      url: found.html_url,
      state: prState(found),
      mergedAt: found.merged_at ?? undefined,
    };
  const repo = await github(root, token);
  const current = await github(
    `${root}/git/ref/heads/${encodeURIComponent(repo.default_branch)}`,
    token,
  );
  ensure(
    current.object.sha === input.baseSha,
    "BASE_CHANGED",
    "The repository base changed. Refresh and approve the plan again.",
  );
  const commit = await github(`${root}/git/commits/${input.baseSha}`, token);
  const baseTree = await github(
    `${root}/git/trees/${commit.tree.sha}?recursive=1`,
    token,
  );
  ensure(
    !baseTree.truncated,
    "REPO_TOO_LARGE",
    "Cannot verify file modes in a truncated repository tree.",
  );
  const modes = new Map<string, string>();
  for (const file of input.files) {
    const original = baseTree.tree.find(
      (entry: any) => entry.path === file.path,
    );
    ensure(
      !original ||
        (original.type === "blob" &&
          ["100644", "100755"].includes(original.mode)),
      "POLICY_BLOCKED",
      "Changes to symbolic links, submodules or directories are unavailable.",
    );
    modes.set(file.path, original?.mode ?? "100644");
  }
  const entries = [];
  for (const f of input.files) {
    const blob =
      f.content === null
        ? null
        : await github(`${root}/git/blobs`, token, "POST", {
            content: f.content,
            encoding: "utf-8",
          });
    entries.push({
      path: f.path,
      mode: modes.get(f.path),
      type: "blob",
      sha: blob?.sha ?? null,
    });
  }
  const tree = await github(`${root}/git/trees`, token, "POST", {
    base_tree: commit.tree.sha,
    tree: entries,
  });
  const next = await github(`${root}/git/commits`, token, "POST", {
    message: `VibeScroller: ${input.title}`,
    tree: tree.sha,
    parents: [input.baseSha],
    author: {
      name: "VibeScroller",
      email: "noreply@vibescroller.invalid",
      date: new Date(input.createdAt).toISOString(),
    },
    committer: {
      name: "VibeScroller",
      email: "noreply@vibescroller.invalid",
      date: new Date(input.createdAt).toISOString(),
    },
  });
  let ref;
  try {
    ref = await github(`${root}/git/ref/heads/${branch}`, token);
  } catch {}
  if (ref)
    ensure(
      ref.object.sha === next.sha,
      "PUBLICATION_CONFLICT",
      "The run branch already contains a different patch.",
    );
  else
    await github(`${root}/git/refs`, token, "POST", {
      ref: `refs/heads/${branch}`,
      sha: next.sha,
    });
  const pr = await github(`${root}/pulls`, token, "POST", {
    title: input.title,
    head: branch,
    base: repo.default_branch,
    draft: true,
    body: `${marker}\n\nPrepared from an explicitly approved VibeScroller plan. Benefit remains unmeasured.\n\nPrivate source evidence stays in the authenticated application.\n\nChecks and limitations:\n${input.report.slice(0, 4000)}`,
  });
  return {
    number: pr.number,
    url: pr.html_url,
    state: prState(pr),
    mergedAt: pr.merged_at ?? undefined,
  };
}
