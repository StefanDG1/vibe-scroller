import { WorkflowManager } from "@convex-dev/workflow";
import { components, internal } from "./_generated/api";
import { v } from "convex/values";
// Paid/external effects are deliberately not retried. Existing generation fences,
// reservations and fingerprinted stage reuse remain authoritative.
export const workflow = new WorkflowManager(components.workflow, {
  workpoolOptions: { maxParallelism: 2, retryActionsByDefault: false },
});
export const sourceAnalysis = workflow
  .define({
    args: { id: v.id("sources"), generation: v.number(), media: v.boolean() },
    returns: v.null(),
  })
  .handler(async (step, a): Promise<null> => {
    try {
      await step.runAction(
        a.media ? internal.media.analyze : internal.integrations.analyze,
        { id: a.id, generation: a.generation },
        { retry: false, name: "bounded-source-analysis-v1" },
      );
    } catch {
      await step.runMutation(
        internal.product.commitAnalysis,
        {
          id: a.id,
          generation: a.generation,
          credits: 0,
          retainReservation: true,
          error:
            "The analysis worker stopped before confirming completion. Its usage reservation remains held for reconciliation. Review the provider before an explicit retry.",
        },
        { name: "source-worker-reconciliation-v1" },
      );
    }
    return null;
  });
export const coding = workflow
  .define({
    args: { id: v.id("runs"), generation: v.number() },
    returns: v.null(),
  })
  .handler(async (step, a): Promise<null> => {
    try {
      await step.runAction(
        internal.cloud.execute,
        { id: a.id },
        { retry: false, name: "bounded-cloud-coding-v1" },
      );
    } catch {
      await step.runMutation(
        internal.jobs.failCloud,
        {
          ...a,
          credits: 0,
          error:
            "The coding worker stopped without a confirmed result. Usage remains reserved for operator reconciliation; no automatic rerun is authorized.",
        },
        { name: "coding-worker-reconciliation-v1" },
      );
    }
    return null;
  });
