import { describe, expect, it } from "vitest";
import {
  acquisitionManifest,
  acquisitionMessage,
  acquisitionPolicy,
} from "../packages/media/acquisition";
import release from "../infra/downloader.json";
import { acquirer } from "../packages/media/acquirer";
import { acquisitionIsolationCommand } from "../packages/providers/acquisition-isolation";
describe("permitted source acquisition", () => {
  it("restricts retrieval to single supported source identifiers and strips tracking", () => {
    expect(
      acquisitionPolicy(
        "https://www.instagram.com/reel/Synthetic123/?igsh=private",
      ),
    ).toMatchObject({
      platform: "instagram",
      url: "https://www.instagram.com/reel/Synthetic123/",
    });
    for (const source of [
      "http://instagram.com/reel/Synthetic123/",
      "https://instagram.com@localhost/reel/Synthetic123/",
      "https://instagram.com/",
      "https://instagram.com/%2e%2e/private",
      "https://youtube.com/playlist?list=x",
      "https://youtu.be/invalid-id",
      "https://vimeo.com/user/123456",
      "https://vm.tiktok.com/../secret",
      "https://127.0.0.1/watch?v=BaW_jenozKc",
      "https://instagram.com:444/reel/Synthetic123/",
    ])
      expect(() => acquisitionPolicy(source)).toThrow();
    expect(
      acquisitionPolicy("https://youtube.com/watch?v=BaW_jenozKc").domains,
    ).not.toContain("*.google.com");
  });
  it("requires measured media bounds, rejects leaked credentials, and distinguishes platform refusal", () => {
    const valid = {
      schemaVersion: "1.0.0",
      status: "acquired",
      title: "Owned sample",
      description: "Untrusted source text",
      durationSeconds: 8,
      byteLength: 100,
      extractor: "Test",
      downloaderVersion: release.version,
    };
    expect(acquisitionManifest.parse(valid)).toEqual(valid);
    for (const value of [
      { ...valid, byteLength: 250000001 },
      { ...valid, durationSeconds: 601 },
      { ...valid, byteLength: undefined },
      { ...valid, status: "success" },
      { ...valid, cookie: "private" },
      { ...valid, description: `sk_live_${"a".repeat(32)}` },
    ])
      expect(acquisitionManifest.safeParse(value).success).toBe(false);
    expect(acquisitionMessage("rate_limited")).toContain("rate limit");
    expect(acquisitionMessage("needs_auth")).toContain("No login");
    expect(acquisitionMessage("unsupported")).toContain("not supported");
  });
  it("keeps the packaged worker pinned and enforces independent network and subprocess bounds", () => {
    expect(acquirer).toContain(`VERSION = '${release.version}'`);
    expect(acquirer).toContain("start_new_session=True");
    expect(acquirer).toContain("--ignore-config");
    expect(acquirer).not.toContain("--cookies");
    expect(acquisitionIsolationCommand).toContain("169.254.0.0/16");
    expect(acquisitionIsolationCommand).toContain("::ffff:0:0/96");
  });
});
