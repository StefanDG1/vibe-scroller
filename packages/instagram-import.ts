import { parse, type DefaultTreeAdapterTypes } from "parse5";
import { parseLinkImport, type ImportRow } from "./imports";

export const SAVED_TEXT_LIMIT = 8_000_000;
export type LinkValue = {
  url: string;
  title?: string;
  collection?: string;
  saved_at?: string;
};
export type ImportPreview = {
  rows: ImportRow[];
  links: LinkValue[];
  duplicates: number;
  invalid: number;
  unsupported: number;
  reels: number;
  posts: number;
  format: string;
};
const record = (v: unknown): Record<string, unknown> | undefined =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;

// Some Meta exports encode UTF-8 bytes as Latin-1 code points inside JSON.
// Repair only a complete, valid UTF-8 round trip with a mojibake marker.
function savedTitle(title: string) {
  if (
    /[Â-ô][-¿]/.test(title) &&
    [...title].every((c) => c.codePointAt(0)! <= 255)
  ) {
    try {
      const bytes = Uint8Array.from([...title], (c) => c.charCodeAt(0));
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      const encoded = new TextEncoder().encode(decoded);
      if (
        encoded.length === bytes.length &&
        encoded.every((b, i) => b === bytes[i])
      )
        title = decoded;
    } catch {
      /* Ordinary Unicode must remain unchanged. */
    }
  }
  return title
    .trim()
    .slice(0, 160)
    .replace(/[\uD800-\uDBFF]$/, "");
}

export function isSavedFile(path: string) {
  return (
    !path.includes("\\") &&
    !path.includes(":") &&
    !path.split("/").some((p) => p === ".." || p === "." || !p) &&
    /(?:^|\/)saved\/(?:saved_posts|saved_media)(?:_\d+)?\.(?:json|html)$/i.test(
      path,
    )
  );
}

function nativeRow(value: unknown): unknown {
  const v = record(value);
  if (!v) return null;
  let url: unknown, title: unknown, timestamp: unknown;
  if (Array.isArray(v.label_values)) {
    const fields = v.label_values.map(record).filter(Boolean);
    const urls = fields.filter((f) => f!.label === "URL");
    if (urls.length !== 1) return null;
    url = urls[0]!.href ?? urls[0]!.value;
    title =
      fields.find((f) => f!.label === "Title" && f!.value)?.value ??
      fields.find((f) => f!.label === "Caption")?.value;
    timestamp = v.timestamp;
  } else {
    const saved = record(record(v.string_map_data)?.["Saved on"]);
    const list = Array.isArray(v.string_list_data)
      ? v.string_list_data.map(record).filter(Boolean)
      : [];
    const data = saved ?? (list.length === 1 ? list[0] : undefined);
    if (!data) return null;
    url = data.href;
    timestamp = data.timestamp;
    title = v.title;
  }
  if (typeof url !== "string") return null;
  try {
    const u = new URL(url);
    if (
      !["instagram.com", "www.instagram.com"].includes(u.hostname) ||
      !/^\/(?:reel|reels|p|tv)\/[A-Za-z0-9_-]+\/?$/.test(u.pathname)
    )
      return null;
  } catch {
    return null;
  }
  if (
    timestamp !== undefined &&
    (!Number.isSafeInteger(timestamp) ||
      (timestamp as number) < 0 ||
      (timestamp as number) > 8_640_000_000_000)
  )
    return null;
  return {
    url,
    ...(typeof title === "string" && title.trim()
      ? { title: savedTitle(title) }
      : {}),
    ...(timestamp === undefined
      ? {}
      : { saved_at: new Date((timestamp as number) * 1000).toISOString() }),
  };
}

function htmlRows(text: string): unknown[] {
  // Pure syntax tree: no DOM, scripts, image loads, iframe loads or URL requests.
  const tree = parse(text);
  const stack: DefaultTreeAdapterTypes.Node[] = [tree];
  const values: unknown[] = [];
  let count = 0;
  while (stack.length) {
    const node = stack.pop()!;
    if (++count > 100_000)
      throw new Error("Saved HTML has too many elements. Choose JSON instead.");
    if (
      "tagName" in node &&
      ["script", "style", "template", "iframe", "svg"].includes(node.tagName)
    )
      continue;
    if ("tagName" in node && node.tagName === "a") {
      const href = node.attrs.find((a) => a.name === "href")?.value;
      if (href) {
        const candidate = nativeRow({ label_values: [{ label: "URL", href }] });
        if (candidate) values.push(candidate);
      }
    }
    if ("childNodes" in node) stack.push(...node.childNodes.slice().reverse());
  }
  return values;
}

