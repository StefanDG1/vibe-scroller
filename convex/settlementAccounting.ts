"use node";
import Stripe from "stripe";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { ensure } from "../packages/policy";
import { company } from "../packages/company-config";
export const download = action({
  args: { month: v.string() },
  handler: async (ctx, a) => {
    await ctx.runMutation(api.invoiceOperations.authorizeSettlementExport, {});
    ensure(
      /^20[0-9]{2}-(0[1-9]|1[0-2])$/.test(a.month),
      "INVALID_INPUT",
      "Choose a valid accounting month.",
    );
    const [year, month] = a.month.split("-").map(Number);
    const start = Date.UTC(year, month - 1, 1) / 1000,
      end = Date.UTC(year, month, 1) / 1000;
    ensure(
      start <= Date.now() / 1000,
      "INVALID_INPUT",
      "A future month cannot be exported.",
    );
    const mode = process.env.STRIPE_MODE,
      accountId = process.env.STRIPE_ACCOUNT_ID,
      key = process.env.STRIPE_SECRET_KEY;
    ensure(
      ["test", "live"].includes(mode ?? "") &&
        accountId &&
        key &&
        new RegExp(`^[sr]k_${mode}_`).test(key),
      "BILLING_UNAVAILABLE",
      "Accounting provider unavailable.",
    );
    const client = new Stripe(key, { timeout: 15000, maxNetworkRetries: 1 });
    ensure(
      (await client.accounts.retrieve(null)).id === accountId,
      "BILLING_UNAVAILABLE",
      "Accounting account mismatch.",
    );
    const entries = [];
    let cursor: string | undefined;
    for (let page = 0; page < 10; page++) {
      const result = await client.balanceTransactions.list({
        created: { gte: start, lt: end },
        limit: 100,
        ...(cursor ? { starting_after: cursor } : {}),
      });
      entries.push(
        ...result.data.map((row) => ({
          id: row.id,
          createdAt: new Date(row.created * 1000).toISOString(),
          availableAt: new Date(row.available_on * 1000).toISOString(),
          type: row.type,
          reportingCategory: row.reporting_category,
          status: row.status,
          currency: row.currency,
          amountMinor: row.amount,
          feeMinor: row.fee,
          netMinor: row.net,
          exchangeRate: row.exchange_rate,
          sourceId:
            typeof row.source === "string"
              ? row.source
              : (row.source?.id ?? null),
          feeDetails: row.fee_details.map((fee) => ({
            amountMinor: fee.amount,
            currency: fee.currency,
            type: fee.type,
          })),
        })),
      );
      if (!result.has_more) break;
      ensure(
        page < 9 && result.data.length > 0,
        "EXPORT_TOO_LARGE",
        "Partition this period in the provider reporting dashboard; no partial export was returned.",
      );
      cursor = result.data.at(-1)!.id;
    }
    const payouts = [];
    cursor = undefined;
    for (let page = 0; page < 10; page++) {
      const result = await client.payouts.list({
        created: { gte: start, lt: end },
        limit: 100,
        ...(cursor ? { starting_after: cursor } : {}),
      });
      ensure(
        result.data.every((row) => row.livemode === (mode === "live")),
        "BILLING_UNAVAILABLE",
        "Payout environment mismatch.",
      );
      payouts.push(
        ...result.data.map((row) => ({
          id: row.id,
          createdAt: new Date(row.created * 1000).toISOString(),
          arrivalAt: new Date(row.arrival_date * 1000).toISOString(),
          currency: row.currency,
          amountMinor: row.amount,
          status: row.status,
          balanceTransactionId:
            typeof row.balance_transaction === "string"
              ? row.balance_transaction
              : (row.balance_transaction?.id ?? null),
        })),
      );
      if (!result.has_more) break;
      ensure(
        page < 9 && result.data.length > 0,
        "EXPORT_TOO_LARGE",
        "Partition this period in the provider reporting dashboard; no partial export was returned.",
      );
      cursor = result.data.at(-1)!.id;
    }
    return {
      recordType: "provider_settlement_handover",
      mode,
      accountId,
      company: company.website.operator,
      month: a.month,
      period: {
        start: new Date(start * 1000).toISOString(),
        endExclusive: new Date(end * 1000).toISOString(),
        monthClosed: end <= Date.now() / 1000,
      },
      exportedAt: new Date().toISOString(),
      entries,
      payouts,
      limitations: [
        "Provider balance movements and payouts, not a newly issued customer invoice or tax return.",
        "Fees are reported with the provider’s type. Do not infer tax classification from an unlabeled fee or missing breakdown.",
        "Reconcile with the provider’s fee documents, Managed Payments tax reports and bank statements through the accountant.",
        "Amounts use each currency’s integer minor units; no exchange-rate or VAT status is invented.",
      ],
    };
  },
});
