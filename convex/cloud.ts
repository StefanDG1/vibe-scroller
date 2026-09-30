"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { authorizeRepository } from "./lib/githubAuthorization";
import { infer } from "./lib/inference";
import {
  createCodingSandbox,
  codeChanges,
  checkPatch,
  killSandbox,
} from "../packages/providers/cloud";
export const execute = internalAction({
  args: { id: v.id("runs") },
  handler: async (ctx, a) => {
    const run = await ctx.runMutation(internal.jobs.claimCloud, a);
    if (!run) return;
    let sandbox;
    let credits = 0;
    let computeStarted = 0;
    let stage = "authorization";
    try {
      await authorizeRepository(ctx, run.repo);
      stage = "sandbox";
      computeStarted = Date.now();
      sandbox = await createCodingSandbox(run.maxSeconds);
      await ctx.runMutation(internal.jobs.sandboxStarted, {
        id: run._id,
        generation: run.generation,
        sandboxId: sandbox.sandboxId,
      });
      await ctx.scheduler.runAfter(15000, internal.cloud.watchdog, {
        id: run._id,
        generation: run.generation,
        sandboxId: sandbox.sandboxId,
      });
      stage = "snapshot_and_generation";
      const generated = await codeChanges({
        repo: run.repo,
        baseSha: run.baseSha,
        plan: run.plan,
        allowedPaths: run.allowedPaths,
        highRisk: run.highRisk,
        maxCredits: run.maxCredits,
        generate: (schema, prompt, input, maxOutput) =>
          infer(ctx, schema, prompt, input, maxOutput),
      });
      credits = generated.credits;
      if (credits + run.computeReserve > run.maxCredits)
        throw new Error("Budget exhausted before test execution.");
      const status = await ctx.runQuery(internal.jobs.workerRun, {
        id: run._id,
      });
      if (
        !status ||
        status.generation !== run.generation ||
        status.state === "canceled"
      )
        throw new Error("Run canceled.");
      await authorizeRepository(ctx, run.repo);
      stage = "isolated_checks";
      const checked = await checkPatch(
        sandbox,
        generated.base,
        generated.changes,
        run.plan.tests,
      );
      await sandbox.kill();
      sandbox = undefined;
      const seconds = Math.ceil((Date.now() - computeStarted) / 1000),
        cost =
          credits +
          Math.ceil(
            seconds * Number(process.env.E2B_CREDITS_PER_SECOND ?? "1"),
          );
      await ctx.runMutation(internal.jobs.completeCloud, {
        id: run._id,
        generation: run.generation,
        patch: checked.patch,
        changes: generated.changes,
        report: `${checked.report}\n\nLimitations: ${generated.limitations.join("; ")}`,
        credits: cost,
      });
    } catch (error) {
      const category =
        error instanceof Error
          ? ([
              "REPO_TOO_LARGE",
              "POLICY_BLOCKED",
              "PROVIDER_LIMIT",
              "PROVIDER_ERROR",
              "FORBIDDEN",
              "SETUP_REQUIRED",
            ].find((code) => error.message.includes(code)) ?? error.name)
          : "UnknownError";
      console.error(JSON.stringify({ stage, category }));
      await ctx.runMutation(internal.jobs.failCloud, {
        id: run._id,
        generation: run.generation,
        credits,
        error: `Cloud task failed or stopped at ${stage} (${category}). Review provider and usage; no draft PR was published.`,
      });
    } finally {
      if (sandbox) await sandbox.kill();
    }
  },
});
export const watchdog = internalAction({
  args: { id: v.id("runs"), generation: v.number(), sandboxId: v.string() },
  handler: async (ctx, a) => {
    const run = await ctx.runQuery(internal.jobs.workerRun, { id: a.id });
    if (
      !run ||
      run.generation !== a.generation ||
      ["canceled", "failed", "awaiting_review", "completed"].includes(
        run.state,
      ) ||
      run.leaseUntil < Date.now()
    ) {
      await killSandbox(a.sandboxId);
      return;
    }
    await ctx.scheduler.runAfter(15000, internal.cloud.watchdog, a);
  },
});
export const waiveStagingFailure = internalAction({
  args: { id: v.id("runs"), reason: v.string() },
  handler: async (ctx, a) => {
    const run = await ctx.runQuery(internal.jobs.workerRun, { id: a.id });
    if (
      !run ||
      run.state !== "failed" ||
      run.organizationId !== process.env.STAGING_TEST_ORGANIZATION_ID
    )
      throw new Error("Configured failed staging run required.");
    const event = run.events.find((e) =>
      e.startsWith("Isolated sandbox started: "),
    );
    const sandboxId = event?.slice("Isolated sandbox started: ".length);
    if (!sandboxId || !/^[a-z0-9-]{1,128}$/.test(sandboxId))
      throw new Error("Recorded sandbox termination evidence required.");
    await killSandbox(sandboxId);
    await ctx.runMutation(internal.jobs.waiveStagingFailure, a);
    return { serviceChargeWaived: true, operatorCostReconciled: false };
  },
});
