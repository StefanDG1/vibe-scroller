import { inflateSync } from "fflate";
import {
  isSavedFile,
  previewLinkFile,
  SAVED_TEXT_LIMIT,
  summarize,
  type ImportPreview,
} from "./instagram-import";

const crcTable = Uint32Array.from({ length: 256 }, (_, i) => {
  for (let j = 0; j < 8; j++) i = i & 1 ? 0xedb88320 ^ (i >>> 1) : i >>> 1;
  return i >>> 0;
});
function crc(bytes: Uint8Array) {
  let n = 0xffffffff;
  for (const b of bytes) n = crcTable[(n ^ b) & 255] ^ (n >>> 8);
  return (n ^ 0xffffffff) >>> 0;
}
function requireZip(ok: unknown): asserts ok {
  if (!ok)
    throw new Error(
      "Invalid or unsupported ZIP. Extract saved_posts.json or saved_posts.html locally and choose that file instead.",
    );
}
type Entry = {
  name: string;
  flags: number;
  method: number;
  crc: number;
  size: number;
  original: number;
  offset: number;
};

// Read the directory and selected byte ranges only. Never inflate the rest of
// an account archive or send the ZIP, messages, contacts or media to the server.
export async function previewInstagramZip(
  blob: Blob,
  signal?: AbortSignal,
  progress?: (files: number) => void,
): Promise<ImportPreview> {
  requireZip(blob.size >= 22 && blob.size <= 3_000_000_000);
  const read = async (start: number, size: number) => {
    signal?.throwIfAborted();
    requireZip(start >= 0 && size >= 0 && start + size <= blob.size);
    return new Uint8Array(await blob.slice(start, start + size).arrayBuffer());
  };
  const tailStart = Math.max(0, blob.size - 65557);
  const tail = await read(tailStart, blob.size - tailStart);
  const t = new DataView(tail.buffer);
  let end = tail.length - 22;
  for (; end >= 0; end--)
    if (
      t.getUint32(end, true) === 0x06054b50 &&
      end + 22 + t.getUint16(end + 20, true) === tail.length
    )
      break;
  requireZip(end >= 0);
  const entries = t.getUint16(end + 10, true),
    directorySize = t.getUint32(end + 12, true),
    directoryOffset = t.getUint32(end + 16, true);
  requireZip(
    t.getUint16(end + 4, true) === 0 &&
      t.getUint16(end + 6, true) === 0 &&
      t.getUint16(end + 8, true) === entries &&
      entries <= 20000 &&
      directorySize <= 8_000_000 &&
      directoryOffset + directorySize === tailStart + end,
  );
  const bytes = await read(directoryOffset, directorySize),
    d = new DataView(bytes.buffer);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const candidates: Entry[] = [];
  let at = 0;
  for (let i = 0; i < entries; i++) {
    requireZip(at + 46 <= bytes.length && d.getUint32(at, true) === 0x02014b50);
    const nameLength = d.getUint16(at + 28, true),
      extraLength = d.getUint16(at + 30, true),
      commentLength = d.getUint16(at + 32, true);
    requireZip(
      at + 46 + nameLength + extraLength + commentLength <= bytes.length,
    );
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    if (isSavedFile(name)) {
      const mode = d.getUint32(at + 38, true) >>> 16;
      requireZip(
        (mode & 0xf000) !== 0xa000 && d.getUint16(at + 34, true) === 0,
      );
      candidates.push({
        name,
        flags: d.getUint16(at + 8, true),
        method: d.getUint16(at + 10, true),
        crc: d.getUint32(at + 16, true),
        size: d.getUint32(at + 20, true),
        original: d.getUint32(at + 24, true),
        offset: d.getUint32(at + 42, true),
      });
    }
    at += 46 + nameLength + extraLength + commentLength;
  }
  requireZip(
    at === bytes.length &&
      candidates.length <= 40 &&
      new Set(candidates.map((c) => c.name)).size === candidates.length,
  );
  // Prefer JSON over the HTML counterpart, without scanning unrelated HTML.
  const selected = candidates.filter(
    (c) =>
      !c.name.endsWith(".html") ||
      !candidates.some((j) => j.name === c.name.replace(/\.html$/, ".json")),
  );
  if (!selected.length)
    throw new Error(
      "No Saved metadata found. Export Instagram Saved as JSON, or choose the extracted saved_posts file.",
    );
  const rows: ImportPreview["rows"] = [];
  let total = 0,
    completed = 0;
  for (const e of selected) {
    signal?.throwIfAborted();
    requireZip(
      !(e.flags & 1) &&
        [0, 8].includes(e.method) &&
        e.original <= SAVED_TEXT_LIMIT &&
        e.size <= SAVED_TEXT_LIMIT &&
        e.original <= Math.max(100000, e.size * 200),
    );
    total += e.original;
    requireZip(total <= 16_000_000);
    const header = await read(e.offset, 30),
      h = new DataView(header.buffer);
    requireZip(
      h.getUint32(0, true) === 0x04034b50 &&
        h.getUint16(6, true) === e.flags &&
        h.getUint16(8, true) === e.method,
    );
    const nameLength = h.getUint16(26, true),
      extraLength = h.getUint16(28, true);
    requireZip(
      decoder.decode(await read(e.offset + 30, nameLength)) === e.name,
    );
    const start = e.offset + 30 + nameLength + extraLength;
    requireZip(start + e.size <= directoryOffset);
    const compressed = await read(start, e.size);
    const content =
      e.method === 0
        ? compressed
        : inflateSync(compressed, { out: new Uint8Array(e.original + 1) });
    requireZip(content.length === e.original && crc(content) === e.crc);
    const preview = previewLinkFile(decoder.decode(content), e.name);
    requireZip(rows.length + preview.rows.length <= 10000);
    rows.push(
      ...preview.rows.map((r, i) => ({ ...r, row: rows.length + i + 1 })),
    );
    progress?.(++completed);
  }
  return summarize(rows, "Instagram export ZIP, Saved metadata only");
}
