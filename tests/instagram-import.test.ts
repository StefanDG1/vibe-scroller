import { describe, it, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import {
  previewLinkFile,
  importBatch,
  isSavedFile,
} from "../packages/instagram-import";
import { previewInstagramZip } from "../packages/instagram-zip";

const timestamp = 1750000000;
const modern = [
  {
    timestamp,
    media: [],
    label_values: [
      {
        label: "URL",
        href: "https://www.instagram.com/reel/Synthetic01/?utm_source=test",
      },
      { label: "Caption", value: "Synthetic fixture caption" },
      {
        dict: [
          {
            dict: [
              { label: "Private unrelated field", value: "NEVER_IMPORT_THIS" },
            ],
          },
        ],
      },
    ],
  },
];
describe("Instagram Saved metadata", () => {
  it("maps the observed label-values layout, discards unrelated fields and preserves export timestamps", () => {
    const p = previewLinkFile(JSON.stringify(modern), "saved_posts.json");
    expect(p.links).toEqual([
      {
        url: "https://www.instagram.com/reel/Synthetic01/",
        title: "Synthetic fixture caption",
        saved_at: new Date(timestamp * 1000).toISOString(),
      },
    ]);
    expect(p.reels).toBe(1);
    expect(JSON.stringify(p)).not.toContain("NEVER_IMPORT_THIS");
  });
  it("supports the legacy saved-media container and does not call posts verified videos", () => {
    const p = previewLinkFile(
      JSON.stringify({
        saved_saved_media: [
          {
            title: "Synthetic post",
            string_map_data: {
              "Saved on": {
                href: "https://instagram.com/p/Synthetic02/",
                timestamp,
              },
            },
          },
          {
            string_list_data: [
              { href: "https://instagram.com/p/Synthetic02/", timestamp },
            ],
          },
        ],
      }),
      "saved_posts.json",
    );
    expect(p.posts).toBe(1);
    expect(p.duplicates).toBe(1);
    expect(p.reels).toBe(0);
  });
  it("uses a pure HTML tree, ignores executable content and refuses unrelated files", () => {
    const p = previewLinkFile(
      '<h1>Saved posts</h1><img src="https://malicious.invalid/pixel"><script>globalThis.leaked=true</script><a href="https://www.instagram.com/reel/Synthetic03/?x=1">Synthetic</a><a href="javascript:alert(1)">Bad</a><template><a href="https://instagram.com/reel/Hidden/">hidden</a></template><a href="https://instagram.com/someone/">Profile</a>',
      "saved_posts.html",
    );
    expect(p.links).toEqual([
      { url: "https://www.instagram.com/reel/Synthetic03/" },
    ]);
    expect(() =>
      previewLinkFile(
        '<a href="https://instagram.com/reel/Synthetic03/">x</a>',
        "messages.html",
      ),
    ).toThrow();
    expect(() =>
      previewLinkFile(JSON.stringify(modern), "contacts.json"),
    ).toThrow();
    expect(
      previewLinkFile(
        JSON.stringify([{ ...modern[0], timestamp: Date.now() }]),
        "saved_posts.json",
      ).invalid,
    ).toBe(1);
  });
  it("rejects credential URLs, profile links, ambiguous URL fields and traversal", () => {
    const p = previewLinkFile(
      JSON.stringify([
        {
          label_values: [
            {
              label: "URL",
              href: "https://user:password@instagram.com/reel/X/",
            },
          ],
        },
        {
          label_values: [
            { label: "URL", href: "https://instagram.com/profile/" },
          ],
        },
        {
          label_values: [
            { label: "URL", href: "https://instagram.com/reel/X/" },
            { label: "URL", href: "https://instagram.com/reel/Y/" },
          ],
        },
      ]),
      "saved_posts.json",
    );
    expect(p.links).toHaveLength(0);
    expect(isSavedFile("../saved/saved_posts.json")).toBe(false);
    expect(isSavedFile("messages/saved_posts.json")).toBe(false);
    expect(isSavedFile("your_instagram_activity/saved/saved_posts.json")).toBe(
      true,
    );
  });
  it("extracts only Saved byte ranges from a ZIP and prefers its JSON counterpart", async () => {
    const blob = new Blob([
      zipSync({
        "your_instagram_activity/saved/saved_posts.json": strToU8(
          JSON.stringify(modern),
        ),
        "your_instagram_activity/saved/saved_posts.html": strToU8(
          '<a href="https://instagram.com/reel/Other/">other</a>',
        ),
        "messages/inbox.json": strToU8('{"private":"NEVER_IMPORT_THIS"}'),
        "media/own.mp4": new Uint8Array(100000),
      }),
    ]);
    const p = await previewInstagramZip(blob);
    expect(p.links).toHaveLength(1);
    expect(JSON.stringify(p)).not.toContain("NEVER_IMPORT_THIS");
    expect(p.links[0].url).toContain("Synthetic01");
  });
  it("rejects damaged ZIP checksums, unsafe paths, cancellation and missing Saved metadata", async () => {
    const archive = zipSync(
      { "saved/saved_posts.json": strToU8(JSON.stringify(modern)) },
      { level: 0 },
    );
    const changed = archive.slice();
    changed["saved/saved_posts.json".length + 30] ^= 1;
    await expect(previewInstagramZip(new Blob([changed]))).rejects.toThrow();
    await expect(
      previewInstagramZip(
        new Blob([
          zipSync({
            "../saved/saved_posts.json": strToU8(JSON.stringify(modern)),
          }),
        ]),
      ),
    ).rejects.toThrow();
    const controller = new AbortController();
    controller.abort();
    await expect(
      previewInstagramZip(new Blob([archive]), controller.signal),
    ).rejects.toThrow();
  });
  it("splits normalized batches within both row and HTTP envelope limits", () => {
    const links = Array.from({ length: 1000 }, (_, i) => ({
      url: `https://instagram.com/reel/Synthetic${i}/`,
      title: '\\"'.repeat(80),
    }));
    const batch = importBatch(links, 0);
    expect(batch.count).toBeGreaterThan(0);
    expect(batch.count).toBeLessThanOrEqual(500);
    expect(
      new TextEncoder().encode(
        JSON.stringify({
          operation: "importLinks",
          args: {
            organizationId: "synthetic-workspace",
            key: "synthetic-request-id",
            format: "json",
            text: batch.text,
            rightsAttested: true,
          },
        }),
      ).length,
    ).toBeLessThan(150000);
    expect(JSON.parse(importBatch(links, batch.count).text)[0]).toEqual(
      links[batch.count],
    );
  });
});
