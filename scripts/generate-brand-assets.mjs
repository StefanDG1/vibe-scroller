import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import geometry from "../packages/ui/brand-geometry.json" with { type: "json" };

// Use the locked Sharp shipped with Next, without adding a runtime dependency.
const root = resolve(import.meta.dirname, "..");
const appRequire = createRequire(join(root, "apps/starter/package.json"));
const nextRequire = createRequire(appRequire.resolve("next/package.json"));
const sharp = nextRequire("sharp");
const paths = geometry.paths.map((d) => `<path d="${d}"/>`).join("");
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="VibeScroll">${body}</svg>`;
const mark = (x, y, width, color) =>
  `<svg x="${x}" y="${y}" width="${width}" height="${(width * 239) / 284}" viewBox="${geometry.viewBox}" fill="${color}">${paths}</svg>`;
const tile = (size, proportion = 0.7, rounded = false) => {
  const width = size * proportion;
  return svg(
    size,
    size,
    `<rect width="${size}" height="${size}" rx="${rounded ? size * 0.21 : 0}" fill="#000"/>${mark((size - width) / 2, (size - (width * 239) / 284) / 2, width, "#fff")}`,
  );
};
const png = (source, size) =>
  sharp(Buffer.from(source)).resize(size, size).png().toBuffer();

function ico(images) {
  const directory = Buffer.alloc(6 + images.length * 16);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(images.length, 4);
  let offset = directory.length;
  for (let i = 0; i < images.length; i++) {
    const { size, bytes } = images[i];
    const base = 6 + i * 16;
    directory[base] = size;
    directory[base + 1] = size;
    directory.writeUInt16LE(1, base + 4);
    directory.writeUInt16LE(32, base + 6);
    directory.writeUInt32LE(bytes.length, base + 8);
    directory.writeUInt32LE(offset, base + 12);
    offset += bytes.length;
  }
  return Buffer.concat([directory, ...images.map((i) => i.bytes)]);
}

const favicon = tile(64, 0.76, true);
const apple = await png(tile(180), 180);
const faviconIco = ico(
  await Promise.all(
    [16, 32, 48].map(async (size) => ({
      size,
      bytes: await png(favicon, size),
    })),
  ),
);
const assets = {
  "icon-192.png": await png(tile(192), 192),
  "icon-512.png": await png(tile(512), 512),
  "icon-maskable-512.png": await png(tile(512, 0.54), 512),
  "notification-badge.png": await png(svg(96, 96, mark(9, 15, 78, "#000")), 96),
};
for (const [name, color] of [
  ["black", "#000"],
  ["white", "#fff"],
]) {
  assets[`mark-${name}.svg`] =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${geometry.viewBox}" fill="${color}" role="img" aria-label="VibeScroll">${paths}</svg>`;
  const logo = svg(
    480,
    96,
    `${mark(0, 10, 90, color)}<text x="111" y="66" fill="${color}" font-family="Arial, Helvetica, sans-serif" font-size="51" font-weight="700" letter-spacing="-1.6">VibeScroll</text>`,
  );
  assets[`logo-${name}.svg`] = logo;
  assets[`logo-${name}.png`] = await sharp(Buffer.from(logo))
    .resize(1440, 288)
    .png()
    .toBuffer();
}

const steps = [
  "Saved idea",
  "Evidence",
  "Project fit",
  "Reviewed plan",
  "Draft PR",
];
const scroll = await sharp(
  await readFile(join(root, "apps/starter/public/scroll/scroll-welcome.webp")),
)
  .png()
  .toBuffer();
const social = svg(
  1200,
  630,
  `<rect width="1200" height="630" fill="#141918"/>${mark(58, 51, 48, "#87dfc1")}
  <image x="894" y="105" width="245" height="290" href="data:image/png;base64,${scroll.toString("base64")}"/>
  <g font-family="Arial, Helvetica, sans-serif" fill="#fff">
  <text x="126" y="84" font-size="32" font-weight="700" letter-spacing="-1">VibeScroll</text>
  <text x="58" y="213" font-size="78" font-weight="700" letter-spacing="-2">Make scrolling</text>
  <text x="58" y="303" font-size="78" font-weight="700" letter-spacing="-2" fill="#f3c785">useful.</text>
  <text x="62" y="365" font-size="30" fill="#c8d4ce">Keep the evidence. Choose what to apply.</text>
  ${steps.map((label, i) => `<rect x="${62 + i * 224}" y="438" width="202" height="67" rx="12" fill="#1d2421" stroke="#40544b"/><text x="${163 + i * 224}" y="480" text-anchor="middle" font-size="21" font-weight="700">${label}</text>${i < 4 ? `<text x="${270 + i * 224}" y="481" font-size="23" fill="#87dfc1">›</text>` : ""}`).join("")}
  <text x="62" y="577" font-size="24" fill="#aaa">scroll.companynerve.com</text></g>`,
);
const socialPng = await sharp(Buffer.from(social)).png().toBuffer();

for (const app of ["starter", "marketing"]) {
  const appRoot = join(root, "apps", app);
  const brandRoot = join(appRoot, "public/brand");
  await mkdir(brandRoot, { recursive: true });
  for (const [file, bytes] of Object.entries(assets))
    await writeFile(join(brandRoot, file), bytes);
  await writeFile(join(appRoot, "app/icon.svg"), favicon + "\n");
  await writeFile(join(appRoot, "app/favicon.ico"), faviconIco);
  await writeFile(join(appRoot, "app/apple-icon.png"), apple);
  if (app === "starter")
    await writeFile(join(appRoot, "public/social-card.png"), socialPng);
}
console.log(
  "Generated monochrome 14C logos, browser/Apple/PWA icons, notification badge and social card for both apps.",
);
