import { mutation, internalMutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { writeAccess, recentAuthentication, limit, audit } from "./lib";
import { ensure, containsSecret } from "../packages/policy";
import { insightOutput } from "../packages/contracts";
import { reserve, settle } from "./product";
import { personalAllowed } from "./lib/personalAccess";

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
      source.kind === "text" && source.text && source.rightsAttested,
      "UPLOAD_REQUIRED",
      "This route currently accepts supplied text. Video processing needs its separate media integration.",
    );
    ensure(
      (device.personalSeenAt ?? 0) > Date.now() - 60000 &&
        /^[a-f0-9]{64}$/.test(device.personalProfileBinding ?? "") &&
        device.personalModels?.some((m) => m.slug === a.model),
      "SETUP_REQUIRED",
      "Start the personal analysis runner and choose an available account model.",
    );
    const generation = source.generation + 1;
    await reserve(
      ctx,
      source.organizationId,
      `source:${source._id}:${generation}`,
      0,
    );
    await ctx.db.patch(source._id, {
      generation,
      state: "queued",
      error: undefined,
      personalAnalysis: {
        deviceId: device._id,
        actor: actor._id,
        generation,
        model: a.model,
        profileBinding: device.personalProfileBinding!,
        effort: a.effort,
        state: "queued",
        approvedAt: Date.now(),
        expiresAt: Date.now() + 900000,
        leaseUntil: 0,
        deadline: 0,
      },
      updatedAt: Date.now(),
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
    if (!["queued", "running"].includes(source.personalAnalysis.state)) return;
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
          deadline = now + 180000;
        await ctx.db.patch(source._id, {
          state: "processing",
          personalAnalysis: { ...job, state: "running", leaseUntil, deadline },
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
            coverage: "caption_only",
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
        source.kind === "text" &&
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
          leaseUntil: Math.min(now + 40000, job.deadline),
        },
      });
      return { valid: true, deadline: job.deadline };
    }
    const output: any = insightOutput.parse(a.output);
    ensure(
      JSON.stringify(output).length <= 120000 &&
        !containsSecret(JSON.stringify(output)) &&
        output.sourceId === source._id &&
        output.processingRunId === `${source._id}:${job.generation}` &&
        output.coverage === "caption_only",
      "INVALID_EVIDENCE",
      "Invalid personal source output.",
    );
    for (const insight of output.insights)
      for (const evidence of insight.evidence)
        ensure(
          evidence.kind === "user_note" &&
            evidence.id === "supplied_text" &&
            evidence.startMs === null &&
            evidence.endMs === null,
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
      summary: output.summary,
      coverage: output.coverage,
      searchable: [
        source.title,
        source.text,
        output.summary,
        ...source.tags,
        ...output.insights.flatMap((i: any) => i.categories),
      ].join(" "),
      personalAnalysis: { ...job, state: "completed", ...a.usage },
      error: undefined,
      updatedAt: now,
    });
    await ctx.db.patch(device._id, { activePersonalSource: undefined });
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
