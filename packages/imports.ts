import { safeSourceUrl } from "./policy";

export type ImportRow = {
  row: number;
  url?: string;
  title?: string;
  collection?: string;
  savedAt?: number;
  problem?: "invalid" | "unsupported";
};
export function parseLinkImport(
  text: string,
  format: "csv" | "json",
  now = Date.now(),
): ImportRow[] {
  if (new TextEncoder().encode(text).length > 140000 || text.includes("\u0000"))
    throw new Error("Import must be UTF-8 text within 140 KB.");
  let values: unknown[];
  text = text.replace(/^\uFEFF/, "");
  if (format === "json") {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed))
      throw new Error("Use a JSON array of link objects.");
    values = parsed;
  } else {
    const rows: string[][] = [];
    let row: string[] = [],
      cell = "",
      quoted = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (quoted && text[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (quoted || cell.length === 0) quoted = !quoted;
        else throw new Error("Invalid CSV quoting.");
      } else if (!quoted && (char === "," || char === "\n")) {
        row.push(cell.replace(/\r$/, ""));
        cell = "";
        if (char === "\n") {
          if (row.some(Boolean)) rows.push(row);
          row = [];
        }
      } else cell += char;
    }
    if (quoted) throw new Error("Unclosed CSV quote.");
    row.push(cell.replace(/\r$/, ""));
    if (row.some(Boolean)) rows.push(row);
    const header = rows.shift()?.map((h) => h.trim());
    if (
      !header?.includes("url") ||
      new Set(header).size !== header.length ||
      header.some(
        (h) => !["url", "title", "collection", "saved_at"].includes(h),
      )
    )
      throw new Error(
        "CSV needs url and optional title, collection, saved_at columns.",
      );
    values = rows.map((r) =>
      r.length === header.length
        ? Object.fromEntries(header.map((h, i) => [h, r[i]]))
        : null,
    );
  }
  if (values.length === 0 || values.length > 500)
    throw new Error("Import 1 to 500 links per batch.");
  return values.map((value, index) => {
    const invalid: ImportRow = { row: index + 1, problem: "invalid" };
    if (!value || typeof value !== "object" || Array.isArray(value))
      return invalid;
    const v = value as Record<string, unknown>;
    if (
      Object.keys(v).some(
        (k) => !["url", "title", "collection", "saved_at"].includes(k),
      ) ||
      typeof v.url !== "string" ||
      v.url.length > 2048 ||
      ["title", "collection", "saved_at"].some(
        (k) => v[k] !== undefined && typeof v[k] !== "string",
      )
    )
      return invalid;
    const title = (v.title as string | undefined)?.trim(),
      collection = (v.collection as string | undefined)?.trim();
    if ((title?.length ?? 0) > 160 || (collection?.length ?? 0) > 40)
      return invalid;
    const date = v.saved_at as string | undefined;
    const savedAt = date ? Date.parse(date) : undefined;
    if (
      date &&
      (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(date) ||
        !Number.isFinite(savedAt) ||
        savedAt! > now ||
        new Date(savedAt!).toISOString().slice(0, 10) !== date.slice(0, 10))
    )
      return invalid;
    try {
      return {
        row: index + 1,
        url: safeSourceUrl(v.url),
        ...(title ? { title } : {}),
        ...(collection ? { collection } : {}),
        ...(savedAt !== undefined ? { savedAt } : {}),
      };
    } catch {
      return {
        row: index + 1,
        problem: /^https?:\/\//.test(v.url) ? "unsupported" : "invalid",
      };
    }
  });
}
