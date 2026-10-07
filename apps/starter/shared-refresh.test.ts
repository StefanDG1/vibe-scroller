import { afterEach, expect, it, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { getFunctionName } from "convex/server";
const state = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/backend", () => ({
  api,
  backend: async () => ({ query: state.query }),
}));
import { GET } from "./app/api/workspace/[org]/route";
afterEach(() => {
  vi.resetAllMocks();
});
it("refreshes an explicitly opened source beyond the first grant page and clears it after access loss", async () => {
  let available = true;
  state.query.mockImplementation(async (reference, args) => {
    if (
      getFunctionName(reference) === getFunctionName(api.organizations.details)
    )
      return { name: "Synthetic team", role: "viewer", private: false };
    if (
      getFunctionName(reference) === getFunctionName(api.knowledgeGrants.shared)
    )
      return { items: [], next: "synthetic-next-page" };
    if (
      getFunctionName(reference) ===
      getFunctionName(api.knowledgeGrants.fetchShared)
    ) {
      expect(args).toEqual({
        organizationId: "synthetic-team",
        grantId: "later-page-grant",
        sourceId: "chosen-source",
      });
      if (!available) throw new Error("Private upstream access diagnostic");
      return { title: "Synthetic selected source", revision: 1 };
    }
    throw new Error("Unrelated workspace payload requested");
  });
  const refresh = () =>
    GET(
      new Request(
        "https://synthetic.example.test/api/workspace/synthetic-team?view=shared&sharedGrantId=later-page-grant&sharedSourceId=chosen-source",
      ),
      { params: Promise.resolve({ org: "synthetic-team" }) },
    );
  const first = await refresh();
  expect(first.headers.get("cache-control")).toBe("no-store");
  expect(first.headers.get("referrer-policy")).toBe("no-referrer");
  expect((await first.json()).selectedSharedKnowledge.title).toBe(
    "Synthetic selected source",
  );
  expect(state.query).toHaveBeenCalledTimes(3);
  available = false;
  const second = await refresh();
  const data = await second.json();
  expect(data.selectedSharedKnowledge).toBeUndefined();
  expect(data.sharedKnowledgeError).toContain("unavailable or changed");
  expect(JSON.stringify(data)).not.toContain("Private upstream");
  expect(state.query).toHaveBeenCalledTimes(6);
});
