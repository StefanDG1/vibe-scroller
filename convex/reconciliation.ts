"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import Stripe from "stripe";
import { ensure, monthlyAnchor } from "../packages/policy";
export const stripeEvent = internalAction({
  args: { body: v.string(), signature: v.string() },
  handler: async (ctx, a) => {
    const key = process.env.STRIPE_SECRET_KEY,
      secret = process.env.STRIPE_V1_WEBHOOK_SECRET,
      account = process.env.STRIPE_ACCOUNT_ID;
    ensure(
      key && secret && account,
      "SETUP_REQUIRED",
      "Configure the VibeScroller webhook environment and account.",
    );
    const client = new Stripe(key);
    let event: Stripe.Event;
    try {
      event = client.webhooks.constructEvent(a.body, a.signature, secret);
    } catch {
      return { status: 400 };
    }
    if (
      event.livemode !== (process.env.STRIPE_MODE === "live") ||
      (event.account && event.account !== account)
    )
      return { status: 400 };
    const own = await client.accounts.retrieve(account);
    if (own.id !== account) return { status: 400 };
    const object = event.data.object as any;
    if (
      event.type === "checkout.session.completed" &&
      object.mode === "payment"
    ) {
      const session = await client.checkout.sessions.retrieve(object.id, {
        expand: ["line_items"],
      });
      if (
        session.payment_status === "paid" &&
        session.metadata?.product === "vibescroller"
      ) {
        const credits = Number(session.metadata.credits),
          line = session.line_items?.data[0];
        const linked = await ctx.runQuery(internal.billing.byCustomer, {
          customerId:
            typeof session.customer === "string" ? session.customer : "",
        });
        if (
          linked?.organizationId === session.metadata.organizationId &&
          [200, 550].includes(credits) &&
          line?.price?.id === process.env[`STRIPE_TOPUP_${credits}_PRICE_ID`]
        )
          await ctx.runMutation(internal.commerce.grantTopup, {
            organizationId: session.metadata.organizationId as any,
            paymentId: session.payment_intent as string,
            credits,
          });
      }
    }
    const customer =
      typeof object.customer === "string"
        ? object.customer
        : object.customer?.id;
    if (customer)
      await ctx.runAction(internal.reconciliation.customer, {
        customerId: customer,
      });
    await ctx.runMutation(internal.privacy.receipt, {
      provider: "stripe",
      key: event.id,
    });
    return { status: 200 };
  },
});
export const customer = internalAction({
  args: { customerId: v.string() },
  handler: async (ctx, a) => {
    if (!process.env.STRIPE_SECRET_KEY) return;
    const client = new Stripe(process.env.STRIPE_SECRET_KEY);
    const reserved = await ctx.runMutation(internal.billing.reserveRefresh, a);
    if (!reserved) return;
    const all = await client.subscriptions.list({
      customer: a.customerId,
      status: "all",
      limit: 100,
      expand: ["data.latest_invoice"],
    });
    const sub = all.data
      .filter((s) => s.metadata.product === "vibescroller")
      .sort((a, b) => b.created - a.created)[0];
    const end = sub
      ? Math.max(...sub.items.data.map((i) => i.current_period_end)) * 1000
      : 0;
    await ctx.runMutation(internal.billing.apply, {
      customerId: a.customerId,
      subscriptionId: sub?.id,
      status: sub?.status ?? "free",
      periodEnd: end,
      revision: reserved.revision,
    });
    if (!sub || sub.status !== "active") return;
    const invoice = sub.latest_invoice as Stripe.Invoice;
    if (!invoice || invoice.status !== "paid") return;
    const tier = sub.metadata.tier,
      interval = sub.metadata.interval;
    if (
      !["starter", "pro"].includes(tier) ||
      !["weekly", "monthly", "annual"].includes(interval)
    )
      return;
    const price =
      process.env[
        `STRIPE_${tier.toUpperCase()}_${interval.toUpperCase()}_PRICE_ID`
      ];
    if (!sub.items.data.some((i) => i.price.id === price)) return;
    const item = sub.items.data[0];
    let start = item.current_period_start * 1000,
      periodEnd = item.current_period_end * 1000;
    if (interval === "annual") {
      const base = start,
        now = Date.now();
      let n = 0;
      while (n < 12 && monthlyAnchor(base, n + 1) <= now) n++;
      start = monthlyAnchor(base, n);
      periodEnd = Math.min(end, monthlyAnchor(base, n + 1));
    }
    if (periodEnd > Date.now())
      await ctx.runMutation(internal.commerce.grantPeriod, {
        organizationId: reserved.organizationId,
        subscription: sub.id,
        tier: tier as "starter" | "pro",
        interval: interval === "weekly" ? "weekly" : "monthly",
        start,
        end: periodEnd,
        verifiedPayment: true,
      });
    if (process.env.RO_INVOICE_SCOPE_VERIFIED === "true")
      await ctx.runMutation(internal.privacy.invoiceTask, {
        organizationId: reserved.organizationId,
        invoiceId: invoice.id,
        issuedAt: invoice.created * 1000,
      });
  },
});
export const allBilling = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!process.env.STRIPE_SECRET_KEY) return;
    const list = await ctx.runQuery(internal.billing.customers, {
      cursor: null,
    });
    for (const row of list.page)
      await ctx.runAction(internal.reconciliation.customer, {
        customerId: row.customerId,
      });
    let cursor = list.isDone ? null : list.continueCursor;
    while (cursor) {
      const next = await ctx.runQuery(internal.billing.customers, { cursor });
      for (const row of next.page)
        await ctx.runAction(internal.reconciliation.customer, {
          customerId: row.customerId,
        });
      cursor = next.isDone ? null : next.continueCursor;
    }
  },
});
