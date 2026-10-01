// @vitest-environment node
import { expect, it } from "vitest";
import { createHash } from "node:crypto";
import { preparePersonalInput } from "../packages/runner/personal-media.mjs";
import { processPersonalJob } from "../packages/runner/personal-analysis.mjs";
const jpeg = Buffer.from([255, 216, 255, 219, 1]);
const descriptor = (id: string, bytes: Buffer) => ({
  id,
  size: bytes.length,
  sha256: createHash("sha256").update(bytes).digest("hex"),
  url: `https://${"a".repeat(32)}.eu.r2.cloudflarestorage.com/private/${id}?X-Amz-Signature=synthetic`,
});
const media = {
  durationMs: 8000,
  coverage: "full_sampled",
  audio: descriptor("audio", Buffer.alloc(44)),
  frames: [
    {
      ...descriptor("frame", jpeg),
      timestampMs: 1000,
      selectionReason: "periodic sample",
    },
  ],
};
const fetchImpl = async (url: URL) =>
  new Response(url.pathname.endsWith("audio") ? Buffer.alloc(44) : jpeg);
const transcribe = async () => ({
  audioSha256: media.audio.sha256,
  durationMs: 8000,
  segments: [{ text: "Owned synthetic speech", startMs: 0, endMs: 4000 }],
});
it("transcribes bounded hashed PCM, sends only inline frames and saves exact timestamped evidence without provider fallback", async () => {
  const input = await preparePersonalInput(media, {
    fetchImpl,
    transcribe,
    asr: {},
  });
  expect(input.transcript[0]).toEqual({
    id: "segment-0",
    text: "Owned synthetic speech",
    startMs: 0,
    endMs: 4000,
  });
  expect(input.frames[0].dataUrl).toMatch(/^data:image\/jpeg;base64,/);
  const job = {
    id: "synthetic-video",
    generation: 1,
    model: "observed-model",
    effort: "medium",
    coverage: "full_sampled",
    media,
    deadline: Date.now() + 850000,
    profileBinding: createHash("sha256").update("profile").digest("hex"),
  };
  const output = {
    schemaVersion: "1.0.0",
    sourceId: job.id,
    processingRunId: `${job.id}:1`,
    coverage: job.coverage,
    summary: "Owned fixture",
    warnings: ["Sampled."],
    insights: [
      {
        id: "one",
        title: "Visual point",
        claim: "Owned fixture",
        interpretation: "Useful reference",
        categories: ["product_design"],
        confidence: "supported",
        verificationNeeds: [],
        evidence: [{ kind: "frame", id: "frame", startMs: 1000, endMs: 1000 }],
      },
    ],
  };
  let saved: any;
  const client = {
    status: async () => ({ activeProfileId: "profile" }),
    respond: async (args: any) => {
      expect(args.frames).toHaveLength(1);
      expect(args.input).toContain("Owned synthetic speech");
      expect(args.tools).toBeUndefined();
      return { text: JSON.stringify(output) };
    },
  };
  await processPersonalJob(job, {
    client,
    prepareInput: async () => input,
    request: async (op: string, args: any) => {
      if (op === "complete") saved = args;
      return op === "heartbeat"
        ? { valid: true, deadline: job.deadline }
        : { accepted: true };
    },
  });
  expect(saved.transcript).toEqual(input.transcript);
  expect(saved.output.insights[0].evidence[0].id).toBe("frame");
  output.insights[0].evidence[0].id = "invented";
  await expect(
    processPersonalJob(job, {
      client,
      prepareInput: async () => input,
      request: async () => ({ valid: true, deadline: job.deadline }),
    }),
  ).rejects.toThrow("PERSONAL_OUTPUT_INVALID");
});
it("rejects remote fetch abuse, redirects, changed bytes, duplicate evidence, excessive work and fabricated transcription", async () => {
  for (const invalid of [
    { ...media, audio: { ...media.audio, url: "http://localhost/secret" } },
    { ...media, audio: { ...media.audio, size: 19500001 } },
    { ...media, audio: { ...media.audio, sha256: "b".repeat(64) } },
    { ...media, frames: [media.frames[0], media.frames[0]] },
    { ...media, frames: [{ ...media.frames[0], timestampMs: 8000 }] },
    { ...media, coverage: "caption_only" },
  ])
    await expect(
      preparePersonalInput(invalid, { fetchImpl, transcribe, asr: {} }),
    ).rejects.toThrow();
  await expect(
    preparePersonalInput(media, {
      fetchImpl,
      transcribe: async () => ({
        ...(await transcribe()),
        segments: [{ text: "bad", startMs: 0, endMs: 8001 }],
      }),
      asr: {},
    }),
  ).rejects.toThrow("PERSONAL_TRANSCRIPT_INVALID");
  await expect(
    preparePersonalInput(media, { fetchImpl, transcribe }),
  ).rejects.toThrow("PERSONAL_ASR_SETUP_REQUIRED");
});
it("keeps the bounded terminal timing correction visible and excludes arbitrary subprocess warnings", async () => {
  const warning =
    "The final transcript segment timing was clipped to the actual audio duration.";
  const input = await preparePersonalInput(media, {
    fetchImpl,
    asr: {},
    transcribe: async () => ({
      ...(await transcribe()),
      warnings: [warning, "Untrusted diagnostic text"],
    }),
  });
  expect(input.transcriptionWarnings).toEqual([warning]);
});
