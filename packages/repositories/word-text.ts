import { inflateSync } from "fflate";
import { ensure, containsSecret } from "../policy";

// Read only the main document XML. Never extract attachments, media or macros.
export function wordText(bytes: Uint8Array) {
  const check = (ok: unknown) =>
    ensure(ok, "INVALID_EVIDENCE", "Unsupported or oversized Word document.");
  check(bytes.length <= 250000 && bytes.length >= 22);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  for (; end >= Math.max(0, bytes.length - 65557); end--) {
    if (
      view.getUint32(end, true) === 0x06054b50 &&
      end + 22 + view.getUint16(end + 20, true) === bytes.length
    )
      break;
  }
  check(
    end >= 0 &&
      view.getUint32(end, true) === 0x06054b50 &&
      view.getUint16(end + 4, true) === 0 &&
      view.getUint16(end + 6, true) === 0,
  );
  const count = view.getUint16(end + 10, true),
    directory = view.getUint32(end + 16, true);
  check(count <= 1000 && directory + view.getUint32(end + 12, true) === end);
  let at = directory,
    result: string | undefined;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  for (let i = 0; i < count; i++) {
    check(at + 46 <= end && view.getUint32(at, true) === 0x02014b50);
    const nameLength = view.getUint16(at + 28, true),
      extra = view.getUint16(at + 30, true),
      comment = view.getUint16(at + 32, true);
    check(at + 46 + nameLength + extra + comment <= end);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    if (name === "word/document.xml") {
      check(result === undefined);
      const flags = view.getUint16(at + 8, true),
        method = view.getUint16(at + 10, true),
        size = view.getUint32(at + 20, true),
        original = view.getUint32(at + 24, true),
        offset = view.getUint32(at + 42, true);
      check(
        !(flags & 1) &&
          [0, 8].includes(method) &&
          original <= 1000000 &&
          size <= 250000 &&
          original <= Math.max(100000, size * 200) &&
          offset + 30 <= directory,
      );
      check(
        view.getUint32(offset, true) === 0x04034b50 &&
          view.getUint16(offset + 6, true) === flags &&
          view.getUint16(offset + 8, true) === method,
      );
      const start =
        offset +
        30 +
        view.getUint16(offset + 26, true) +
        view.getUint16(offset + 28, true);
      check(start + size <= directory);
      check(
        decoder.decode(
          bytes.subarray(
            offset + 30,
            offset + 30 + view.getUint16(offset + 26, true),
          ),
        ) === name,
      );
      const compressed = bytes.subarray(start, start + size);
      const xml =
        method === 0
          ? compressed
          : inflateSync(compressed, { out: new Uint8Array(original + 1) });
      check(xml.length === original);
      const text = decoder.decode(xml);
      check(!/<!DOCTYPE|<!ENTITY/i.test(text));
      result = text
        .replace(/<\/w:p>/g, "\n")
        .replace(/<w:tab\b[^>]*\/>/g, "\t")
        .replace(/<[^>]*>/g, "")
        .replace(
          /&(?:amp|lt|gt|quot|apos);/g,
          (e) =>
            ({
              "&amp;": "&",
              "&lt;": "<",
              "&gt;": ">",
              "&quot;": '"',
              "&apos;": "'",
            })[e]!,
        )
        .replace(/&#(x[\da-f]+|\d+);/gi, (_, v) => {
          const n = v[0] === "x" ? parseInt(v.slice(1), 16) : Number(v);
          return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
        });
    }
    at += 46 + nameLength + extra + comment;
  }
  check(
    at === end &&
      result !== undefined &&
      !result.includes("\0") &&
      !containsSecret(result),
  );
  // Keep extracted text lines bounded so one long Word paragraph does not
  // consume an entire excerpt or disappear behind the per-file limit.
  return result!
    .split("\n")
    .flatMap((paragraph) => {
      const lines: string[] = [];
      let line = "";
      for (const word of paragraph.trim().split(/\s+/)) {
        if (line.length + word.length + 1 > 180 && line) {
          lines.push(line);
          line = "";
        }
        line += (line ? " " : "") + word;
      }
      if (line) lines.push(line);
      return lines;
    })
    .join("\n");
}
