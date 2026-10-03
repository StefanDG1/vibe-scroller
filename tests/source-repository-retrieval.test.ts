import { expect, it, vi } from "vitest";
import {
  focusedExcerpt,
  retrievalFiles,
  validateInspectedContext,
} from "../packages/repositories/retrieval";
import { validateRepositoryEvidence } from "../packages/repositories/context";
import { retrieveContext } from "../packages/providers/github";
import { createHash, generateKeyPairSync } from "node:crypto";

const file = {
  path: "src/source-deletion.ts",
  blobSha: "a".repeat(40),
  mode: "100644",
  size: 5000,
};
it("retrieves substantive late-file evidence with true line bounds rather than the unrelated prefix", () => {
  const text = [
    ...Array.from({ length: 400 }, () => "// unrelated boilerplate"),
    "export function deleteSource() {",
    "  revokePrivateEvidenceLinks();",
    "  preserveDeletionMarkers();",
    "}",
    ...Array.from({ length: 50 }, () => "// later boilerplate"),
  ].join("\n");
  const row = focusedExcerpt(
    file,
    text,
    "Delete source and revoke private evidence links. Preserve deletion markers.",
    4000,
  )!;
  expect(row.startLine).toBeGreaterThan(380);
  expect(row.content).toContain("revokePrivateEvidenceLinks");
  expect(
    text
      .split("\n")
      .slice(row.startLine - 1, row.endLine)
      .join("\n"),
  ).toBe(row.content);
  validateRepositoryEvidence(
    [{ path: file.path, startLine: 402, endLine: 403 }],
    [row],
  );
  expect(() =>
    validateRepositoryEvidence(
      [{ path: file.path, startLine: 1, endLine: 2 }],
      [row],
    ),
  ).toThrow("INVALID_EVIDENCE");
  expect(focusedExcerpt(file, "x".repeat(5000), "x", 4000)).toBeNull();
});
it("prioritizes relevant or cited safe paths, excludes secrets/symlinks, and validates immutable context", () => {
  const entries = Array.from({ length: 50 }, (_, n) => ({
    ...file,
    path: `src/aaa-${n}.ts`,
  }));
  entries.push(
    file,
    { ...file, path: ".env" },
    { ...file, path: "src/deletion-link.ts", mode: "120000" },
  );
  expect(retrievalFiles(entries, "source deletion")[0]).toEqual(file);
  expect(retrievalFiles(entries, "source deletion")).toHaveLength(24);
  expect(() => retrievalFiles(entries, "deletion", [".env"])).toThrow(
    "CONTEXT_REQUIRED",
  );
  expect(() =>
    retrievalFiles(entries, "deletion", ["src/deletion-link.ts"]),
  ).toThrow();
  const row = focusedExcerpt(
    file,
    "// owned\nremoveSource();",
    "remove source",
    4000,
  )!;
  validateInspectedContext([row], [file]);
  expect(() =>
    validateInspectedContext([{ ...row, blobSha: "b".repeat(40) }], [file]),
  ).toThrow();
  expect(() =>
    validateInspectedContext([{ ...row, endLine: row.endLine + 1 }], [file]),
  ).toThrow();
  expect(() => validateInspectedContext([row, row], [file])).toThrow();
  expect(focusedExcerpt(file, "\0binary", "binary", 4000)).toBeNull();
});
it("includes larger UI components and styles before specification-only matches within the same context bound", () => {
  const component = {
    ...file,
    path: "apps/web/components/mobile-controls.tsx",
    size: 149000,
  };
  const style = { ...file, path: "apps/web/product.css", size: 35000 };
  const entries = [
    ...Array.from({ length: 30 }, (_, n) => ({
      ...file,
      path: `docs/mobile-spacing-${n}.md`,
    })),
    component,
    style,
    { ...file, path: "apps/web/oversized-mobile.tsx", size: 250001 },
  ];
  const selected = retrievalFiles(
    entries,
    "Readable mobile interface and touch button spacing",
  );
  expect(selected).toHaveLength(24);
  expect(selected).toContainEqual(component);
  expect(selected).toContainEqual(style);
  expect(selected.some((entry) => entry.path.includes("oversized"))).toBe(
    false,
  );
  expect(retrievalFiles(entries, "unrelated", [component.path])[0]).toEqual(
    component,
  );
});
it("uses only recorded immutable blobs and rejects changed bytes or uninspected cited lines", async () => {
  const text =
    "// owned synthetic repository\nexport function removeSource() {}";
  const bytes = Buffer.from(text);
  const blobSha = createHash("sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
  const entry = { ...file, blobSha, size: bytes.length };
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  vi.stubEnv("GITHUB_APP_ID", "123");
  vi.stubEnv(
    "GITHUB_APP_PRIVATE_KEY",
    privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  );
  const paths: string[] = [];
  let corrupt = false;
  vi.stubGlobal("fetch", async (url: string) => {
    const path = new URL(url).pathname;
    paths.push(path);
    return new Response(
      JSON.stringify(
        path.endsWith("/access_tokens")
          ? { token: "owned" }
          : path.includes("/git/blobs/")
            ? {
                encoding: "base64",
                content: Buffer.from(
                  corrupt ? text.replace("remove", "change") : text,
                ).toString("base64"),
              }
            : { id: 42 },
      ),
      { status: 200 },
    );
  });
  try {
    const repo = {
      installationId: 1,
      providerId: 42,
      fullName: "owned/synthetic",
      sha: "c".repeat(40),
      manifestEntries: [entry],
    };
    const result = await retrieveContext(repo, "Remove source", [
      { path: file.path, startLine: 2, endLine: 2 },
    ]);
    expect(result.excerpts[0].blobSha).toBe(blobSha);
    expect(paths.some((path) => path.endsWith(`/git/blobs/${blobSha}`))).toBe(
      true,
    );
    expect(paths.some((path) => path.includes("/git/ref/"))).toBe(false);
    corrupt = true;
    await expect(retrieveContext(repo, "remove source")).rejects.toThrow(
      "INVALID_EVIDENCE",
    );
    corrupt = false;
    await expect(
      retrieveContext(repo, "remove source", [
        { path: file.path, startLine: 200, endLine: 200 },
      ]),
    ).rejects.toThrow("INVALID_EVIDENCE");
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});
