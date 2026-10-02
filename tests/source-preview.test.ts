import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import workflowTest from "@convex-dev/workflow/test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import {
  postPreviewMetadata,
  previewUrl,
  publicPreviewAddress,
} from "../packages/providers/source-preview";
const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => vi.unstubAllEnvs());
it("denies private destinations and unrelated image URLs while preserving valid escaped post metadata", () => {
  for (const address of [
    "127.0.0.1",
    "10.1.1.1",
    "169.254.169.254",
    "192.168.1.1",
    "::1",
    "fc00::1",
    "::ffff:8.8.8.8",
    "2001:db8::1",
  ])
    expect(publicPreviewAddress(address)).toBe(false);
  expect(publicPreviewAddress("1.1.1.1")).toBe(true);
  for (const url of [
    "http://x.cdninstagram.com/a",
    "https://x.cdninstagram.com.evil.test/a",
    "https://x.cdninstagram.com@localhost/a",
    "https://127.0.0.1/a",
    "https://x.cdninstagram.com:444/a",
  ])
    expect(() => previewUrl(url, ["*.cdninstagram.com"])).toThrow();
  expect(
    previewUrl("https://x.cdninstagram.com/a?signature=ephemeral", [
      "*.cdninstagram.com",
    ]).hostname,
  ).toBe("x.cdninstagram.com");
  const source = "https://www.instagram.com/reel/Synthetic123/";
  expect(
    postPreviewMetadata(
      `<meta property="og:url" content="${source}"><meta property="og:image" content="https://x.cdninstagram.com/a?one=1&amp;two=2"><meta property="og:title" content="Synthetic &amp; owned">`,
      source,
    ),
  ).toEqual({
    image: "https://x.cdninstagram.com/a?one=1&two=2",
    title: "Synthetic & owned",
  });
  expect(
    postPreviewMetadata(
      '<meta property="og:image" content="https://x.cdninstagram.com/logo.jpg">',
      source,
    ),
  ).toBeNull();
  expect(
    postPreviewMetadata(
      '<meta property="og:url" content="https://www.instagram.com/reel/Other123/"><meta property="og:image" content="https://x.cdninstagram.com/a">',
      source,
    ),
  ).toBeNull();
});
async function setup() {
  vi.stubEnv("LINK_PREVIEWS_ENABLED", "true");
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  workflowTest.register(t);
  await t.mutation(internal.accounts.syncUser, {
    subject: "preview-owner",
    email: "preview@example.test",
    name: "Synthetic preview",
  });
  const owner = t.withIdentity({ subject: "preview-owner" });
  const org = await owner.mutation(api.organizations.create, {
    name: "Synthetic preview workspace",
  });
  const id = await owner.mutation(api.product.capture, {
    organizationId: org,
    key: "synthetic-preview",
    kind: "url",
    title: "Imported video link",
    url: "https://www.instagram.com/reel/Synthetic123/",
    rightsAttested: true,
  });
  const source = await t.mutation(internal.sourcePreviewState.begin, { id });
  return { t, owner, org, id, source: source! };
}
it("queues previews at capture, binds them to the original post and keeps thumbnail evidence tenant protected", async () => {
  const { t, owner, org, id, source } = await setup();
  expect(source.url).toContain("Synthetic123");
  expect(
    await t.mutation(internal.sourcePreviewState.begin, { id }),
  ).toBeNull();
  await t.run((ctx) =>
    ctx.db.patch(id, { generation: 1, state: "processing" }),
  );
  expect(
    await t.mutation(internal.sourcePreviewState.finish, {
      id,
      canonical: source.canonical,
      key: `${org}/synthetic-image`,
      size: 100,
      etag: "synthetic",
      title: "Synthetic public title",
    }),
  ).toBe(true);
  const detail = await owner.query(api.product.detail, { id });
  expect(detail.linkPreview?.state).toBe("ready");
  const asset = detail.linkPreview?.assetId;
  if (!asset) throw Error("Expected verified thumbnail asset");
  expect((await owner.query(api.assets.evidence, { id: asset })).type).toBe(
    "image/jpeg",
  );
  await expect(t.query(api.assets.evidence, { id: asset })).rejects.toThrow();
  expect(
    await t.run((ctx) => ctx.db.query("reservations").collect()),
  ).toHaveLength(0);
  await owner.mutation(api.product.deleteSource, { id });
  expect((await t.run((ctx) => ctx.db.get(id)))?.linkPreview).toBeUndefined();
  await expect(
    owner.query(api.assets.evidence, { id: asset }),
  ).rejects.toThrow();
});
it("deletion and changed post identity prevent late preview restoration and remove orphan objects", async () => {
  const { t, owner, org, id, source } = await setup();
  await owner.mutation(api.product.deleteSource, { id });
  expect(
    await t.mutation(internal.sourcePreviewState.finish, {
      id,
      canonical: source.canonical,
      key: `${org}/late-image`,
      size: 100,
      etag: "synthetic",
    }),
  ).toBe(false);
  expect(await t.run((ctx) => ctx.db.query("assets").collect())).toHaveLength(
    0,
  );
  expect(
    (await t.run((ctx) => ctx.db.query("objectDeletions").collect())).some(
      (x) => x.key === `${org}/late-image`,
    ),
  ).toBe(true);
});
