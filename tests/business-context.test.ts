import { expect, it, vi, afterEach } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { createHash, generateKeyPairSync } from "node:crypto";
import {
  businessEvidenceFiles,
  businessEvidenceFocus,
  businessEvidenceWeight,
  businessEvidenceAnchor,
  boundedDiscoveryIndex,
  profileFields,
} from "../packages/repositories/business-context";
import { focusedExcerpt } from "../packages/repositories/retrieval";
import { wordText } from "../packages/repositories/word-text";
import { retrieveContext } from "../packages/providers/github";
import { serializeBusinessProfile } from "../packages/repositories/business-profile";
it("allows uneven section detail within the unchanged total bound and refuses invalid or oversized profiles", () => {
  const output = Object.fromEntries(
    Object.keys(profileFields).map((field) => [field, "unknown"]),
  );
  output.stage = "Current implementation evidence. ".repeat(20);
  const serialized = serializeBusinessProfile(output);
  expect(serialized).toContain(output.stage);
  expect(serialized.length).toBeLessThan(8000);
  expect(() =>
    serializeBusinessProfile({ ...output, roles: "x".repeat(8000) }),
  ).toThrow();
  expect(() =>
    serializeBusinessProfile({ ...output, unexpected: "injected" }),
  ).toThrow();
  expect(() => serializeBusinessProfile({ ...output, roles: [] })).toThrow();
  const missing = { ...output };
  delete missing.roles;
  expect(() => serializeBusinessProfile(missing)).toThrow();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const entry = (path: string) => ({
  path,
  blobSha: "a".repeat(40),
  mode: "100644",
  size: 100,
});
it("discovers all persona foundations and feature roles without generated files starving their evidence", () => {
  const files = [
    ...Array.from({ length: 8500 }, (_, i) => entry(`convex/seed/${i}.json`)),
    entry("README.md"),
    entry("package.json"),
    entry("convex/schema.ts"),
    entry("convex/_generated/api.js"),
  ];
  for (const role of ["parent", "student", "teacher", "school"]) {
    for (const doc of [
      "research",
      "avatar",
      "offer-brief",
      "necessary-beliefs",
    ])
      files.push(entry(`docs/foundational/${role}/${role}-${doc}.docx`));
    files.push(
      entry(`src/app/${role}/page.tsx`),
      entry(`convex/${role}Progress.ts`),
    );
  }
  files.push(
    entry("src/app/director/page.tsx"),
    entry("convex/directorAnalytics.ts"),
  );
  const selected = businessEvidenceFiles(files);
  expect(selected.some((f) => f.path === "src/app/director/page.tsx")).toBe(
    true,
  );
  expect(selected.filter((f) => f.path.endsWith(".docx"))).toHaveLength(16);
  for (const role of ["parent", "student", "teacher", "school"])
    expect(selected.some((f) => f.path === `src/app/${role}/page.tsx`)).toBe(
      true,
    );
  expect(selected.some((f) => /seed|_generated/.test(f.path))).toBe(false);
  const index = boundedDiscoveryIndex(files);
  expect(index.length).toBeLessThanOrEqual(5000);
  expect(
    Buffer.byteLength(
      JSON.stringify(index) + JSON.stringify(index.map((e) => e.path)),
    ),
  ).toBeLessThanOrEqual(600000);
  expect(index.some((f) => f.path === "convex/schema.ts")).toBe(true);
  expect(
    Object.entries(profileFields).reduce(
      (n, [name, f]) => n + f.limit + name.length + 4,
      0,
    ),
  ).toBeLessThanOrEqual(8000);
});
it("reads only Word body text, rejects entities and oversized or absent main documents", () => {
  const doc = (xml: string) =>
    zipSync({
      "word/document.xml": strToU8(xml),
      "private-attachment.txt": strToU8("never inspect this"),
    });
  expect(
    wordText(
      doc(
        "<w:document><w:p><w:r><w:t>Parents &amp; students</w:t></w:r></w:p><w:p><w:t>Progress</w:t></w:p></w:document>",
      ),
    ),
  ).toContain("Parents & students\nProgress");
  expect(wordText(doc("<w:p><w:t>Safe</w:t></w:p>"))).not.toContain(
    "attachment",
  );
  expect(() =>
    wordText(
      doc(
        '<!DOCTYPE x [<!ENTITY secret SYSTEM "file:///private">]><w:t>&secret;</w:t>',
      ),
    ),
  ).toThrow("INVALID_EVIDENCE");
  expect(() => wordText(doc("x".repeat(1000001)))).toThrow("INVALID_EVIDENCE");
  expect(() =>
    wordText(zipSync({ "word/media/image.png": new Uint8Array([1, 2]) })),
  ).toThrow("INVALID_EVIDENCE");
  expect(() => wordText(new Uint8Array(80))).toThrow();
});
it("retrieves relevant immutable whole-tree evidence outside the bounded discovery cache", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  vi.stubEnv("GITHUB_APP_ID", "synthetic");
  vi.stubEnv(
    "GITHUB_APP_PRIVATE_KEY",
    privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  );
  const text =
    "export function parentProgress() { return 'parent dashboard progress'; }";
  const bytes = Buffer.from(text);
  const sha = createHash("sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
  const tree = [
    {
      path: "z/parentProgress.ts",
      sha,
      type: "blob",
      mode: "100644",
      size: bytes.length,
    },
    { path: "z/.env", sha, type: "blob", mode: "100644", size: bytes.length },
  ];
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    const p = new URL(url).pathname;
    calls.push(p);
    return Response.json(
      p.endsWith("/access_tokens")
        ? { token: "synthetic" }
        : p.includes("/git/trees/")
          ? { truncated: false, tree }
          : p.includes("/git/blobs/")
            ? { encoding: "base64", content: bytes.toString("base64") }
            : { id: 42 },
    );
  });
  const result = await retrieveContext(
    {
      installationId: 1,
      providerId: 42,
      fullName: "owned/synthetic",
      sha: "b".repeat(40),
      manifestEntries: [entry("README.md")],
      snapshotPaths: [],
      snapshotSummary: {
        selectedPaths: [],
        discoveryVersion: "whole-repository-v1",
      },
    },
    "parent dashboard progress",
  );
  expect(result.excerpts.map((e) => e.path)).toEqual(["z/parentProgress.ts"]);
  expect(result.manifestEntries[0].blobSha).toBe(sha);
  expect(calls.some((p) => p.includes(`/git/trees/${"b".repeat(40)}`))).toBe(
    true,
  );
  expect(result.excerpts[0].content).toBe(text);
  tree[0].sha = "c".repeat(40);
  await expect(
    retrieveContext(
      {
        installationId: 1,
        providerId: 42,
        fullName: "owned/synthetic",
        sha: "b".repeat(40),
        manifestEntries: [entry("README.md")],
        snapshotSummary: { discoveryVersion: "whole-repository-v1" },
      },
      "parent",
    ),
  ).rejects.toThrow("INVALID_EVIDENCE");
});

