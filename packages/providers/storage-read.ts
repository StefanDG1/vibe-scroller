import { ensure } from "../policy";

const bytes = (value: string) => new TextEncoder().encode(value);
const hex = (value: ArrayBuffer) =>
  Array.from(new Uint8Array(value), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
const encode = (value: string) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
async function hmac(key: Uint8Array, value: string) {
  const imported = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", imported, bytes(value));
}

// Query-compatible, read-only AWS signature. There is no caller-selected method,
// bucket, endpoint or lifetime, and runtime credentials never leave the query.
export async function signedReadObject(key: string, now = new Date()) {
  const endpoint = process.env.R2_ENDPOINT,
    bucket = process.env.R2_BUCKET,
    access = process.env.R2_ACCESS_KEY_ID,
    secret = process.env.R2_SECRET_ACCESS_KEY;
  ensure(
    endpoint && bucket && access && secret,
    "STORAGE_UNAVAILABLE",
    "Private EU storage is not configured.",
  );
  const target = new URL(endpoint);
  ensure(
    target.protocol === "https:" &&
      !target.username &&
      !target.password &&
      !target.port &&
      target.hostname.endsWith(".eu.r2.cloudflarestorage.com"),
    "STORAGE_JURISDICTION_REQUIRED",
    "Use the explicit EU-jurisdiction storage endpoint.",
  );
  ensure(
    !key.split("/").some((part) => part === ".." || !part) &&
      !key.includes("\\"),
    "INVALID_INPUT",
    "Invalid object key.",
  );
  const date = now.toISOString().replace(/[:-]|\.\d{3}/g, ""),
    day = date.slice(0, 8),
    scope = `${day}/auto/s3/aws4_request`,
    path = `/${encode(bucket)}/${key.split("/").map(encode).join("/")}`;
  const fields: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${access}/${scope}`,
    "X-Amz-Date": date,
    "X-Amz-Expires": "60",
    "X-Amz-SignedHeaders": "host",
  };
  const query = Object.keys(fields)
    .sort()
    .map((field) => `${encode(field)}=${encode(fields[field])}`)
    .join("&");
  const request = [
    "GET",
    path,
    query,
    `host:${target.hostname}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  let signing = new Uint8Array(await hmac(bytes(`AWS4${secret}`), day));
  for (const part of ["auto", "s3", "aws4_request"])
    signing = new Uint8Array(await hmac(signing, part));
  const hash = hex(await crypto.subtle.digest("SHA-256", bytes(request)));
  const signature = hex(
    await hmac(signing, `AWS4-HMAC-SHA256\n${date}\n${scope}\n${hash}`),
  );
  return `https://${target.hostname}${path}?${query}&X-Amz-Signature=${signature}`;
}