export function previewLinkFile(
  text: string,
  name: string,
  now = Date.now(),
): ImportPreview {
  if (
    new TextEncoder().encode(text).length > SAVED_TEXT_LIMIT ||
    text.includes("\u0000")
  )
    throw new Error("Saved metadata must be UTF-8 text within 8 MB.");
  text = text.replace(/^\uFEFF/, "");
  let rows: ImportRow[], format: string;
  if (/\.csv$/i.test(name)) {
    rows = parseLinkImport(text, "csv", now);
    format = "CSV links";
  } else {
    let values: unknown[];
    if (/\.html?$/i.test(name)) {
      if (
        !/^(?:saved_posts|saved_media)(?:_\d+)?\.html?$/i.test(
          name.split("/").pop()!,
        )
      )
        throw new Error(
          "Choose saved_posts.html from your Saved export, not the archive index or messages.",
        );
      values = htmlRows(text);
      format = "Instagram Saved HTML";
    } else if (/\.json$/i.test(name)) {
      const json: unknown = JSON.parse(text);
      if (
        Array.isArray(json) &&
        json.some((v) => record(v)?.url !== undefined)
      ) {
        rows = parseLinkImport(text, "json", now);
        return summarize(rows, "JSON links");
      }
      const object = record(json);
      const list = object?.saved_saved_media ?? object?.saved_saved_posts;
      if (Array.isArray(list)) values = list.map(nativeRow);
      else if (
        Array.isArray(json) &&
        /^(?:saved_posts|saved_media)(?:_\d+)?\.json$/i.test(
          name.split("/").pop()!,
        )
      )
        values = json.map(nativeRow);
      else
        throw new Error(
          "Choose Saved metadata or a JSON array with url fields. Unrelated archive data is not imported.",
        );
      format = "Instagram Saved JSON";
    } else throw new Error("Choose a CSV, JSON, HTML or Instagram export ZIP.");
    if (!values.length || values.length > 10_000)
      throw new Error(
        "Saved metadata must contain 1 to 10,000 records. Split larger exports by saved file.",
      );
    rows = values.map((value, index) => ({
      ...parseLinkImport(JSON.stringify([value]), "json", now)[0],
      row: index + 1,
    }));
  }
  return summarize(rows, format);
}

export function summarize(rows: ImportRow[], format: string): ImportPreview {
  const seen = new Set<string>();
  const links: LinkValue[] = [];
  let duplicates = 0;
  for (const row of rows) {
    if (!row.url || row.problem) continue;
    if (seen.has(row.url)) {
      duplicates++;
      continue;
    }
    seen.add(row.url);
    links.push({
      url: row.url,
      ...(row.title ? { title: row.title } : {}),
      ...(row.collection ? { collection: row.collection } : {}),
      ...(row.savedAt === undefined
        ? {}
        : { saved_at: new Date(row.savedAt).toISOString() }),
    });
  }
  return {
    rows,
    links,
    duplicates,
    format,
    invalid: rows.filter((r) => r.problem === "invalid").length,
    unsupported: rows.filter((r) => r.problem === "unsupported").length,
    reels: links.filter((l) => /instagram\.com\/(?:reel|reels)\//.test(l.url))
      .length,
    posts: links.filter((l) => /instagram\.com\/(?:p|tv)\//.test(l.url)).length,
  };
}

export function importBatch(links: LinkValue[], offset: number) {
  const batch: LinkValue[] = [];
  let bytes = 2;
  for (const link of links.slice(offset, offset + 500)) {
    const size =
      new TextEncoder().encode(JSON.stringify(link)).length +
      (batch.length ? 1 : 0);
    // The normalized JSON is itself a string inside the authenticated HTTP
    // envelope. Leave room for a second round of JSON escaping and metadata.
    if (bytes + size > 65_000) break;
    batch.push(link);
    bytes += size;
  }
  return { text: JSON.stringify(batch), count: batch.length };
}
