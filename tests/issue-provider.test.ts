import { afterEach, expect, it, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import {
  createIssue,
  findIssue,
  issueAccess,
} from "../packages/providers/issues";
import { discoverRepositories } from "../packages/providers/github-discovery";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("requests narrow issue permissions, verifies target/visibility and refuses permission downgrade", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  vi.stubEnv("GITHUB_APP_ID", "1");
  vi.stubEnv(
    "GITHUB_APP_PRIVATE_KEY",
    privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  );
  const requests: any[] = [];
  let permission = "write",
    privateRepo = true;
  vi.stubGlobal("fetch", async (url: string, opts: any) => {
    requests.push({
      path: new URL(url).pathname,
      method: opts.method,
      body: opts.body ? JSON.parse(opts.body) : undefined,
    });
    return Response.json(
      url.includes("access_tokens")
        ? { token: "synthetic-token", permissions: { issues: permission } }
        : {
            id: 42,
            full_name: "owned/test",
            private: privateRepo,
            has_issues: true,
            archived: false,
          },
    );
  });
  const repo = { installationId: 1, providerId: 42, fullName: "owned/test" };
  expect((await issueAccess(repo)).visibility).toBe("private");
  expect(requests[0].body).toEqual({
    repository_ids: [42],
    permissions: { issues: "write", contents: "read" },
  });
  privateRepo = false;
  expect((await issueAccess(repo)).visibility).toBe("public");
  permission = "read";
  await expect(issueAccess(repo)).rejects.toThrow("FORBIDDEN");
  expect((await issueAccess(repo, false)).visibility).toBe("public");
  expect(
    requests.every(
      (r) => !r.path.includes("/git/") && !r.path.endsWith("/pulls"),
    ),
  ).toBe(true);
});
it("sends exact title/body once, treats incomplete receipts as unknown and reconciles beyond the first page", async () => {
  const calls: any[] = [],
    body =
      "Exact reviewed body\n\n<!-- vibescroller-issue:synthetic-unique -->";
  let incomplete = false;
  vi.stubGlobal("fetch", async (url: string, opts: any) => {
    calls.push({
      url,
      method: opts.method,
      payload: opts.body ? JSON.parse(opts.body) : undefined,
    });
    if (opts.method === "POST")
      return Response.json(
        incomplete
          ? { number: 1, title: "Unexpected" }
          : {
              number: 1,
              html_url: "https://github.com/owned/test/issues/1",
              title: "Reviewed",
              body,
              state: "open",
            },
      );
    const page = new URL(url).searchParams.get("page");
    return Response.json(
      page === "1"
        ? Array.from({ length: 100 }, (_, i) => ({
            number: 1000 + i,
            body: "unrelated",
          }))
        : [{ number: 1, body, state: "closed" }],
    );
  });
  expect(
    await createIssue("synthetic-token", "owned/test", "Reviewed", body),
  ).toMatchObject({ number: 1 });
  expect(calls[0].payload).toEqual({ title: "Reviewed", body });
  incomplete = true;
  await expect(
    createIssue("synthetic-token", "owned/test", "Reviewed", body),
  ).rejects.toThrow("PUBLICATION_UNKNOWN");
  const found = await findIssue(
    "synthetic-token",
    "owned/test",
    "<!-- vibescroller-issue:synthetic-unique -->",
  );
  expect(found.number).toBe(1);
  expect(found.state).toBe("closed");
  const before = calls.filter((c) => c.method === "POST").length;
  expect(
    await findIssue("synthetic-token", "owned/test", "absent-marker"),
  ).toBeNull();
  expect(calls.filter((c) => c.method === "POST")).toHaveLength(before);
});
it("discovers multiple installations and later repository pages without retrieving unselected content", async () => {
  vi.stubEnv("GITHUB_APP_ID", "1");
  const paths: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    paths.push(new URL(url).pathname);
    if (url.includes("/user/installations?"))
      return Response.json({
        installations: [
          { id: 10, app_id: 1 },
          { id: 11, app_id: 1 },
          { id: 12, app_id: 999 },
        ],
      });
    const second = new URL(url).searchParams.get("page") === "2",
      first = url.includes("/10/");
    return Response.json({
      repositories:
        first && !second
          ? Array.from({ length: 100 }, (_, i) => ({
              id: i + 100,
              full_name: `owned/synthetic-${i}`,
              permissions: { push: true },
            }))
          : [
              {
                id: first ? 201 : 300,
                full_name: first ? "owned/later" : "other/restricted",
                permissions: { push: true },
              },
            ],
    });
  });
  const installations = await discoverRepositories("synthetic-token");
  expect(installations).toHaveLength(2);
  expect(installations[0].repositories).toHaveLength(101);
  expect(paths.every((p) => p.startsWith("/user/installations"))).toBe(true);
});
