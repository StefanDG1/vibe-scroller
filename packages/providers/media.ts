import { Sandbox } from "e2b";
import { hardenSandbox } from "./isolation";
import { signedObject } from "./storage";
import { ensure } from "../policy";
export async function prepareMedia(objectKey: string, decoder: string) {
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
    const manifest = JSON.parse(
      await sandbox.files.read("/home/user/media/manifest.json"),
    );
    const audio = manifest.audio
      ? await sandbox.files.read(`/home/user/media/${manifest.audio}`, {
          format: "bytes",
        })
      : undefined;
    const frames = [];
    for (const f of manifest.frames) {
      const data = await sandbox.files.read(`/home/user/media/${f.id}`, {
        format: "bytes",
      });
      frames.push({ ...f, data: Buffer.from(data).toString("base64") });
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
