"use node";
import Stripe from "stripe";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { pricing, ensure, taxTreatment } from "../packages/policy";
function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  ensure(
    key && new RegExp(`^[sr]k_${process.env.STRIPE_MODE ?? "test"}_`).test(key),
    "BILLING_UNAVAILABLE",
    "Stripe environment and key must match.",
  );
  return new Stripe(key);
}
const priceId = (tier: string, interval: string) =>
  process.env[
    `STRIPE_${tier.toUpperCase()}_${interval.toUpperCase()}_PRICE_ID`
  ];
export const checkout = action({
  args: {
    organizationId: v.id("organizations"),
    tier: v.union(v.literal("starter"), v.literal("pro")),
    interval: v.union(
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("annual"),
    ),
    country: v.string(),
    termsAccepted: v.boolean(),
    immediateService: v.boolean(),
  },
  handler: async (ctx, a): Promise<string> => {
    const auth = await ctx.runQuery(api.billing.authorize, {
      organizationId: a.organizationId,
    });
    ensure(
      a.termsAccepted,
      "TERMS_REQUIRED",
      "Accept the displayed service terms before checkout.",
    );
    const live = process.env.STRIPE_MODE === "live";
    const tax = await ctx.runQuery(internal.commerce.taxConfig, {});
    ensure(
      !live || process.env.LIVE_CHECKOUT_ENABLED === "true",
      "RELEASE_GATE",
      "Live checkout is disabled.",
    );
    const treatment = taxTreatment(tax, a.country, false, false, live);
    const price = priceId(a.tier, a.interval);
    ensure(
      price,
      "BILLING_UNAVAILABLE",
      "This product price is not configured.",
    );
    const client = stripe();
    const actualPrice = await client.prices.retrieve(price);
    const expected = Math.round(
      pricing.tiers[a.tier][`${a.interval}_price_eur`] * 100,
    );
    ensure(
      actualPrice.currency === "eur" &&
        actualPrice.active &&
        actualPrice.recurring?.interval ===
          (a.interval === "weekly"
            ? "week"
            : a.interval === "annual"
              ? "year"
              : "month") &&
        actualPrice.recurring.interval_count === 1 &&
        actualPrice.unit_amount === expected &&
        actualPrice.tax_behavior === "inclusive" &&
        actualPrice.metadata.product === "vibescroller",
      "CATALOGUE_MISMATCH",
      "The Stripe price does not match the approved catalogue.",
    );
    let customer = auth.billing?.customerId;
    if (!customer) {
      const created = await client.customers.create(
        {
          email: auth.email,
          name: auth.name,
          metadata: {
            companynerveOrganizationId: a.organizationId,
            product: "vibescroller",
          },
        },
        { idempotencyKey: `vibescroller:customer:${a.organizationId}` },
      );
      customer = await ctx.runMutation(internal.billing.attach, {
        organizationId: a.organizationId,
        customerId: created.id,
      });
    }
    const subs = await client.subscriptions.list({
      customer,
      status: "all",
      limit: 100,
    });
    ensure(
      !subs.data.some(
        (s) => !["canceled", "incomplete_expired"].includes(s.status),
      ),
      "SUBSCRIPTION_EXISTS",
      "Manage your current subscription in the billing portal.",
    );
    await ctx.runMutation(internal.commerce.recordAcceptance, {
      organizationId: a.organizationId,
      termsVersion: "v1-draft",
      immediateService: a.immediateService,
    });
    const reserved = await ctx.runMutation(internal.billing.reserveCheckout, {
      organizationId: a.organizationId,
    });
    const origin = new URL(process.env.APP_URL!).origin;
    const session = await client.checkout.sessions.create(
      {
        customer,
        mode: "subscription",
        line_items: [{ price, quantity: 1 }],
        billing_address_collection: "required",
        automatic_tax: {
          enabled: ["domestic_vat", "destination_vat"].includes(treatment),
        },
        customer_update: { address: "auto" },
        consent_collection: { terms_of_service: "required" },
        metadata: {
          product: "vibescroller",
          tier: a.tier,
          interval: a.interval,
          termsVersion: "v1-draft",
          taxTreatment: treatment,
        },
        subscription_data: {
          metadata: {
            product: "vibescroller",
            tier: a.tier,
            interval: a.interval,
            organizationId: a.organizationId,
          },
        },
        expires_at: Math.floor(reserved.expires / 1000),
        success_url: `${origin}/app/${a.organizationId}/billing?checkout=complete`,
        cancel_url: `${origin}/app/${a.organizationId}/billing`,
      },
      { idempotencyKey: reserved.key },
    );
    ensure(session.url, "BILLING_UNAVAILABLE", "Checkout URL unavailable.");
    return session.url;
  },
});
export const cancel = action({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, a) => {
    const auth = await ctx.runQuery(api.billing.authorize, a);
    ensure(
      auth.billing?.subscriptionId,
      "NOT_FOUND",
      "No subscription to cancel.",
    );
    await stripe().subscriptions.update(auth.billing.subscriptionId, {
      cancel_at_period_end: true,
    });
    await ctx.runAction(internal.reconciliation.customer, {
      customerId: auth.billing!.customerId,
    });
    return { cancelAtPeriodEnd: true };
  },
});
export const topup = action({
  args: {
    organizationId: v.id("organizations"),
    pack: v.union(v.literal("200"), v.literal("550")),
  },
  handler: async (ctx, a): Promise<string> => {
    ensure(
      process.env.STRIPE_MODE !== "live",
      "RELEASE_GATE",
      "Live top-ups remain disabled until the matching release approval.",
    );
    const auth = await ctx.runQuery(api.billing.authorize, {
      organizationId: a.organizationId,
    });
    ensure(
      auth.billing?.customerId,
      "BILLING_REQUIRED",
      "Create a billing account first.",
    );
    const price = process.env[`STRIPE_TOPUP_${a.pack}_PRICE_ID`];
    ensure(price, "BILLING_UNAVAILABLE", "Top-up price unavailable.");
    const p = await stripe().prices.retrieve(price),
      expected = a.pack === "200" ? 1000 : 2500;
    ensure(
      p.unit_amount === expected &&
        p.currency === "eur" &&
        p.metadata.product === "vibescroller" &&
        p.tax_behavior === "inclusive",
      "CATALOGUE_MISMATCH",
      "Top-up catalogue mismatch.",
    );
    const origin = new URL(process.env.APP_URL!).origin;
    const session = await stripe().checkout.sessions.create({
      customer: auth.billing.customerId,
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      metadata: {
        product: "vibescroller",
        credits: a.pack,
        organizationId: a.organizationId,
      },
      success_url: `${origin}/app/${a.organizationId}/usage`,
      cancel_url: `${origin}/app/${a.organizationId}/usage`,
    });
    return session.url!;
  },
});
export const requestRefund = action({
  args: { organizationId: v.id("organizations"), invoiceId: v.string() },
  handler: async (ctx, a) => {
    const auth = await ctx.runQuery(api.billing.authorize, {
      organizationId: a.organizationId,
    });
    const invoice = await stripe().invoices.retrieve(a.invoiceId);
    ensure(
      invoice.customer === auth.billing?.customerId,
      "FORBIDDEN",
      "Invoice unavailable.",
    );
    await ctx.runMutation(internal.commerce.refundRequest, {
      organizationId: a.organizationId,
      invoiceId: invoice.id,
      created: invoice.created * 1000,
    });
    return {
      status: "requested",
      message:
        "Refund request recorded for invoice-aware review, including eligible weekly renewals. Statutory rights remain unaffected.",
    };
  },
});
