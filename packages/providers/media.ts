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
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    const reader = res.body!.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 250000000) {
        await reader.cancel();
        throw new Error("Media exceeds byte limit.");
      }
      chunks.push(value);
    }
    const input = Buffer.concat(chunks);
    await sandbox.commands.run("mkdir -p /home/user/media", {
      user: "user",
      timeoutMs: 10000,
    });
    await sandbox.files.write(
      "/home/user/media/input",
      input.buffer.slice(
        input.byteOffset,
        input.byteOffset + input.byteLength,
      ) as ArrayBuffer,
      { user: "user" },
    );
    await sandbox.files.write("/home/user/media/decode.py", decoder, {
      user: "user",
    });
    await sandbox.commands.run("python /home/user/media/decode.py", {
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
    return { manifest, audio, frames };
  } finally {
    await sandbox.kill();
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
