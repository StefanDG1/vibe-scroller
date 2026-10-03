import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { api } from "../../convex/_generated/api";
const state = vi.hoisted(() => ({
  error: new Error("synthetic"),
  invoke: vi.fn(),
}));
vi.mock("@/lib/backend", () => ({
  api,
  configured: () => true,
  backend: async () => ({
    mutation: state.invoke,
    action: state.invoke,
    query: state.invoke,
  }),
}));
vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth: async () => ({ user: { id: "synthetic-owner" } }),
}));
import { POST } from "./app/api/product/route";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});
it.each(["OPERATOR_BUDGET_REACHED", "REPO_TOO_LARGE"])(
  "shows the actual %s refusal without provider text or a retry side effect",
  async (code) => {
    vi.stubEnv("APP_URL", "https://synthetic.example.test");
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    state.invoke.mockRejectedValue(
      Object.assign(new Error("wrapped upstream error"), {
        data: `${code}: private upstream diagnostic must not leave the server`,
      }),
    );
    const response = await POST(
      new NextRequest("https://synthetic.example.test/api/product", {
        method: "POST",
        headers: { Origin: "https://synthetic.example.test" },
        body: JSON.stringify({
          operation: "knowledgeEvaluate",
          args: { id: "synthetic-topic" },
        }),
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.code).toBe(code);
    expect(body.error).not.toContain("private upstream diagnostic");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(state.invoke).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(logger.mock.calls)).not.toContain(
      "private upstream diagnostic",
    );
  },
);
