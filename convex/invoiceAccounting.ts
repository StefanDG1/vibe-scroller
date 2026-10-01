"use node";
import Stripe from "stripe";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { ensure } from "../packages/policy";
import { company } from "../packages/company-config";
type Handover = {
  recordType: string;
  mode: string;
  seller: typeof company.website.operator;
  workspaceId: string;
  invoice: {
    id: string;
    number: string | null;
    status: Stripe.Invoice["status"];
    issuedAt: string;
    customerId: string | undefined;
    buyerName: Stripe.Invoice["customer_name"];
    buyerEmail: Stripe.Invoice["customer_email"];
    buyerAddress: Stripe.Invoice["customer_address"];
    buyerTaxIds: Stripe.Invoice["customer_tax_ids"];
    currency: string;
    subtotalMinor: number;
    taxMinor: number;
    totalMinor: number;
    paidMinor: number;
    remainingMinor: number;
    providerPdf: Stripe.Invoice["invoice_pdf"];
    hostedInvoice: Stripe.Invoice["hosted_invoice_url"];
  };
  exportedAt: string;
};

// A private provider record for manual accountant processing, not an issued
// Romanian invoice or evidence that ANAF accepted a submission.
export const download = action({
  args: { id: v.id("invoiceTasks") },
  handler: async (ctx, args): Promise<Handover> => {
    const task = await ctx.runQuery(api.invoiceOperations.record, args);
    const mode = process.env.STRIPE_MODE === "live" ? "live" : "test";
    const key = process.env.STRIPE_SECRET_KEY;
    ensure(
      key && new RegExp(`^[sr]k_${mode}_`).test(key),
      "BILLING_UNAVAILABLE",
      "Invoice provider unavailable.",
    );
    await ctx.runMutation(internal.billing.throttle, {
      organizationId: task.organizationId,
    });
    const client = new Stripe(key, { timeout: 15000, maxNetworkRetries: 1 });
    const invoice = await client.invoices.retrieve(task.invoiceId);
    const customerId =
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id;
    const linked = customerId
      ? await ctx.runQuery(internal.billing.byCustomer, { customerId })
      : null;
    ensure(
      linked?.organizationId === task.organizationId &&
        invoice.livemode === (mode === "live"),
      "INVOICE_MISMATCH",
      "Invoice does not match the workspace and environment.",
    );
    return {
      recordType: "accountant_handover",
      mode,
      seller: company.website.operator,
      workspaceId: task.organizationId,
      invoice: {
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        issuedAt: new Date(invoice.created * 1000).toISOString(),
        customerId,
        buyerName: invoice.customer_name,
        buyerEmail: invoice.customer_email,
        buyerAddress: invoice.customer_address,
        buyerTaxIds: invoice.customer_tax_ids,
        currency: invoice.currency,
        subtotalMinor: invoice.subtotal,
        taxMinor:
          invoice.total_taxes?.reduce((sum, tax) => sum + tax.amount, 0) ?? 0,
        totalMinor: invoice.total,
        paidMinor: invoice.amount_paid,
        remainingMinor: invoice.amount_remaining,
        providerPdf: invoice.invoice_pdf,
        hostedInvoice: invoice.hosted_invoice_url,
      },
      exportedAt: new Date().toISOString(),
    };
  },
});
