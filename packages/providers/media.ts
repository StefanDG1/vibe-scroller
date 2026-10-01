import { Sandbox } from "e2b";
import { hardenSandbox } from "./isolation";
import { signedObject } from "./storage";
import { ensure } from "../policy";
import { decoderManifest } from "../media/manifest";
import { createHash } from "node:crypto";
export async function prepareMedia(
  objectKey: string,
  decoder: string,
  normalizedPcm = false,
) {
  ensure(
    process.env.MEDIA_VERIFIED === "true" &&
      process.env.E2B_API_KEY &&
      process.env.E2B_MEDIA_TEMPLATE,
    "MEDIA_UNAVAILABLE",
    "Verify the pinned isolated media image before processing.",
  );
  const started = Date.now();
  let killed = false;
  const sandbox = await Sandbox.create(process.env.E2B_MEDIA_TEMPLATE, {
    apiKey: process.env.E2B_API_KEY,
    allowInternetAccess: false,
    secure: true,
    timeoutMs: 300000,
    metadata: { product: "vibescroller", class: "media" },
  });
  try {
    await hardenSandbox(sandbox);
    const res = await fetch(signedObject(objectKey, "GET", 300), {
      signal: AbortSignal.timeout(60000),
    });
    ensure(
      res.ok && Number(res.headers.get("content-length")) <= 250000000,
      "SOURCE_UNAVAILABLE",
      "Source object is unavailable or exceeds the limit.",
    );
    let bytes = 0;
    const stream = res.body!.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          bytes += chunk.byteLength;
          ensure(
            bytes <= 250000000,
            "SOURCE_UNAVAILABLE",
            "Source exceeds its byte limit.",
          );
          controller.enqueue(chunk);
        },
      }),
    );
    await sandbox.commands.run("mkdir -p /home/user/media", {
      user: "user",
      timeoutMs: 10000,
    });
    await sandbox.files.write("/home/user/media/input", stream, {
      user: "user",
    });
    await sandbox.files.write("/home/user/media/decode.py", decoder, {
      user: "user",
    });
    await sandbox.commands.run("python3 /home/user/media/decode.py", {
      user: "user",
      timeoutMs: 240000,
    });
    const rawManifest = await sandbox.files.read(
      "/home/user/media/manifest.json",
    );
    ensure(
      rawManifest.length <= 20000,
      "INVALID_MEDIA_MANIFEST",
      "Media manifest exceeded its limit.",
    );
    const manifest = decoderManifest(JSON.parse(rawManifest), normalizedPcm);
    const audio = manifest.audio
      ? await sandbox.files.read(`/home/user/media/${manifest.audio}`, {
          format: "bytes",
        })
      : undefined;
    ensure(
      !audio || audio.byteLength <= 19500000,
      "INVALID_MEDIA_MANIFEST",
      "Normalized audio exceeded its limit.",
    );
    const frames = [];
    let frameBytes = 0;
    for (const f of manifest.frames) {
      const data = await sandbox.files.read(`/home/user/media/${f.id}`, {
        format: "bytes",
      });
      frameBytes += data.byteLength;
      ensure(
        data.byteLength <= 1000000 &&
          frameBytes <= 12000000 &&
          data[0] === 255 &&
          data[1] === 216 &&
          data[2] === 255,
        "INVALID_MEDIA_MANIFEST",
        "Frame data exceeded its safe bounds.",
      );
      frames.push({
        ...f,
        sha256: createHash("sha256").update(data).digest("hex"),
        data: Buffer.from(data).toString("base64"),
      });
    }
    await sandbox.kill();
    killed = true;
    return {
      manifest,
      audio,
      frames,
      computeSeconds: Math.ceil((Date.now() - started) / 1000),
    };
  } finally {
    if (!killed) await sandbox.kill();
  }
}
export async function transcribe(audio: Uint8Array, key: string) {
  const form = new FormData();
  form.append(
    "file",
    new Blob([audio.slice().buffer as ArrayBuffer], { type: "audio/mpeg" }),
    "audio.mp3",
  );
  form.append(
    "model",
    process.env.OPENAI_TRANSCRIPTION_MODEL ?? "gpt-4o-mini-transcribe",
  );
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(120000),
  });
  ensure(
    res.ok,
    "PROVIDER_ERROR",
    "Transcription failed. Do not invent speech or silently change providers.",
  );
  return res.json();
}
