import { z } from "zod";
import { createHash } from "node:crypto";
import type { EventPrincipal } from "./credentials";
import { webhookUrl } from "./webhook";
export const eventArguments = z
  .object({
    profileId: z.string().min(1).max(100),
    sourceId: z.string().min(1).max(100),
    generation: z.number().int().nonnegative(),
    grantVersion: z.number().int().positive(),
  })
  .strict();
const delivery = z
  .object({ mode: z.literal("webhook"), url: z.string().url().max(4096) })
  .strict();
export const eventSubscribe = z
  .object({
    name: z.literal("analysis_completed"),
    arguments: eventArguments,
    delivery: delivery.extend({ secret: z.string().min(6).max(100) }).strict(),
    cursor: z.null().optional(),
    ttlMs: z.number().int().min(30000).max(86400000).nullable().optional(),
  })
  .strict();
export const eventUnsubscribe = z
  .object({
    name: z.literal("analysis_completed"),
    arguments: eventArguments,
    delivery,
  })
  .strict();
export function eventSubscriptionId(
  principal: EventPrincipal,
  callback: string,
  args: z.infer<typeof eventArguments>,
) {
  return (
    "sub_" +
    createHash("sha256")
      .update(
        JSON.stringify([
          principal.subject,
          principal.clientId,
          principal.consentId,
          webhookUrl(callback).href,
          "analysis_completed",
          args.profileId,
          args.sourceId,
          args.generation,
          args.grantVersion,
        ]),
      )
      .digest("hex")
  );
}
export const completionEvent = {
  name: "analysis_completed",
  description:
    "The exact selected source generation became ready. Contains status and a protected review link only. Does not measure usefulness, start work or grant content retrieval. Events missed outside the finite subscription are not replayed.",
  delivery: ["webhook"],
  inputSchema: z.toJSONSchema(eventArguments),
  payloadSchema: z.toJSONSchema(
    z
      .object({
        sourceId: z.string(),
        profileId: z.string(),
        status: z.literal("ready"),
        evidenceChanged: z.boolean(),
        reviewUrl: z.string().url(),
      })
      .strict(),
  ),
};
