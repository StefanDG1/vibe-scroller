import { afterEach, expect, it, vi } from "vitest";
import { Sandbox } from "@vercel/sandbox";
import { createJobSandbox } from "../packages/providers/sandbox";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function broker(expiresAt: number) {
  vi.stubEnv("VERCEL_SANDBOX_TOKEN", "");
  vi.stubEnv("CLOUD_SANDBOX_PROVIDER", "vercel");
  vi.stubEnv("VERCEL_SANDBOX_TEAM_ID", "team_synthetic");
  vi.stubEnv("VERCEL_SANDBOX_PROJECT_ID", "prj_synthetic");
  vi.stubEnv("APP_URL", "https://synthetic.invalid");
  vi.stubEnv(
    "SANDBOX_BRIDGE_URL",
    "https://synthetic.invalid/api/internal/sandbox-credentials",
  );
  vi.stubEnv("SANDBOX_BRIDGE_SECRET", "01".repeat(32));
  vi.stubEnv("VERCEL_MEDIA_SNAPSHOT", "snap_oldsynthetic123");
  vi.stubEnv("VERCEL_CODING_SNAPSHOT", "snap_oldsynthetic456");
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            token: "synthetic-machine-only",
            teamId: "team_synthetic",
            projectId: "prj_synthetic",
            snapshots: {
              media: { snapshotId: "snap_newsynthetic123", expiresAt },
              coding: { snapshotId: "snap_newsynthetic456", expiresAt },
            },
          }),
          { status: 200 },
        ),
    ),
  );
}

it("blocks expired broker-selected images before compute and never falls back to the old configured seed", async () => {
  broker(Date.now() - 1000);
  const create = vi.spyOn(Sandbox, "create");
  for (const kind of ["media", "coding", "acquisition"] as const)
    await expect(
      createJobSandbox(kind, 60, kind === "acquisition" ? ["example.com"] : []),
    ).rejects.toThrow("SETUP_REQUIRED");
  expect(create).not.toHaveBeenCalled();
});

it("uses the active project-scoped replacement for each worker kind without passing broker metadata into the SDK", async () => {
  broker(Date.now() + 86400000);
  const sdk = {
    name: "synthetic-worker",
    runCommand: vi.fn(async () => ({
      exitCode: 0,
      stdout: async () => "",
      stderr: async () => "",
    })),
    stop: vi.fn(),
    delete: vi.fn(),
  };
  const create = vi
    .spyOn(Sandbox, "create")
    .mockResolvedValue(
      sdk as unknown as Awaited<ReturnType<typeof Sandbox.create>>,
    );
  for (const kind of ["media", "coding", "acquisition"] as const) {
    const vm = await createJobSandbox(
      kind,
      60,
      kind === "acquisition" ? ["example.com"] : [],
    );
    expect(create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        projectId: "prj_synthetic",
        teamId: "team_synthetic",
        persistent: false,
        source: {
          type: "snapshot",
          snapshotId:
            kind === "coding" ? "snap_newsynthetic456" : "snap_newsynthetic123",
        },
      }),
    );
    expect(create.mock.calls.at(-1)?.[0]).not.toHaveProperty("snapshots");
    await vm.kill();
  }
});
