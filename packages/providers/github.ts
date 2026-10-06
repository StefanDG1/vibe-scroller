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
  RETRIEVAL_BLOB_LIMIT,
  retrievalFiles,
  projectContextPaths,
  validateInspectedContext,
} from "../repositories/retrieval";
import { validateRepositoryEvidence } from "../repositories/context";
import type { ManifestEntry } from "../repositories/snapshotCache";
import {
  snapshotPaths,
  withinSnapshot,
  snapshotScopeCurrent,
} from "../repositories/scope";
import { verifyLocalPatch } from "../runner/patch";
import {
  boundedDiscoveryIndex,
  businessEvidenceFiles,
  businessEvidenceFocus,
  businessEvidenceWeight,
  businessEvidenceAnchor,
} from "../repositories/business-context";
import { wordText } from "../repositories/word-text";
export async function repositoryArchive(
  fullName: string,
  baseSha: string,
  token: string,
) {
  ensure(
    /^[\w.-]+\/[\w.-]+$/.test(fullName) && /^[a-f0-9]{40}$/.test(baseSha),
    "INVALID_INPUT",
    "Invalid immutable archive selection.",
  );
  const response = await fetch(
    `https://api.github.com/repos/${fullName}/zipball/${baseSha}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
    },
  );
  ensure(
    response.status === 302 && response.headers.get("location"),
    "GITHUB_UNAVAILABLE",
    "The selected repository archive is unavailable.",
  );
  const target = new URL(response.headers.get("location")!);
  ensure(
    target.protocol === "https:" &&
      target.hostname === "codeload.github.com" &&
      !target.username &&
      !target.password &&
      target.port === "" &&
      target.pathname === `/${fullName}/legacy.zip/${baseSha}`,
    "POLICY_BLOCKED",
    "GitHub returned an unexpected archive location.",
  );
  // The redirect is a short-lived GitHub capability. Never log it or forward the installation token.
  const archive = await fetch(target, {
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  ensure(
    archive.ok && archive.body,
    "GITHUB_UNAVAILABLE",
    "Repository archive download failed.",
  );
  const declared = Number(archive.headers.get("content-length") ?? 0);
  ensure(
    declared <= 25000000,
    "REPO_TOO_LARGE",
    "Repository archive exceeds its download quote.",
  );
  const reader = archive.body.getReader(),
    chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.length;
      ensure(
        length <= 25000000,
        "REPO_TOO_LARGE",
        "Repository archive exceeds its download quote.",
      );
      chunks.push(next.value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
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
export async function installationToken(
  installationId: number,
  scope?: {
    repository_ids: number[];
    permissions: {
      issues?: "write" | "read";
      contents: "read" | "write";
      pull_requests?: "read" | "write";
      checks?: "read";
      statuses?: "read";
      deployments?: "read";
    };
  },
) {
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
    scope ?? {},
  );
  if (scope?.permissions.issues)
    ensure(
      result.permissions?.issues === scope.permissions.issues ||
        (scope.permissions.issues === "read" &&
          result.permissions?.issues === "write"),
      "FORBIDDEN",
      "The GitHub App needs approved Issues write permission. Review its installation permissions.",
    );
  return result.token as string;
}
export async function snapshot(
  installationId: number,
  providerId: number,
  fullName: string,
  previous?: PreviousSnapshot | null,
  selectedPaths: string[] = [],
) {
  const paths = snapshotPaths(selectedPaths);
  ensure(
    /^[\w.-]+\/[\w.-]+$/.test(fullName),
    "INVALID_INPUT",
    "Invalid repository.",
  );
  const token = await installationToken(installationId);
  let authorized = false;
  for (let page = 1; page <= 10; page++) {
    const permitted = await github(
      `/installation/repositories?per_page=100&page=${page}`,
      token,
    );
    if (
      permitted.repositories.some(
        (r: any) => r.id === providerId && r.full_name === fullName,
      )
    ) {
      authorized = true;
      break;
    }
    if (permitted.repositories.length < 100) break;
  }
  ensure(
    authorized,
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
  const eligible = tree.tree.filter(
    (f: any) =>
      f.type === "blob" &&
      ["100644", "100755"].includes(f.mode) &&
      !ignored(f.path) &&
      Number.isSafeInteger(f.size) &&
      f.size >= 0 &&
      f.size <= RETRIEVAL_BLOB_LIMIT,
  );
  const files = eligible.filter((f: any) => withinSnapshot(f.path, paths));
  ensure(
    !paths.length ||
      paths.every((path) =>
        files.some((f: any) => withinSnapshot(f.path, [path])),
      ),
    "CONTEXT_REQUIRED",
    "Each selected path must contain an eligible file at the current commit.",
  );
  const allEntries = files.map((f: any) => ({
    path: f.path,
    blobSha: f.sha,
    mode: f.mode,
    size: f.size,
  }));
  // Keep the storage/write payload bounded, without restricting discovery or
  // later evidence retrieval to this representative cache.
  const manifestEntries = paths.length
    ? allEntries
    : boundedDiscoveryIndex(allEntries);
  const manifest = manifestEntries.map((f: ManifestEntry) => f.path);
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
  const businessFiles = businessEvidenceFiles(allEntries);
  for (const [index, entry] of businessFiles.entries()) {
    const f = { ...entry, sha: entry.blobSha };
    if (remaining < 100) break;
    const perFile = Math.min(
      4000,
      Math.floor(
        (remaining * businessEvidenceWeight(f.path)) /
          businessFiles
            .slice(index)
            .reduce((sum, row) => sum + businessEvidenceWeight(row.path), 0),
      ),
    );
    const cached =
      !f.path.endsWith(".docx") &&
      reuseExcerpt(
        { path: f.path, blobSha: f.sha, mode: f.mode, size: f.size },
        previous,
        perFile,
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
    const bytes = Buffer.from(b.content, "base64");
    let text: string;
    try {
      if (f.path.endsWith(".docx"))
        ensure(
          bytes.length === f.size &&
            createHash("sha1")
              .update(`blob ${bytes.length}\0`)
              .update(bytes)
              .digest("hex") === f.sha,
          "INVALID_EVIDENCE",
          "Word evidence differs from its immutable blob.",
        );
      text = f.path.endsWith(".docx")
        ? wordText(bytes)
        : bytes.toString("utf8");
    } catch {
      continue;
    } // Unsupported documents are omitted, never invented.
    if (!text.includes("\0") && !containsSecret(text)) {
      const selected =
        /\.(?:md|docx)$/.test(f.path) || f.path === "package.json"
          ? excerpt(f.path, text, f.sha, perFile)
          : focusedExcerpt(
              entry,
              text,
              businessEvidenceFocus(f.path),
              perFile,
              businessEvidenceAnchor(f.path, text),
            );
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
            selectedPaths: paths,
            manifestEntries,
          }),
        )
        .digest("hex"),
      eligibleFileCount: files.length,
      discoveryVersion: paths.length ? undefined : "whole-repository-v1",
      indexedFileCount: manifestEntries.length,
      businessDocumentPaths: contextFiles.filter((path) =>
        path.endsWith(".docx"),
      ),
      selectedPaths: paths,
      repositoryEligibleFileCount: eligible.length,
      omittedEligibleFileCount: eligible.length - files.length,
      inspectedPaths: contextFiles,
      languageFileCounts: allEntries.reduce(
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
    snapshotPaths?: string[];
    snapshotSummary?: { selectedPaths?: string[]; discoveryVersion?: string };
    profile?: string;
  },
  focus: string,
  evidence: { path: string; startLine: number; endLine: number }[] = [],
  purpose: "matching" | "planning" | "knowledge" = "matching",
) {
  ensure(
    snapshotScopeCurrent(repo),
    "CONTEXT_REQUIRED",
    "Prepare the currently selected snapshot paths before retrieving repository evidence.",
  );
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
  const token = await installationToken(repo.installationId);
  const current = await github(`/repos/${repo.fullName}`, token);
  ensure(
    current.id === repo.providerId,
    "FORBIDDEN",
    "Repository identity changed.",
  );
  let entries = repo.manifestEntries;
  if (repo.snapshotSummary?.discoveryVersion === "whole-repository-v1") {
    const tree = await github(
      `/repos/${repo.fullName}/git/trees/${repo.sha}?recursive=1`,
      token,
    );
    ensure(
      !tree.truncated,
      "REPO_TOO_LARGE",
      "Whole-repository discovery is incomplete. No partial tree can establish complete coverage.",
    );
    const ignored = await inspectedIgnorePolicy(tree.tree, async (sha) => {
      const blob = await github(
        `/repos/${repo.fullName}/git/blobs/${sha}`,
        token,
      );
      return Buffer.from(blob.content, "base64").toString("utf8");
    });
    entries = tree.tree
      .filter(
        (f: any) =>
          f.type === "blob" &&
          ["100644", "100755"].includes(f.mode) &&
          !ignored(f.path) &&
          Number.isSafeInteger(f.size) &&
          f.size >= 0 &&
          f.size <= RETRIEVAL_BLOB_LIMIT,
      )
      .map((f: any) => ({
        path: f.path,
        blobSha: f.sha,
        mode: f.mode,
        size: f.size,
      }));
  }
  const requiredPaths = [...new Set(evidence.map((row) => row.path))];
  const projectPaths =
    purpose === "knowledge"
      ? projectContextPaths(entries!, repo.profile ?? "").filter(
          (path) => !requiredPaths.includes(path),
        )
      : [];
  const files = retrievalFiles(
    entries!,
    focus,
    [
      ...requiredPaths,
      ...projectPaths.slice(0, Math.max(0, 12 - requiredPaths.length)),
    ],
    purpose === "planning",
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
        bytes.length <= RETRIEVAL_BLOB_LIMIT &&
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
      cited.length
        ? Math.min(...cited.map((row) => row.startLine))
        : purpose === "planning" && /(?:^|\/)package\.json$/.test(file.path)
          ? 1
          : undefined,
    );
    if (!selected) continue;
    excerpts.push(selected);
    remaining -= selected.content.length;
  }
  validateInspectedContext(excerpts, entries!);
  validateRepositoryEvidence(evidence, excerpts);
  return { excerpts, tree: preparedTree(excerpts), manifestEntries: files };
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
  reviewedPatch: string;
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
  ensure(
    input.title.trim().length > 0 &&
      input.title.length <= 160 &&
      ![...input.title].some((character) => {
        const code = character.charCodeAt(0);
        return code < 32 || code === 127;
      }) &&
      !containsSecret(input.title),
    "POLICY_BLOCKED",
    "The reviewed PR title must be bounded and contain no credentials.",
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
  // Rebuild the reviewed text against authoritative immutable base blobs.
  // Neither guest Git output nor a second file list can change what was approved.
  const reviewed = await verifyLocalPatch(
    input.reviewedPatch,
    input.allowedPaths,
    input.highRisk,
    async (path) => {
      const original = baseTree.tree.find((entry: any) => entry.path === path);
      if (!original) return null;
      ensure(
        original.type === "blob" &&
          ["100644", "100755"].includes(original.mode),
        "POLICY_BLOCKED",
        "Review base is not a regular text file.",
      );
      const blob = await github(`${root}/git/blobs/${original.sha}`, token);
      ensure(
        blob.encoding === "base64" &&
          typeof blob.content === "string" &&
          blob.content.length <= 1400000,
        "POLICY_BLOCKED",
        "Review base exceeds its bound.",
      );
      return Buffer.from(blob.content, "base64").toString("utf8");
    },
  );
  const sort = (files: { path: string; content: string | null }[]) =>
    files
      .map((file) => ({ path: file.path, content: file.content }))
      .sort((a, b) => a.path.localeCompare(b.path));
  ensure(
    JSON.stringify(sort(reviewed.changes)) ===
      JSON.stringify(sort(input.files)),
    "APPROVAL_STALE",
    "Published file contents differ from the exact reviewed patch.",
  );
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
    body: `${marker}\n\nPrepared from an explicitly approved VibeScroller plan. Benefit remains unmeasured.\n\nPrivate source evidence stays in the authenticated application.\n\nDetailed check output and source evidence remain in the authenticated application. Review the private report before merging.`,
  });
  return {
    number: pr.number,
    url: pr.html_url,
    state: prState(pr),
    mergedAt: pr.merged_at ?? undefined,
  };
}