it("prioritizes authoritative role guards and consent evidence over incidental schemas and dashboard density", () => {
  const paths = [
    "convex/schema.ts",
    "convex/auth.ts",
    "convex/lib/auth.ts",
    "src/lib/questions/interactive-graph/schema.ts",
    "convex/parentLinks.ts",
  ];
  const selected = businessEvidenceFiles(paths.map(entry)).map((x) => x.path);
  expect(selected).toContain("convex/lib/auth.ts");
  expect(selected).not.toContain(
    "src/lib/questions/interactive-graph/schema.ts",
  );
  const text = [
    "const dashboard = 'parent student teacher school director dashboard feature progress report';",
    ...Array.from({ length: 40 }, () => "// ordinary content"),
    "const consent = 'approve accept reject revoke consent respondRequest unlink verified entitlement';",
    "requireParentAccess();",
  ].join("\n");
  const inspected = focusedExcerpt(
    entry("convex/parentLinks.ts"),
    text,
    businessEvidenceFocus("convex/parentLinks.ts"),
    1200,
  );
  expect(inspected?.content).toContain("requireParentAccess");
  expect(inspected?.content).not.toContain("const dashboard");
  expect(businessEvidenceWeight("convex/lib/auth.ts")).toBe(2);
  expect(businessEvidenceWeight("convex/parentLinks.ts")).toBe(3);
  expect(businessEvidenceWeight("README.md")).toBe(1);
});

it("anchors consent and active authority grants without inventing ranges in unmatched files", () => {
  const parent = [
    "// ordinary",
    "export const respondToLink = mutation({",
    "  // child approves",
    ...Array.from({ length: 30 }, () => "// guard content"),
  ].join("\n");
  const anchor = businessEvidenceAnchor("convex/parentLinks.ts", parent);
  const result = focusedExcerpt(
    entry("convex/parentLinks.ts"),
    parent,
    businessEvidenceFocus("convex/parentLinks.ts"),
    1000,
    anchor,
  );
  expect(result?.startLine).toBe(2);
  expect(result?.content).toContain("child approves");
  expect(result?.endLine).toBe(
    (result?.startLine ?? 0) + (result?.content.split("\n").length ?? 0) - 1,
  );
  expect(
    businessEvidenceAnchor(
      "convex/lib/auth.ts",
      "const activeGrants = [];\nconst activeSchoolMemberships = [];",
    ),
  ).toBe(2);
  expect(businessEvidenceAnchor("README.md", parent)).toBeUndefined();
  expect(
    businessEvidenceAnchor("convex/parentLinks.ts", "// no known declaration"),
  ).toBeUndefined();
});
