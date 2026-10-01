import { createHash } from "node:crypto";
import { transcribeNormalizedAudio } from "./local-asr.mjs";

export async function preparePersonalInput(
  media,
  {
    signal,
    asr,
    onStage,
    fetchImpl = fetch,
    transcribe = transcribeNormalizedAudio,
  },
) {
  if (
    !media ||
    !Number.isSafeInteger(media.durationMs) ||
    media.durationMs < 1 ||
    media.durationMs > 600000 ||
    !Array.isArray(media.frames) ||
    media.frames.length > 24 ||
    (!media.audio && !media.frames.length) ||
    media.coverage !==
      (media.audio
        ? media.frames.length
          ? "full_sampled"
          : "audio_only"
        : "visual_only")
  )
    throw new Error("PERSONAL_MEDIA_INVALID");
  const ids = new Set();
  let total = 0;
  async function download(blob, max) {
    signal?.throwIfAborted();
    const url = new URL(blob.url);
    if (
      url.protocol !== "https:" ||
      !/^[a-f0-9]{32}\.eu\.r2\.cloudflarestorage\.com$/.test(url.hostname) ||
      url.username ||
      url.password ||
      url.port ||
      url.hash ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(blob.id ?? "") ||
      ids.has(blob.id) ||
      !Number.isSafeInteger(blob.size) ||
      blob.size < 1 ||
      blob.size > max ||
      !/^[a-f0-9]{64}$/.test(blob.sha256 ?? "")
    )
      throw new Error("PERSONAL_MEDIA_INVALID");
    ids.add(blob.id);
    const response = await fetchImpl(url, {
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.any([
        AbortSignal.timeout(30000),
        ...(signal ? [signal] : []),
      ]),
    });
    if (
      !response.ok ||
      !response.body ||
      (response.headers.get("content-length") !== null &&
        Number(response.headers.get("content-length")) !== blob.size)
    )
      throw new Error("PERSONAL_MEDIA_UNAVAILABLE");
    const reader = response.body.getReader(),
      chunks = [];
    let size = 0;
    try {
      for (;;) {
        const item = await reader.read();
        if (item.done) break;
        size += item.value.byteLength;
        total += item.value.byteLength;
        if (size > blob.size || total > 31500000)
          throw new Error("PERSONAL_MEDIA_LIMIT");
        chunks.push(Buffer.from(item.value));
      }
    } finally {
      await reader.cancel();
    }
    const bytes = Buffer.concat(chunks);
    if (
      size !== blob.size ||
      createHash("sha256").update(bytes).digest("hex") !== blob.sha256
    )
      throw new Error("PERSONAL_MEDIA_CHANGED");
    return bytes;
  }
  const audio = media.audio ? await download(media.audio, 19500000) : null;
  const frames = [],
    frameEvidence = [];
  let imageBytes = 0;
  for (const frame of media.frames) {
    if (
      !Number.isSafeInteger(frame.timestampMs) ||
      frame.timestampMs < 0 ||
      frame.timestampMs >= media.durationMs
    )
      throw new Error("PERSONAL_MEDIA_INVALID");
    const bytes = await download(frame, 1000000);
    imageBytes += bytes.length;
    if (
      bytes[0] !== 255 ||
      bytes[1] !== 216 ||
      bytes[2] !== 255 ||
      imageBytes > 12000000
    )
      throw new Error("PERSONAL_MEDIA_INVALID");
    frames.push({
      timestampMs: frame.timestampMs,
      dataUrl: `data:image/jpeg;base64,${bytes.toString("base64")}`,
    });
    frameEvidence.push({
      kind: "frame",
      id: frame.id,
      startMs: frame.timestampMs,
      endMs: frame.timestampMs,
      selectionReason: frame.selectionReason,
    });
  }
  let transcript = [];
  if (audio) {
    if (!asr) throw new Error("PERSONAL_ASR_SETUP_REQUIRED");
    await onStage?.("transcribing");
    const result = await transcribe(audio, { ...asr, signal });
    if (
      result.audioSha256 !== media.audio.sha256 ||
      Math.abs(result.durationMs - media.durationMs) > 1000 ||
      !Array.isArray(result.segments) ||
      result.segments.length > 200
    )
      throw new Error("PERSONAL_TRANSCRIPT_INVALID");
    let chars = 0;
    transcript = result.segments.map((s, index) => {
      if (
        typeof s.text !== "string" ||
        s.text.length > 4000 ||
        !Number.isSafeInteger(s.startMs) ||
        !Number.isSafeInteger(s.endMs) ||
        s.startMs < 0 ||
        s.endMs < s.startMs ||
        s.endMs > media.durationMs
      )
        throw new Error("PERSONAL_TRANSCRIPT_INVALID");
      chars += s.text.length;
      if (chars > 60000) throw new Error("PERSONAL_TRANSCRIPT_INVALID");
      return {
        id: `segment-${index}`,
        text: s.text,
        startMs: s.startMs,
        endMs: s.endMs,
      };
    });
  }
  return { transcript, frames, frameEvidence };
}
