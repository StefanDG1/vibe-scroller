import { expect, it, vi } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { createHash } from "node:crypto";
import { archiveSnapshot } from "../packages/repositories/archive";
import { repositoryArchive } from "../packages/providers/github";
import { checkPatch } from "../packages/providers/cloud";
import type { JobSandbox } from "../packages/providers/sandbox";

const text = "Owned synthetic repository documentation.";
const entry = {
  path: "README.md",
  mode: "100644",
  size: Buffer.byteLength(text),
  blobSha: createHash("sha1")
    .update(`blob ${Buffer.byteLength(text)}\0`)
    .update(text)
    .digest("hex"),
};
it("assembles only selected safe immutable files without extracting archive paths", () => {
  const zip = zipSync({
    "owned-root/README.md": strToU8(text),
    "owned-root/.env": strToU8("owned excluded marker"),
    "owned-root/private/unselected.txt": strToU8("not selected"),
  });
  expect(archiveSnapshot(zip, [entry], ["README.md"])).toEqual({
    base: [{ path: "README.md", content: text, mode: "100644" }],
    omitted: [],
  });
  expect(() =>
    archiveSnapshot(
      zip,
      [{ ...entry, blobSha: "a".repeat(40) }],
      ["README.md"],
    ),
  ).toThrow("INVALID_EVIDENCE");
  expect(() => archiveSnapshot(zip, [{ ...entry, size: 1000001 }], [])).toThrow(
    "REPO_TOO_LARGE",
  );
  expect(() =>
    archiveSnapshot(zip, [{ ...entry, mode: "120000" }], []),
  ).toThrow();
  expect(() =>
    archiveSnapshot(zip, [{ ...entry, path: ".env" }], []),
  ).toThrow();
  expect(() =>
    archiveSnapshot(
      zipSync({ "owned-root/README.md": strToU8(text + "changed") }),
      [entry],
      [],
    ),
  ).toThrow("INVALID_EVIDENCE");
});
it("rejects traversal and mixed roots even in unselected entries, and refuses binary approved files", () => {
  for (const unsafe of [
    "../outside.txt",
    "owned-root/../outside.txt",
    "owned-root/src//test.ts",
    "other-root/unselected.txt",
  ]) {
    expect(() =>
      archiveSnapshot(
        zipSync({
          "owned-root/README.md": strToU8(text),
          [unsafe]: strToU8("owned"),
        }),
        [entry],
        [],
      ),
    ).toThrow("POLICY_BLOCKED");
  }
  const bytes = new Uint8Array([255, 254, 253]);
  const binary = {
    ...entry,
    size: bytes.length,
    blobSha: createHash("sha1")
      .update(`blob ${bytes.length}\0`)
      .update(bytes)
      .digest("hex"),
  };
  const zip = zipSync({ "owned-root/README.md": bytes });
  expect(archiveSnapshot(zip, [binary], [])).toEqual({
    base: [],
    omitted: ["README.md"],
  });
  expect(() => archiveSnapshot(zip, [binary], ["README.md"])).toThrow(
    "POLICY_BLOCKED",
  );
});
it("allows only GitHub's exact archive redirect, bounds downloads, and never forwards the installation credential", async () => {
  const sha = "b".repeat(40),
    calls: { url: string; auth: boolean }[] = [];
  let bad = false,
    large = false;
  vi.stubGlobal("fetch", async (url: string | URL, options: RequestInit) => {
    calls.push({
      url: String(url),
      auth: !!(options.headers as Record<string, string> | undefined)
        ?.Authorization,
    });
    return calls.length % 2 === 1
      ? new Response(null, {
          status: 302,
          headers: {
            location: bad
              ? `https://untrusted.example/owned/repo/legacy.zip/${sha}`
              : `https://codeload.github.com/owned/repo/legacy.zip/${sha}?token=owned`,
          },
        })
      : new Response(new Uint8Array([1, 2, 3]), {
          headers: { "content-length": large ? "25000001" : "3" },
        });
  });
  try {
    expect(
      await repositoryArchive("owned/repo", sha, "owned-credential"),
    ).toEqual(new Uint8Array([1, 2, 3]));
    expect(calls.map((call) => call.auth)).toEqual([true, false]);
    calls.length = 0;
    bad = true;
    await expect(repositoryArchive("owned/repo", sha, "owned")).rejects.toThrow(
      "POLICY_BLOCKED",
    );
    expect(calls).toHaveLength(1);
    calls.length = 0;
    bad = false;
    large = true;
    await expect(repositoryArchive("owned/repo", sha, "owned")).rejects.toThrow(
      "REPO_TOO_LARGE",
    );
  } finally {
    vi.unstubAllGlobals();
  }
});
it("preserves executable file modes without shell expansion and never chmods a deleted file after the patch", async () => {
  const commands: string[] = [];
  const sandbox = {
    verifySnapshot: async () => {},
    files: { write: async () => {}, remove: async () => {} },
    commands: {
      run: async (command: string) => {
        commands.push(command);
        return { exitCode: 0, stdout: "", stderr: "" };
      },
    },
  } as unknown as JobSandbox;
  await checkPatch(
    sandbox,
    [
      { path: "scripts/owned'canary.sh", content: "owned", mode: "100755" },
      { path: "scripts/retained.sh", content: "owned", mode: "100755" },
    ],
    [
      { path: "scripts/owned'canary.sh", content: null },
      { path: "scripts/retained.sh", content: "updated owned" },
    ],
    ["printf 'owned test'"],
  );
  const chmod = commands.filter((command) => command.startsWith("chmod"));
  expect(chmod).toHaveLength(2);
  expect(chmod[0]).toContain("'\\''");
  expect(chmod[1]).toBe("chmod 755 -- '/home/user/job/scripts/retained.sh'");
  expect(commands.indexOf(chmod[0])).toBeLessThan(
    commands.findIndex((command) => command.includes("commit -qm baseline")),
  );
});
