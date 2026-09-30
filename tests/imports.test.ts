import { describe, it, expect } from "vitest";
import { parseLinkImport } from "../packages/imports";
describe("link import parser", () => {
  it("preserves quoted CSV collections and original dates while classifying bad rows", () => {
    const rows = parseLinkImport(
      'url,title,collection,saved_at\r\nhttps://youtube.com/watch?v=x,"One, two",Research,2025-01-01T00:00:00Z\r\nhttps://example.com/post,Unsupported,,\r\nfile:///secrets,Invalid,,',
      "csv",
    );
    expect(rows[0]).toMatchObject({
      title: "One, two",
      collection: "Research",
      savedAt: Date.UTC(2025, 0, 1),
    });
    expect(rows[1].problem).toBe("unsupported");
    expect(rows[2].problem).toBe("invalid");
  });
  it("rejects excess rows, malformed quotes, invalid dates and unrelated archive fields", () => {
    expect(() =>
      parseLinkImport(
        JSON.stringify(
          Array(501).fill({ url: "https://youtube.com/watch?v=x" }),
        ),
        "json",
      ),
    ).toThrow();
    expect(() =>
      parseLinkImport(
        'url,title\nhttps://youtube.com/watch?v=x,"unfinished',
        "csv",
      ),
    ).toThrow();
    expect(
      parseLinkImport(
        '[{"url":"https://youtube.com/watch?v=x","saved_at":"2025-02-31T00:00:00Z"}]',
        "json",
      )[0].problem,
    ).toBe("invalid");
    expect(
      parseLinkImport(
        '[{"url":"https://youtube.com/watch?v=x","contacts":[]}]',
        "json",
      )[0].problem,
    ).toBe("invalid");
  });
});
