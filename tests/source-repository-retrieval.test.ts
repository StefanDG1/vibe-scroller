import { expect, it, vi } from "vitest";
import {
  focusedExcerpt,
  retrievalFiles,
  projectContextPaths,
  knowledgeRetrievalFocus,
  validateInspectedContext,
} from "../packages/repositories/retrieval";
import { validateRepositoryEvidence } from "../packages/repositories/context";
import { retrieveContext, snapshot } from "../packages/providers/github";
import { createHash, generateKeyPairSync } from "node:crypto";

const file = {
  path: "src/source-deletion.ts",
  blobSha: "a".repeat(40),
  mode: "100644",
  size: 5000,
};
it("retains candidate navigation evidence despite a detailed unrelated business profile", () => {
  const profile = Array.from({ length: 90 }, (_, n) => `foundation${n}`).join(
    " ",
  );
  const insights = [
    {
      title: "Question navigation",
      claim: "Offer reading paths",
      interpretation: "Inspect library discovery",
    },
  ];
  const target = {
    ...file,
    path: "apps/marketing/components/library/navigation.tsx",
  };
  const entries = [
    target,
    ...Array.from({ length: 35 }, (_, n) => ({
      ...file,
      path: `apps/starter/foundation${n}.tsx`,
    })),
  ];
  expect(
    retrievalFiles(
      entries,
      JSON.stringify({ confirmedBusinessContext: profile, insights }),
    ),
  ).not.toContain(target);
  const focus = knowledgeRetrievalFocus(profile, insights);
  expect(retrievalFiles(entries, focus)).toContain(target);
  const text = [
    ...Array.from(
      { length: 80 },
      () => "// foundation0 foundation1 foundation2",
    ),
    "export const navigation = 'question library reading paths discovery';",
  ].join("\n");
  expect(focusedExcerpt(target, text, focus, 1000)?.content).toContain(
    "export const navigation",
  );
});
it("anchors project knowledge in confirmed current paths while retaining safe inspection bounds", () => {
  const code = {
    ...file,
    path: "apps/marketing/components/publication/shell.tsx",
  };
  const facts = { ...file, path: "data/current-applications.yaml" };
  const entries = [
    ...Array.from({ length: 35 }, (_, n) => ({
      ...file,
      path: `apps/starter/app/marketing-${n}/page.tsx`,
    })),
    code,
    facts,
    { ...file, path: ".env" },
    { ...file, path: "src/link.ts", mode: "120000" },
    { ...file, path: "src/oversized.ts", size: 250001 },
  ];
  const profile = `${code.path} ${facts.path} .env src/link.ts src/oversized.ts foreign/private.ts`;
  const preferred = projectContextPaths(entries, profile);
  expect(preferred).toEqual([code.path, facts.path]);
  const selected = retrievalFiles(
    entries,
    "marketing conversion mobile",
    preferred,
  );
  expect(selected.slice(0, 2)).toEqual([code, facts]);
  expect(selected).toHaveLength(24);
  expect(projectContextPaths(entries, "Unknown future implementation")).toEqual(
    [],
  );
  const calculator = {
    ...file,
    path: "apps/marketing/components/calculator/calculator.tsx",
  };
  expect(
    projectContextPaths([calculator], "Current calculator/calculator.tsx"),
  ).toEqual([calculator.path]);
  expect(
    projectContextPaths(
      [
        { ...file, path: "apps/starter/app/page.tsx" },
        { ...file, path: "apps/marketing/app/page.tsx" },
      ],
      "Inspect app/page.tsx",
    ),
  ).toEqual([]);
  expect(
    projectContextPaths(
      Array.from({ length: 20 }, (_, n) => ({
        ...file,
        path: `src/current-${n}.ts`,
      })),
      Array.from({ length: 20 }, (_, n) => `src/current-${n}.ts`).join(" "),
    ),
  ).toHaveLength(6);
});
it("prepares explicit scope in an oversized tree without reading omitted blobs or relaxing bounds", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  vi.stubEnv("GITHUB_APP_ID", "123");
  vi.stubEnv(
    "GITHUB_APP_PRIVATE_KEY",
    privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  );
  const files = [
    {
      path: "src/main.ts",
      sha: "a".repeat(40),
      type: "blob",
      mode: "100644",
      size: 30,
    },
    {
      path: "src/.env",
      sha: "b".repeat(40),
      type: "blob",
      mode: "100644",
      size: 30,
    },
    ...Array.from({ length: 5100 }, (_, n) => ({
      path: `curriculum/lesson-${n}.json`,
      sha: "c".repeat(40),
      type: "blob",
      mode: "100644",
      size: 30,
    })),
  ];
  const reads: string[] = [];
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    const path = new URL(url).pathname;
    calls.push(path);
    if (path.includes("/git/blobs/")) reads.push(path);
    return Response.json(
      path.endsWith("/access_tokens")
        ? { token: "synthetic" }
        : path === "/installation/repositories"
          ? { repositories: [{ id: 42, full_name: "owned/synthetic" }] }
          : path.includes("/git/ref/")
            ? { object: { sha: "d".repeat(40) } }
            : path.includes("/git/trees/")
              ? { truncated: false, tree: files }
              : path.includes("/git/blobs/")
                ? {
                    content: Buffer.from(
                      "export const synthetic = true;",
                    ).toString("base64"),
                  }
                : { id: 42, default_branch: "main" },
    );
  });
  try {
    await expect(
      snapshot(1, 42, "owned/synthetic", null, [".env"]),
    ).rejects.toThrow("INVALID_INPUT");
    expect(calls).toHaveLength(0);
    const whole = await snapshot(1, 42, "owned/synthetic");
    expect(whole.snapshotSummary).toMatchObject({
      discoveryVersion: "whole-repository-v1",
      eligibleFileCount: 5101,
      omittedEligibleFileCount: 0,
    });
    expect(whole.manifestEntries.length).toBeLessThan(5001);
    expect(
      Buffer.byteLength(
        JSON.stringify(whole.manifestEntries) + JSON.stringify(whole.manifest),
      ),
    ).toBeLessThanOrEqual(600000);
    reads.length = 0;
    await expect(
      snapshot(1, 42, "owned/synthetic", null, ["src2"]),
    ).rejects.toThrow("CONTEXT_REQUIRED");
    const selected = await snapshot(1, 42, "owned/synthetic", null, ["src/"]);
    expect(selected.manifest).toEqual(["src/main.ts"]);
    expect(reads).toEqual([
      `/repos/owned/synthetic/git/blobs/${"a".repeat(40)}`,
    ]);
    expect(selected.snapshotSummary).toMatchObject({
      selectedPaths: ["src"],
      eligibleFileCount: 1,
      repositoryEligibleFileCount: 5101,
      omittedEligibleFileCount: 5100,
    });
    expect(selected.snapshotSummary.inspectedPaths).toEqual(["src/main.ts"]);
    const readCount = calls.length;
    await expect(
      retrieveContext(
        {
          installationId: 1,
          providerId: 42,
          fullName: "owned/synthetic",
          ...selected,
          snapshotPaths: ["src", "docs"],
        },
        "synthetic",
      ),
    ).rejects.toThrow("CONTEXT_REQUIRED");
    expect(calls).toHaveLength(readCount);
    await expect(
      snapshot(1, 42, "owned/synthetic", null, ["curriculum"]),
    ).rejects.toThrow("REPO_TOO_LARGE");
    // The byte bound must still reject a selection below the file-count bound.
    files.splice(
      0,
      files.length,
      ...Array.from({ length: 2000 }, (_, n) => ({
        path: `src/${"x".repeat(230)}${n}.json`,
        sha: "e".repeat(40),
        type: "blob",
        mode: "100644",
        size: 30,
      })),
    );
    await expect(
      snapshot(1, 42, "owned/synthetic", null, ["src"]),
    ).rejects.toThrow("REPO_TOO_LARGE");
    expect(reads).toHaveLength(1);
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});
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
it("keeps the larger component in the actual snapshot manifest before bounded retrieval", async () => {
  const text =
    "export const minimumTouchSize = 44;\n" +
    "// owned control implementation\n".repeat(4800);
  const bytes = Buffer.from(text);
  const blobSha = createHash("sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
  const component = {
    path: "apps/web/mobile-controls.tsx",
    sha: blobSha,
    type: "blob",
    mode: "100644",
    size: bytes.length,
  };
  expect(bytes.length).toBeGreaterThan(100000);
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  vi.stubEnv("GITHUB_APP_ID", "123");
  vi.stubEnv(
    "GITHUB_APP_PRIVATE_KEY",
    privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  );
  vi.stubGlobal("fetch", async (url: string) => {
    const path = new URL(url).pathname;
    return Response.json(
      path.endsWith("/access_tokens")
        ? { token: "owned" }
        : path === "/installation/repositories"
          ? { repositories: [{ id: 42, full_name: "owned/synthetic" }] }
          : path.includes("/git/ref/")
            ? { object: { sha: "c".repeat(40) } }
            : path.includes("/git/trees/")
              ? {
                  truncated: false,
                  tree: [
                    component,
                    { ...component, path: ".env", size: 1 },
                    { ...component, path: "src/link.tsx", mode: "120000" },
                    { ...component, path: "src/oversized.tsx", size: 250001 },
                    { ...component, path: "src/invalid.tsx", size: -1 },
                  ],
                }
              : path.includes("/git/blobs/")
                ? { encoding: "base64", content: bytes.toString("base64") }
                : { id: 42, default_branch: "main" },
    );
  });
  try {
    const observed = await snapshot(1, 42, "owned/synthetic");
    expect(observed.manifest).toEqual([component.path]);
    const inspected = await retrieveContext(
      {
        installationId: 1,
        providerId: 42,
        fullName: "owned/synthetic",
        ...observed,
      },
      "mobile touch controls",
    );
    expect(inspected.excerpts[0].content).toContain("minimumTouchSize = 44");
    expect(inspected.excerpts[0].content.length).toBeLessThanOrEqual(4000);
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
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
