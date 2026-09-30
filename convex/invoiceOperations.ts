import { paginationOptsValidator } from "convex/server";
import { query } from "./_generated/server";
import { invoiceOperator, requireInvoiceOperator } from "./lib/invoiceOperator";
export const status = query({
  args: {},
  handler: async (ctx) => ({ allowed: (await invoiceOperator(ctx)).allowed }),
});
export const queue = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireInvoiceOperator(ctx);
    const result = await ctx.db
      .query("invoiceTasks")
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...result,
      observedAt: Date.now(),
      mode: process.env.STRIPE_MODE === "live" ? "live" : "test",
    };
  },
});
