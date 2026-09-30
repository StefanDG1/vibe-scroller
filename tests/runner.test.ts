import { expect, it, vi } from "vitest";
import { RunnerTransport } from "../packages/runner/transport.mjs";
it("rejects insecure runner URLs and redirects without leaking credentials into URLs", async () => {
  const credential = "a".repeat(43);
  for (const url of [
    "http://example.test",
    "https://user:secret@example.test",
    "https://example.test?token=secret",
  ])
    expect(() => new RunnerTransport(url, credential)).toThrow();
  let observed: any;
  const transport = new RunnerTransport("https://example.test", credential, {
    fetchImpl: async (url: URL, init: any) => {
      observed = { url: String(url), ...init };
      return new Response(JSON.stringify({ lease: null }), {
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  expect(await transport.request("poll")).toEqual({ lease: null });
  expect(observed.url).toBe("https://example.test/runner/v1");
  expect(observed.redirect).toBe("error");
  expect(observed.headers.Authorization).toBe(`Bearer ${credential}`);
  expect(observed.body).not.toContain(credential);
});
it("bounds artifact and response bytes before dispatch or ingestion", async () => {
  let called = false;
  const transport = new RunnerTransport(
    "https://example.test",
    "a".repeat(43),
    {
      fetchImpl: async () => {
        called = true;
        return new Response("x".repeat(1000001), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  );
  await expect(
    transport.request("complete", { patch: "x".repeat(1000001) }),
  ).rejects.toThrow("artifact");
  expect(called).toBe(false);
  await expect(transport.request("poll")).rejects.toThrow("response");
});

import { verifyLocalPatch } from "../packages/runner/patch";
import { createTwoFilesPatch } from "diff";
it("rebuilds a local patch against trusted base text and rejects mismatched or forbidden changes", async () => {
  const patch = createTwoFilesPatch(
    "a/docs/note.md",
    "b/docs/note.md",
    "old\n",
    "new\n",
  );
  const result = await verifyLocalPatch(
    patch,
    ["docs/note.md"],
    false,
    async () => "old\n",
  );
  expect(result.changes).toEqual([{ path: "docs/note.md", content: "new\n" }]);
  expect(result.patch).toContain("+new");
  await expect(
    verifyLocalPatch(patch, ["docs/other.md"], false, async () => "old\n"),
  ).rejects.toThrow();
  await expect(
    verifyLocalPatch(
      patch,
      ["docs/note.md"],
      false,
      async () => "wrong base\n",
    ),
  ).rejects.toThrow("BASE_CHANGED");
  const credentialPatch = createTwoFilesPatch(
    "/dev/null",
    "b/docs/key.md",
    "",
    "sk_test_" + "a".repeat(40),
  );
  await expect(
    verifyLocalPatch(credentialPatch, ["docs/key.md"], false, async () => null),
  ).rejects.toThrow("POLICY_BLOCKED");
});

import { executeJob } from "../packages/runner/runtime.mjs";
import jobFixture from "../fixtures/runner-job.json";
it("uses only the official local subscription and confirms isolation termination before upload", async () => {
  const operations: string[] = [];
  const hash = "f".repeat(64);
  const lease = {
    envelope: {
      ...jobFixture,
      workspaceId: "synthetic-workspace",
      fundingRoute: "local_codex_subscription",
      maxCredits: 0,
      expiresAt: Date.now() + 60000,
      maxRuntimeSeconds: 60,
      executionPolicyId: `windows-reviewed-v1:${hash}`,
      publicationMode: "review_required",
    },
    repository: { id: 1, fullName: "test/synthetic" },
    plan: { tests: ["synthetic check"] },
  };
  const config = {
    workspaceId: "synthetic-workspace",
    repositories: [
      {
        repositoryId: jobFixture.repositoryId,
        providerId: 1,
        fullName: "test/synthetic",
        directory: "C:/synthetic",
      },
    ],
  };
  let handler: any,
    declined = false;
  const server = {
    onEvent: (f: any) => {
      handler = f;
    },
    initialize: async () => {},
    account: async () => ({ account: { type: "chatgpt" } }),
    models: async () => ({
      data: [
        { id: "synthetic-model", model: "synthetic-model", isDefault: true },
      ],
    }),
    start: async () => {
      handler({ id: 1, method: "item/fileChange/requestApproval" });
      queueMicrotask(() =>
        handler({
          method: "turn/completed",
          params: { turn: { status: "completed" } },
        }),
      );
      return { threadId: "synthetic-thread", turnId: "synthetic-turn" };
    },
    deny: () => {
      declined = true;
    },
    close: () => {},
    interrupt: async () => {},
  };
  const adapter = {
    prepare: async () => ({
      handle: "synthetic-handle",
      cwd: "C:/synthetic",
      appServerBinary: "synthetic",
    }),
    check: async () => {
      operations.push("checks");
    },
    terminate: async () => {
      operations.push("terminated");
      return { terminated: true };
    },
    collect: async () => ({
      patch: "synthetic patch",
      report: "synthetic check passed",
    }),
  };
  const transport = {
    request: async (op: string) => {
      operations.push(op);
    },
  };
  await executeJob({
    lease,
    config,
    evidenceHash: hash,
    adapter,
    transport,
    persist: async () => {},
    serverFactory: () => server,
  });
  expect(declined).toBe(true);
  expect(operations).toEqual(["checks", "terminated", "complete"]);
});
it("stops isolated execution after a lost heartbeat and never uploads a result", async () => {
  vi.useFakeTimers();
  try {
    const operations: string[] = [];
    const hash = "f".repeat(64);
    const lease = {
      envelope: {
        ...jobFixture,
        workspaceId: "synthetic-workspace",
        fundingRoute: "local_codex_subscription",
        maxCredits: 0,
        expiresAt: Date.now() + 120000,
        maxRuntimeSeconds: 120,
        executionPolicyId: `windows-reviewed-v1:${hash}`,
        publicationMode: "review_required",
      },
      repository: { id: 1, fullName: "test/synthetic" },
      plan: { tests: [] },
    };
    const config = {
      workspaceId: "synthetic-workspace",
      repositories: [
        {
          repositoryId: jobFixture.repositoryId,
          providerId: 1,
          fullName: "test/synthetic",
        },
      ],
    };
    const server = {
      onEvent: () => {},
      initialize: async () => {},
      account: async () => ({ account: { type: "chatgpt" } }),
      models: async () => ({ data: [{ model: "synthetic", isDefault: true }] }),
      start: async () => ({ threadId: "synthetic", turnId: "synthetic" }),
      close: () => {},
      interrupt: async () => {
        operations.push("interrupt");
      },
    };
    const adapter = {
      prepare: async () => ({
        handle: "synthetic-handle",
        cwd: "C:/synthetic",
      }),
      terminate: async () => {
        operations.push("terminated");
        return { terminated: true };
      },
      check: async () => {},
      collect: async () => {
        throw new Error("must not collect");
      },
    };
    const transport = {
      request: async (op: string) => {
        operations.push(op);
        if (op === "heartbeat") throw new Error("offline");
      },
    };
    const task = executeJob({
      lease,
      config,
      evidenceHash: hash,
      adapter,
      transport,
      persist: async () => {},
      serverFactory: () => server,
    });
    const rejected = expect(task).rejects.toThrow("interrupted");
    await vi.advanceTimersByTimeAsync(15000);
    await rejected;
    expect(operations).toContain("terminated");
    expect(operations).not.toContain("complete");
  } finally {
    vi.useRealTimers();
  }
});
