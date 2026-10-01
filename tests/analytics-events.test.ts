import { describe, it, expect } from "vitest";
import {
  safeAnalyticsEvent,
  productAnalyticsEvent,
  publicPageEvent,
} from "../apps/starter/lib/analytics-events";
import { buildVersion } from "../scripts/version.mjs";
describe("Private product analytics", () => {
  it("drops unknown events and strips private or malformed properties", () => {
    expect(
      safeAnalyticsEvent("$autocapture", { url: "https://private.invalid" }),
    ).toBeNull();
    expect(
      safeAnalyticsEvent("source_viewed", {
        kind: "text",
        state: "ready",
        coverage: "caption_only",
        email: "owner@example.invalid",
        title: "Private",
        url: "https://instagram.com/private",
        repository: "owner/repo",
        model: "secret",
      }),
    ).toEqual({
      event: "source_viewed",
      properties: {
        schema_version: "1",
        kind: "text",
        state: "ready",
        coverage: "caption_only",
      },
    });
    expect(
      safeAnalyticsEvent("import_completed", {
        accepted: 9000,
        duplicates: -1,
        waiting: NaN,
      }),
    ).toEqual({
      event: "import_completed",
      properties: { schema_version: "1", accepted: 1000 },
    });
    expect(
      safeAnalyticsEvent("workspace_viewed", {
        view: "/app/private-org?token=secret",
      })?.properties,
    ).toEqual({ schema_version: "1" });
  });
  it("records actual successful operations separately from intent", () => {
    expect(
      productAnalyticsEvent("approvePersonalAnalysis", {}, null)?.properties
        .route,
    ).toBe("personal_chatgpt");
    expect(
      productAnalyticsEvent(
        "importLinks",
        { links: ["private"] },
        { accepted: 4, duplicates: 0, waiting: 4 },
      )?.properties,
    ).toEqual({ schema_version: "1", accepted: 4, duplicates: 0, waiting: 4 });
    expect(
      productAnalyticsEvent("decide", { decision: "rejected" }, null)
        ?.properties.decision,
    ).toBe("rejected");
    expect(productAnalyticsEvent("saveKey", { key: "secret" }, {})).toBeNull();
  });
});
it("versions a commit deterministically without inventing a stable release", () => {
  const sha = "012345abcdef" + "0".repeat(28);
  const run = (args: string[]) =>
    args[0] === "rev-parse" ? sha : "2026-10-01T04:23:07+02:00";
  const a = buildVersion("HEAD", run),
    b = buildVersion("HEAD", run);
  expect(a).toEqual(b);
  expect(a.version).toBe("0.1.0-alpha.20261001022307.g012345abcdef");
  expect(a.commit).toBe(sha);
  expect(() => buildVersion("HEAD", () => "not a commit")).toThrow();
});

it("classifies a page without disclosing its private path or callback data", () => {
  expect(publicPageEvent("/app/private-org/library")?.properties).toEqual({
    schema_version: "1",
    surface: "app",
    page: "app",
  });
  expect(publicPageEvent("/demo")).toBeNull();
  expect(publicPageEvent("/callback")).toBeNull();
  expect(publicPageEvent("/cookies")?.properties.page).toBe("legal");
});
