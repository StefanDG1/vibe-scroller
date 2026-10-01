import { mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { writeAccess, recentAuthentication, limit, audit } from "./lib";
import { ensure, containsSecret } from "../packages/policy";
import { insightOutput } from "../packages/contracts";
import { reserve, settle } from "./product";
import { personalAllowed } from "./lib/personalAccess";
import { releaseUnstarted } from "./personalMediaState";

// A personal alpha is explicitly bound to verified WorkOS subjects. Email or
// a saved preference cannot activate subscription permission for hosted users.
async function authorizedDevice(ctx: QueryCtx, hash: string) {
  ensure(
    process.env.RESTORE_LOCK !== "true",
    "FORBIDDEN",
    "Recovery is in progress.",
  );
  ensure(
    /^[a-f0-9]{64}$/.test(hash),
    "FORBIDDEN",
    "Invalid device credential.",
  );
  const device = await ctx.db
    .query("devices")
    .withIndex("by_credential", (q) => q.eq("credentialHash", hash))
    .unique();
  const actor = device ? await ctx.db.get(device.owner) : null;
  const organization = device ? await ctx.db.get(device.organizationId) : null;
  const membership = device
    ? await ctx.db
        .query("memberships")
        .withIndex("by_pair", (q) =>
          q
            .eq("organizationId", device.organizationId)
            .eq("userId", device.owner),
        )
        .unique()
    : null;
  ensure(
    device?.state === "paired" &&
      actor?.status === "active" &&
      organization?.status === "active" &&
      membership &&
      ["owner", "admin", "member"].includes(membership.role) &&
      personalAllowed(actor.subject),
    "FORBIDDEN",
    "Personal analysis is unavailable for this device or account.",
  );
  return device;
}
export const approve = mutation({
  args: {
    id: v.id("sources"),
    generation: v.number(),
    deviceId: v.id("devices"),
    model: v.string(),
    effort: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    useOwnPlan: v.boolean(),
    maxComputeCredits: v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    const source = await ctx.db.get(a.id);
    ensure(
      source && source.state !== "deleted",
      "FORBIDDEN",
      "Source unavailable.",
    );
    const { actor } = await writeAccess(ctx, source.organizationId);
    await recentAuthentication(ctx);
    await limit(ctx, `personal-approval:${actor._id}`, 6);
    const device = await ctx.db.get(a.deviceId);
    ensure(
      personalAllowed(actor.subject) &&
        a.useOwnPlan &&
        device?.state === "paired" &&
        device.owner === actor._id &&
        device.organizationId === source.organizationId,
      "FORBIDDEN",
      "Use your own paired computer and explicit plan permission.",
    );
    ensure(
      source.generation === a.generation &&
        !["queued", "processing", "ready"].includes(source.state),
      "APPROVAL_STALE",
      "Review the current source state before approving.",
    );
    ensure(
      ((source.kind === "text" && source.text) ||
        (source.kind === "upload" && source.objectKey)) &&
        source.rightsAttested,
      "UPLOAD_REQUIRED",
      "Attach permitted media before analyzing this link.",
    );
    ensure(
      (device.personalSeenAt ?? 0) > Date.now() - 60000 &&
        /^[a-f0-9]{64}$/.test(device.personalProfileBinding ?? "") &&
        device.personalModels?.some((m) => m.slug === a.model),
      "SETUP_REQUIRED",
      "Start the personal analysis runner and choose an available account model.",
    );
    const generation = source.generation + 1;
    const media = source.kind === "upload";
    if (media) {
      const unresolved = await ctx.db
        .query("reservations")
        .withIndex("by_org", (q) =>
          q.eq("organizationId", source.organizationId),
        )
        .collect();
      ensure(
        !unresolved.some(
          (r) =>
            r.key.startsWith(`personal-media:${source._id}:`) &&
            r.state === "active",
        ),
        "COST_RECONCILIATION_REQUIRED",
        "Reconcile the earlier media compute reservation before retrying.",
      );
      ensure(
        a.maxComputeCredits === 10 && process.env.MEDIA_VERIFIED === "true",
        "SETUP_REQUIRED",
        "Approve the verified media worker's maximum 10 compute credits.",
      );
      const asset = await ctx.db
        .query("assets")
        .withIndex("by_key", (q) => q.eq("key", source.objectKey!))
        .unique();
      ensure(
        asset?.state === "complete" &&
          asset.sourceId === source._id &&
          asset.organizationId === source.organizationId &&
          (asset.expiresAt === undefined || asset.expiresAt > Date.now()),
        "UPLOAD_INVALID",
        "The original media is unavailable.",
      );
      await reserve(
        ctx,
        source.organizationId,
        `personal-media:${source._id}:${generation}`,
        10,
      );
    }
    await reserve(
      ctx,
      source.organizationId,
      `source:${source._id}:${generation}`,
      0,
    );
    await ctx.db.patch(source._id, {
      generation,
      state: media ? "processing" : "queued",
      personalMedia: undefined,
      error: undefined,
      personalAnalysis: {
        deviceId: device._id,
        actor: actor._id,
        generation,
        model: a.model,
        profileBinding: device.personalProfileBinding!,
        effort: a.effort,
        state: media ? "preparing" : "queued",
        approvedAt: Date.now(),
        expiresAt: Date.now() + 900000,
        leaseUntil: 0,
        deadline: 0,
        stage: media ? "preparing" : "analyzing",
      },
      updatedAt: Date.now(),
    });
    if (media)
      await ctx.scheduler.runAfter(0, internal.personalMedia.prepare, {
        id: source._id,
        generation,
      });
    await audit(
      ctx,
      source.organizationId,
      actor._id,
      "personal_analysis_approved",
      `${source._id}:${generation}`,
    );
  },
});
export const cancel = mutation({
  args: { id: v.id("sources") },
  handler: async (ctx, { id }) => {
    const source = await ctx.db.get(id);
    ensure(
      source && source.personalAnalysis,
      "FORBIDDEN",
      "Personal analysis unavailable.",
    );
    const { actor } = await writeAccess(ctx, source.organizationId);
    ensure(
      source.personalAnalysis.actor === actor._id,
      "FORBIDDEN",
      "Only the approving account may cancel its plan request.",
    );
    if (
      !["preparing", "queued", "running"].includes(
        source.personalAnalysis.state,
      )
    )
      return;
    await releaseUnstarted(
      ctx,
      source.organizationId,
      source._id,
      source.personalAnalysis.generation,
    );
    await settle(
      ctx,
      source.organizationId,
      `source:${id}:${source.personalAnalysis.generation}`,
      0,
    );
    await ctx.db.patch(id, {
      state: "failed",
      generation: source.generation + 1,
      personalAnalysis: { ...source.personalAnalysis, state: "canceled" },
      error:
        "Personal analysis was canceled. Your plan may have counted work already started.",
      updatedAt: Date.now(),
    });
  },
});
export const dispatch = internalMutation({
  args: {
    credentialHash: v.string(),
    operation: v.union(
      v.literal("hello"),
      v.literal("poll"),
      v.literal("heartbeat"),
      v.literal("complete"),
      v.literal("fail"),
    ),
    models: v.optional(
      v.array(v.object({ slug: v.string(), displayName: v.string() })),
    ),
    profileBinding: v.optional(v.string()),
    id: v.optional(v.id("sources")),
    generation: v.optional(v.number()),
    output: v.optional(v.any()),
    transcript: v.optional(v.any()),
    stage: v.optional(
      v.union(v.literal("transcribing"), v.literal("analyzing")),
    ),
    usage: v.optional(
      v.object({ inputTokens: v.number(), outputTokens: v.number() }),
    ),
  },
  handler: async (ctx, a) => {
    const device = await authorizedDevice(ctx, a.credentialHash);
    await limit(ctx, `personal-device:${device._id}`, 24);
    const now = Date.now();
    if (a.operation === "hello") {
      ensure(
        a.models &&
          a.models.length > 0 &&
          a.models.length <= 50 &&
          /^[a-f0-9]{64}$/.test(a.profileBinding ?? "") &&
          a.models.every(
            (m) =>
              /^[a-zA-Z0-9_.:-]{1,100}$/.test(m.slug) &&
              m.displayName.length <= 120,
          ) &&
          new Set(a.models.map((m) => m.slug)).size === a.models.length,
        "INVALID_INPUT",
        "Invalid model catalogue.",
      );
      await ctx.db.patch(device._id, {
        personalModels: a.models,
        personalProfileBinding: a.profileBinding,
        personalSeenAt: now,
      });
      return { online: true, workspaceId: device.organizationId };
    }
    await ctx.db.patch(device._id, { personalSeenAt: now });
    if (a.operation === "poll") {
      if (device.activePersonalSource) {
        const active = await ctx.db.get(device.activePersonalSource);
        if (
          active?.personalAnalysis?.state === "running" &&
          active.personalAnalysis.leaseUntil <= now
        ) {
          await ctx.db.patch(active._id, {
            state: "failed",
            error:
              "The laptop lease expired. Usage is uncertain; review before approving another request.",
            personalAnalysis: { ...active.personalAnalysis, state: "expired" },
            updatedAt: now,
          });
          await settle(
            ctx,
            device.organizationId,
            `source:${active._id}:${active.personalAnalysis.generation}`,
            0,
          );
        }
        return {
          job: null,
          reconcile: {
            id: device.activePersonalSource,
            generation: active?.personalAnalysis?.generation ?? null,
          },
        };
      }
      const queued = await ctx.db
        .query("sources")
        .withIndex("by_personal_device_state", (q) =>
          q
            .eq("personalAnalysis.deviceId", device._id)
            .eq("personalAnalysis.state", "queued"),
        )
        .take(20);
      for (const source of queued) {
        const job = source.personalAnalysis!;
        if (
          job.expiresAt <= now ||
          source.state !== "queued" ||
          source.generation !== job.generation ||
          job.actor !== device.owner ||
          job.profileBinding !== device.personalProfileBinding ||
          source.organizationId !== device.organizationId ||
          !device.personalModels?.some((m) => m.slug === job.model)
        ) {
          await ctx.db.patch(source._id, {
            personalAnalysis: { ...job, state: "expired" },
            state: "failed",
            error: "Personal approval expired or changed. Review it again.",
            updatedAt: now,
          });
          await settle(
            ctx,
            source.organizationId,
            `source:${source._id}:${job.generation}`,
            0,
          );
          continue;
        }
        const leaseUntil = now + 40000,
          deadline = now + (source.kind === "upload" ? 900000 : 180000);
        await ctx.db.patch(source._id, {
          state: "processing",
          personalAnalysis: { ...job, state: "running", stage:source.kind === "upload" ? "transcribing" : "analyzing", leaseUntil, deadline },
          updatedAt: now,
        });
        await ctx.db.patch(device._id, { activePersonalSource: source._id });
        return {
          job: {
            id: source._id,
            generation: job.generation,
            model: job.model,
            effort: job.effort,
            profileBinding: job.profileBinding,
            text: source.text,
            coverage:
              source.kind === "upload"
                ? source.personalMedia?.coverage
                : "caption_only",
            ...(source.kind === "upload"
              ? { media: source.personalMedia }
              : {}),
            leaseUntil,
            deadline,
          },
        };
      }
      return { job: null };
    }
    ensure(
      a.id && device.activePersonalSource === a.id,
      "APPROVAL_STALE",
      "No matching active job.",
    );
    const source = await ctx.db.get(a.id);
    const job = source?.personalAnalysis;
    if (a.operation === "fail") {
      ensure(
        !source ||
          !job ||
          (job.deviceId === device._id && job.generation === a.generation),
        "APPROVAL_STALE",
        "Wrong job generation.",
      );
      if (source && job?.state === "running") {
        await settle(
          ctx,
          device.organizationId,
          `source:${source._id}:${job.generation}`,
          0,
        );
        await ctx.db.patch(source._id, {
          state: "failed",
          personalAnalysis: { ...job, state: "failed" },
          error:
            "The personal model request did not complete. No alternate provider was used. Review plan usage before retrying.",
          updatedAt: now,
        });
      }
      await ctx.db.patch(device._id, { activePersonalSource: undefined });
      return { stopped: true };
    }
    ensure(
      source &&
        source.organizationId === device.organizationId &&
        ["text", "upload"].includes(source.kind) &&
        source.state === "processing" &&
        job?.deviceId === device._id &&
        job.actor === device.owner &&
        job.profileBinding === device.personalProfileBinding &&
        job.state === "running" &&
        source.generation === a.generation &&
        job.generation === a.generation &&
        job.leaseUntil > now &&
        job.deadline > now,
      "APPROVAL_STALE",
      "Personal lease was canceled, expired or changed.",
    );
    if (a.operation === "heartbeat") {
      await ctx.db.patch(source._id, {
        personalAnalysis: {
          ...job,
          ...(a.stage ? { stage: a.stage } : {}),
          leaseUntil: Math.min(now + 40000, job.deadline),
        },
      });
      return { valid: true, deadline: job.deadline };
    }
    const output: any = insightOutput.parse(a.output);
    if (source.kind === "upload")
      output.warnings = [
        ...new Set([
          "Video frames are sampled; short scenes can be missed. Automatic transcription can contain errors.",
          ...output.warnings,
        ]),
      ].slice(0, 20);
    ensure(
      JSON.stringify(output).length <= 120000 &&
        !containsSecret(JSON.stringify(output)) &&
        output.sourceId === source._id &&
        output.processingRunId === `${source._id}:${job.generation}` &&
        output.coverage ===
          (source.kind === "upload"
            ? source.personalMedia?.coverage
            : "caption_only"),
      "INVALID_EVIDENCE",
      "Invalid personal source output.",
    );
    const transcript =
      source.kind === "upload"
        ? validateTranscript(a.transcript, source.personalMedia)
        : [];
    const evidenceList =
      source.kind === "upload"
        ? [
            ...transcript.map((s: any) => ({
              kind: "transcript",
              id: s.id,
              startMs: s.startMs,
              endMs: s.endMs,
            })),
            ...source.personalMedia.frames.map((f: any) => ({
              kind: "frame",
              id: f.assetId,
              startMs: f.timestampMs,
              endMs: f.timestampMs,
            })),
          ]
        : [
            {
              kind: "user_note",
              id: "supplied_text",
              startMs: null,
              endMs: null,
            },
          ];
    if (source.kind === "upload")
      for (const frame of source.personalMedia.frames) {
        const assetId = ctx.db.normalizeId("assets", frame.assetId);
        const asset = assetId ? await ctx.db.get(assetId) : null;
        ensure(
          asset?.sourceId === source._id &&
            asset.organizationId === source.organizationId &&
            asset.state === "complete" &&
            asset.kind === "evidence",
          "INVALID_EVIDENCE",
          "Frame evidence is unavailable.",
        );
      }
    for (const insight of output.insights)
      for (const evidence of insight.evidence)
        ensure(
          evidenceList.some(
            (e: any) =>
              e.kind === evidence.kind &&
              e.id === evidence.id &&
              e.startMs === evidence.startMs &&
              e.endMs === evidence.endMs,
          ),
          "INVALID_EVIDENCE",
          "Unverified evidence reference.",
        );
    ensure(
      !a.usage ||
        [a.usage.inputTokens, a.usage.outputTokens].every(
          (n) => Number.isSafeInteger(n) && n >= 0 && n <= 10000000,
        ),
      "INVALID_INPUT",
      "Invalid plan usage.",
    );
    await settle(
      ctx,
      device.organizationId,
      `source:${source._id}:${job.generation}`,
      0,
    );
    await ctx.db.patch(source._id, {
      state: "ready",
      analysis: output,
      ...(source.kind === "upload"
        ? {
            text: transcript.map((s: any) => s.text).join(" "),
            mediaCoverage: output.coverage,
            mediaEvidence: evidenceList,
            originalMediaEvidence: evidenceList,
          }
        : {}),
      summary: output.summary,
      coverage: output.coverage,
      tags: [...new Set([...source.tags, ...output.insights.flatMap((i:any)=>i.categories)])].slice(0,20),
      searchable: [
        source.title,
        source.text,
        ...transcript.map((s: any) => s.text),
        output.summary,
        ...source.tags,
        ...output.insights.flatMap((i: any) => i.categories),
      ].join(" "),
      personalAnalysis: { ...job, state: "completed", ...a.usage },
      error: undefined,
      updatedAt: now,
    });
    await ctx.db.patch(device._id, { activePersonalSource: undefined });
    if (source.kind === "upload")
      await ctx.scheduler.runAfter(0, internal.assets.expireOriginal, {
        sourceId: source._id,
        generation: source.generation,
      });
    await ctx.db.insert("notifications", {
      organizationId: device.organizationId,
      key: `source:${source._id}:${job.generation}`,
      message: "A source summary is ready.",
      read: false,
      createdAt: now,
      updatedAt: now,
    });
    return { accepted: true };
  },
});

export function validateTranscript(value: unknown, media: any): any[] {
  ensure(
    Array.isArray(value) &&
      value.length <= 200 &&
      (media.audio || value.length === 0),
    "INVALID_EVIDENCE",
    "Invalid automatic transcript.",
  );
  let chars = 0;
  for (let i = 0; i < value.length; i++) {
    const s = value[i];
    ensure(
      s &&
        Object.keys(s).every((k) =>
          ["id", "text", "startMs", "endMs"].includes(k),
        ) &&
        s.id === `segment-${i}` &&
        typeof s.text === "string" &&
        s.text.length <= 4000 &&
        Number.isSafeInteger(s.startMs) &&
        Number.isSafeInteger(s.endMs) &&
        s.startMs >= 0 &&
        s.endMs >= s.startMs &&
        s.endMs <= media.durationMs,
      "INVALID_EVIDENCE",
      "Invalid transcript timing or identity.",
    );
    chars += s.text.length;
  }
  ensure(
    chars <= 60000 && !containsSecret(JSON.stringify(value)),
    "INVALID_EVIDENCE",
    "Transcript exceeded its safe bound.",
  );
  return value;
}

export const mediaLease = internalQuery({
  args: {
    credentialHash: v.string(),
    id: v.id("sources"),
    generation: v.number(),
  },
  handler: async (ctx, a) => {
    const device = await authorizedDevice(ctx, a.credentialHash);
    const source = await ctx.db.get(a.id),
      job = source?.personalAnalysis;
    ensure(
      device.activePersonalSource === a.id &&
        source?.organizationId === device.organizationId &&
        source.generation === a.generation &&
        source.state === "processing" &&
        job?.deviceId === device._id &&
        job.profileBinding === device.personalProfileBinding &&
        job.state === "running" &&
        job.leaseUntil > Date.now() &&
        job.deadline > Date.now(),
      "APPROVAL_STALE",
      "Media lease is unavailable.",
    );
    ensure(
      source.personalMedia,
      "INVALID_EVIDENCE",
      "Prepared media is missing.",
    );
    for (const b of [
      ...source.personalMedia.frames,
      ...(source.personalMedia.audio ? [source.personalMedia.audio] : []),
    ]) {
      const assetId = ctx.db.normalizeId("assets", b.assetId),
        asset = assetId ? await ctx.db.get(assetId) : null;
      ensure(
        asset?.sourceId === source._id &&
          asset.organizationId === source.organizationId &&
          asset.key === b.key &&
          asset.size === b.size &&
          asset.state === "complete" &&
          (asset.expiresAt === undefined || asset.expiresAt > Date.now()),
        "INVALID_EVIDENCE",
        "Private media expired or changed.",
      );
    }
    return source.personalMedia;
  },
});
