"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { prepareMedia } from "../packages/providers/media";
import { personalDecoder } from "../packages/media/decoder-personal";
import { signedObject, objectMetadata } from "../packages/providers/storage";
import { createHash, randomUUID } from "node:crypto";
import { ensure } from "../packages/policy";

export const prepare = internalAction({
  args: { id: v.id("sources"), generation: v.number() },
  handler: async (ctx, a) => {
    const source = await ctx.runMutation(internal.personalMediaState.begin, a);
    if (!source) return;
    let computeCredits: number | undefined;
    const staged: string[] = [];
    try {
      const rate = Number(process.env.E2B_CREDITS_PER_SECOND);
      // Bound total sandbox lifetime, not just the expected clip time.
      ensure(
        Number.isFinite(rate) && rate > 0 && Math.ceil(300 * rate) <= 10,
        "QUOTE_CHANGED",
        "The media worker's configured ceiling exceeds the approved budget.",
      );
      const prepared = await prepareMedia(
        source.objectKey!,
        personalDecoder,
        true,
      );
      computeCredits = Math.ceil(prepared.computeSeconds * rate);
      ensure(
        computeCredits <= 10,
        "BUDGET_EXCEEDED",
        "Compute exceeded its approved ceiling.",
      );
      if (!(await ctx.runQuery(internal.personalMediaState.pending, a)))
        throw new Error("CANCELED");
      const media: any = {
        durationMs: Math.round(prepared.manifest.durationSeconds * 1000),
        coverage: prepared.manifest.coverage,
        frames: [],
      };
      const put = async (bytes: Uint8Array, type: string) => {
        const key = `${source.organizationId}/personal-${randomUUID()}`;
        staged.push(key);
        const res = await fetch(signedObject(key, "PUT", 120), {
          method: "PUT",
          headers: { "Content-Type": type },
          body: bytes.slice().buffer as ArrayBuffer,
          signal: AbortSignal.timeout(30000),
        });
        ensure(res.ok, "STORAGE_UNAVAILABLE", "Private media write failed.");
        const metadata = await objectMetadata(key);
        ensure(
          metadata.size === bytes.byteLength && metadata.type === type,
          "INVALID_EVIDENCE",
          "Media write changed.",
        );
        return {
          key,
          size: bytes.byteLength,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          etag: metadata.etag ?? "",
        };
      };
      if (prepared.audio) {
        const blob = await put(prepared.audio, "audio/wav");
        const assetId = await ctx.runMutation(
          internal.assets.registerNormalized,
          {
            sourceId: a.id,
            generation: a.generation,
            key: blob.key,
            size: blob.size,
            etag: blob.etag,
          },
        );
        ensure(assetId, "APPROVAL_STALE", "Media source changed.");
        media.audio = { ...blob, assetId };
      }
      for (const f of prepared.frames) {
        if (!(await ctx.runQuery(internal.personalMediaState.pending, a)))
          throw new Error("CANCELED");
        const blob = await put(Buffer.from(f.data, "base64"), "image/jpeg");
        const assetId = await ctx.runMutation(
          internal.assets.registerEvidence,
          {
            sourceId: a.id,
            generation: a.generation,
            key: blob.key,
            size: blob.size,
            etag: blob.etag,
          },
        );
        ensure(assetId, "APPROVAL_STALE", "Media source changed.");
        media.frames.push({
          ...blob,
          assetId,
          timestampMs: f.timestampMs,
          selectionReason: f.selectionReason,
        });
      }
      const accepted = await ctx.runMutation(
        internal.personalMediaState.finish,
        { ...a, organizationId: source.organizationId, computeCredits, media },
      );
      if (accepted) return;
    } catch {
      await ctx.runMutation(internal.personalMediaState.finish, {
        ...a,
        organizationId: source.organizationId,
        ...(computeCredits === undefined ? {} : { computeCredits }),
      });
    }
    for (const key of staged)
      await ctx.runMutation(internal.assets.queueEvidenceDeletion, { key });
  },
});
export const lease = internalAction({
  args: {
    credentialHash: v.string(),
    id: v.id("sources"),
    generation: v.number(),
  },
  handler: async (ctx, a): Promise<any> => {
    const media = await ctx.runQuery(internal.personalAnalysis.mediaLease, a);
    ensure(media, "APPROVAL_STALE", "Media unavailable.");
    const blob = (b: any) => ({
      id: b.assetId,
      size: b.size,
      sha256: b.sha256,
      url: signedObject(b.key, "GET", 120),
    });
    return {
      durationMs: media.durationMs,
      coverage: media.coverage,
      ...(media.audio ? { audio: blob(media.audio) } : {}),
      frames: media.frames.map((f: any) => ({
        ...blob(f),
        timestampMs: f.timestampMs,
        selectionReason: f.selectionReason,
      })),
    };
  },
});
