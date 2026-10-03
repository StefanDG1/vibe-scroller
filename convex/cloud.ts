"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { authorizeRepository } from "./lib/githubAuthorization";
import { infer } from "./lib/inference";
import { customerStructured } from "../packages/providers/customerAi";
import { decrypt } from "../packages/providers/secrets";
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
    let generationUsageKnown = false;
    let completed = false;
    let terminatedSandboxId: string | undefined;
    let stage = "authorization";
    try {
      await authorizeRepository(ctx, run.repo, run.baseSha);
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
        generate: async (schema, prompt, input, maxOutput) => {
          if (run.fundingRoute !== "customer_api_key")
            return infer(
              ctx,
              schema,
              prompt,
              input,
              maxOutput,
              Math.min(100000, (run.maxCredits - run.computeReserve) * 10000),
            );
          const credential = await ctx.runMutation(
            internal.jobs.startCustomerRequest,
            { id: run._id, generation: run.generation },
          );
          const abort = new AbortController();
          const timer = setInterval(() => {
            void ctx
              .runQuery(internal.jobs.customerRequestActive, {
                id: run._id,
                generation: run.generation,
              })
              .then((active) => {
                if (!active) abort.abort();
              })
              .catch(() => abort.abort());
          }, 2000);
          try {
            const result = await customerStructured(
              decrypt(
                credential.ciphertext,
                credential.keyVersion,
                credential.organizationId,
                "openai",
              ),
              credential.model,
              credential.maxUsdCents,
              schema,
              prompt,
              input,
              abort.signal,
            );
            await ctx.runMutation(internal.jobs.recordCustomerUsage, {
              id: run._id,
              generation: run.generation,
              cents: result.providerUsdCents,
            });
            return result;
          } finally {
            clearInterval(timer);
          }
        },
      });
      credits = generated.credits;
      generationUsageKnown = true;
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
      await authorizeRepository(ctx, run.repo, run.baseSha);
      stage = "isolated_checks";
      await ctx.runMutation(internal.jobs.isolatedChecksStarted, {
        id: run._id,
        generation: run.generation,
      });
      const checked = await checkPatch(
        sandbox,
        generated.base,
        generated.changes,
        run.plan.tests,
      );
      const sandboxId = sandbox.sandboxId;
      await sandbox.kill();
      terminatedSandboxId = sandboxId;
      sandbox = undefined;
      const seconds = Math.min(
          run.maxSeconds,
          Math.ceil((Date.now() - computeStarted) / 1000),
        ),
        cost = credits + Math.ceil(seconds * run.computeRate);
      completed = await ctx.runMutation(internal.jobs.completeCloud, {
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
              "BASE_CHANGED",
              "APPROVAL_STALE",
            ].find((code) => error.message.includes(code)) ?? error.name)
          : "UnknownError";
      console.error(JSON.stringify({ stage, category }));
      await ctx.runMutation(internal.jobs.failCloud, {
        id: run._id,
        generation: run.generation,
        credits,
        beforeSandboxCreation:
          stage === "authorization" && computeStarted === 0,
        error:
          category === "BASE_CHANGED"
            ? "Repository base changed. Refresh the project snapshot and review a new plan approval. No draft PR was published."
            : `Cloud task failed or stopped at ${stage} (${category}). Review provider and usage; no draft PR was published.`,
      });
    } finally {
      if (sandbox) {
        await sandbox.kill();
        terminatedSandboxId = sandbox.sandboxId;
      }
      // An acknowledged stop/delete plus measured generation allows release
      // of the unused service-credit hold. Unknown creation, teardown or
      // generation cost keeps its reservation for operator reconciliation.
      if (terminatedSandboxId && generationUsageKnown && !completed) {
        const seconds = Math.min(
          run.maxSeconds,
          Math.ceil((Date.now() - computeStarted) / 1000),
        );
        const cost = credits + Math.ceil(seconds * run.computeRate);
        await ctx.runMutation(internal.jobs.reconcileTerminatedCloud, {
          id: run._id,
          generation: run.generation,
          sandboxId: terminatedSandboxId,
          credits: cost,
        });
      }
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
    if (!sandboxId || !/^vercel:[A-Za-z0-9_-]{1,128}$/.test(sandboxId))
      throw new Error("Recorded sandbox termination evidence required.");
    await killSandbox(sandboxId);
    await ctx.runMutation(internal.jobs.waiveStagingFailure, a);
    return { serviceChargeWaived: true, operatorCostReconciled: false };
  },
});
