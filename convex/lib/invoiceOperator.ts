import type { QueryCtx } from "../_generated/server";
import { user, fail } from "../lib";
export async function invoiceOperator(ctx: QueryCtx) {
  const actor = await user(ctx);
  let subjects: unknown;
  try {
    subjects = JSON.parse(process.env.INVOICE_OPERATOR_SUBJECTS_JSON ?? "[]");
  } catch {
    subjects = [];
  }
  const allowed =
    Array.isArray(subjects) &&
    subjects.length <= 20 &&
    subjects.every((subject) => typeof subject === "string") &&
    subjects.includes(actor.subject);
  return { actor, allowed };
}
export async function requireInvoiceOperator(ctx: QueryCtx) {
  const result = await invoiceOperator(ctx);
  if (!result.allowed) fail("Invoice operator access required.");
  return result.actor;
}
