import { unzipSync } from "fflate";
import { createHash } from "node:crypto";
import { containsSecret, ensure, safePath, excludedPath } from "../policy";
import type { ManifestEntry } from "./snapshotCache";

export function archiveSnapshot(
  archive: Uint8Array,
  entries: ManifestEntry[],
  allowedPaths: string[],
) {
  ensure(
    archive.length <= 25000000 &&
      entries.length <= 2048 &&
      entries.every(
        (file) =>
          ["100644", "100755"].includes(file.mode) &&
          !excludedPath(file.path) &&
          Number.isSafeInteger(file.size) &&
          file.size >= 0 &&
          file.size <= 1000000,
      ) &&
      entries.reduce((sum, file) => sum + file.size, 0) <= 20000000,
    "REPO_TOO_LARGE",
    "The isolated text snapshot exceeds its reviewed size or file bounds.",
  );
  const byPath = new Map(entries.map((file) => [file.path, file]));
  let root: string | undefined;
  const seen = new Set<string>();
  const blobs = unzipSync(archive, {
    filter: (item) => {
      const parts = item.name.split("/");
      ensure(
        parts.length >= 2 &&
          safePath(parts[0]) &&
          parts.slice(1, -1).every(Boolean) &&
          !item.name.includes("\\") &&
          !parts.includes("..") &&
          !parts.includes(".") &&
          !item.name.startsWith("/") &&
          !seen.has(item.name),
        "POLICY_BLOCKED",
        "Repository archive contains an unsafe path.",
      );
      root ??= parts[0];
      seen.add(item.name);
      ensure(
        root === parts[0],
        "POLICY_BLOCKED",
        "Repository archive has inconsistent roots.",
      );
      const path = parts.slice(1).join("/");
      const file = byPath.get(path);
      if (!file) return false;
      ensure(
        item.originalSize === file.size && item.originalSize <= 1000000,
        "INVALID_EVIDENCE",
        "Archive entry size differs from its immutable manifest.",
      );
      return true;
    },
  });
  const base: { path: string; content: string; mode: string }[] = [],
    omitted: string[] = [];
  for (const file of entries) {
    const bytes = blobs[`${root}/${file.path}`];
    ensure(
      bytes &&
        bytes.length === file.size &&
        createHash("sha1")
          .update(`blob ${bytes.length}\0`)
          .update(bytes)
          .digest("hex") === file.blobSha,
      "INVALID_EVIDENCE",
      "Repository archive differs from its approved immutable tree.",
    );
    const content = new TextDecoder("utf-8", { fatal: true });
    let text: string;
    try {
      text = content.decode(bytes);
    } catch {
      text = "\0";
    }
    if (text.includes("\0") || containsSecret(text)) {
      ensure(
        !allowedPaths.includes(file.path),
        "POLICY_BLOCKED",
        "An approved file contains binary or credential data.",
      );
      omitted.push(file.path);
    } else base.push({ path: file.path, content: text, mode: file.mode });
  }
  return { base, omitted };
}
