import Stripe from "stripe";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
if (
  process.env.VIBE_STAGING_TEST !== "billing" ||
  !process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
)
  throw Error("Explicit dedicated sandbox test required.");
const client = new Stripe(process.env.STRIPE_SECRET_KEY);
const file = "outputs/stripe-invoice-refund-state.json";
const state = existsSync(file)
  ? JSON.parse(readFileSync(file, "utf8"))
  : { synthetic: true, payments: [] };
const save = () => writeFileSync(file, JSON.stringify(state, null, 2));
const request = (stage) => ({
  idempotencyKey: `vibe:synthetic:multi-invoice:v1:${stage}`,
});
try {
  const account = await client.accounts.retrieve();
  if (account.id !== "acct_1ULEK7BINq6evjJt")
    throw Error("Incorrect sandbox account.");
  state.accountId = account.id;
  if (!state.customerId) {
    const customer = await client.customers.create(
      {
        name: "Synthetic VibeScroller multiple-payment invoice",
        metadata: { product: "vibescroller", synthetic: "true" },
      },
      request("customer"),
    );
    state.customerId = customer.id;
    save();
  }
  if (!state.emailConfigured) {
    await client.customers.update(state.customerId, {
      email: "billing-staging@example.test",
    });
    state.emailConfigured = true;
    save();
  }
  if (state.invoiceId && !state.lineId) {
    const prior = await client.invoices.retrieve(state.invoiceId);
    if (prior.currency !== "eur") {
      if (
        prior.status !== "draft" ||
        prior.amount_due !== 0 ||
        prior.lines.data.length ||
        prior.metadata.synthetic !== "true"
      )
        throw Error("Cannot replace a nonempty synthetic invoice.");
      await client.invoices.del(prior.id);
      state.discardedEmptyDraftId = prior.id;
      delete state.invoiceId;
      save();
    }
  }
  if (!state.invoiceId) {
    const invoice = await client.invoices.create(
      {
        customer: state.customerId,
        currency: "eur",
        collection_method: "send_invoice",
        days_until_due: 30,
        auto_advance: false,
        metadata: { product: "vibescroller", synthetic: "true" },
      },
      request("invoice-eur-email-ready"),
    );
    state.invoiceId = invoice.id;
    save();
  }
  if (!state.lineId) {
    const line = await client.invoiceItems.create(
      {
        customer: state.customerId,
        invoice: state.invoiceId,
        amount: 1000,
        currency: "eur",
        description: "Owned synthetic staging verification only",
      },
      request(`line-${state.invoiceId}`),
    );
    state.lineId = line.id;
    save();
  }
  let invoice = await client.invoices.retrieve(state.invoiceId);
  if (invoice.status === "draft")
    await client.invoices.finalizeInvoice(
      state.invoiceId,
      { auto_advance: false },
      request(`finalize-${state.invoiceId}`),
    );
  for (let index = 0; index < 2; index++) {
    let payment = state.payments[index];
    if (!payment) {
      const pi = await client.paymentIntents.create(
        {
          amount: 500,
          currency: "eur",
          customer: state.customerId,
          payment_method: "pm_card_visa",
          confirm: true,
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: "never",
          },
          metadata: { product: "vibescroller", synthetic: "true" },
        },
        request(`payment-${index}`),
      );
      if (pi.livemode || pi.status !== "succeeded")
        throw Error("Synthetic payment did not succeed.");
      payment = {
        id: pi.id,
        amount: pi.amount,
        chargeId:
          typeof pi.latest_charge === "string"
            ? pi.latest_charge
            : pi.latest_charge?.id,
      };
      state.payments[index] = payment;
      save();
    }
    if (!payment.attached) {
      await client.invoices.attachPayment(
        state.invoiceId,
        { payment_intent: payment.id },
        request(`attach-${state.invoiceId}-${index}`),
      );
      payment.attached = true;
      save();
    }
  }
  invoice = await client.invoices.retrieve(state.invoiceId);
  const links = await client.invoicePayments.list({
    invoice: state.invoiceId,
    status: "paid",
    limit: 10,
  });
  if (
    invoice.livemode ||
    invoice.status !== "paid" ||
    invoice.amount_paid !== 1000 ||
    links.has_more ||
    links.data.filter((p) => p.amount_paid === 500).length !== 2
  )
    throw Error(
      "Paid invoice allocation differs from the two synthetic payments.",
    );
  for (let index = 0; index < 2; index++) {
    const payment = state.payments[index];
    if (!payment.refundId) {
      const refund = await client.refunds.create(
        { payment_intent: payment.id, amount: 250 },
        request(`refund-${index}`),
      );
      if (refund.status !== "succeeded")
        throw Error("Synthetic partial refund failed.");
      payment.refundId = refund.id;
      save();
    }
    const charge = await client.charges.retrieve(payment.chargeId);
    if (charge.amount !== 500 || charge.amount_refunded !== 250)
      throw Error("Cumulative synthetic refund differs from expectation.");
    const allocation = await client.invoicePayments.list({
      payment: { type: "payment_intent", payment_intent: payment.id },
      status: "paid",
      limit: 2,
    });
    if (
      allocation.has_more ||
      allocation.data.length !== 1 ||
      allocation.data[0].amount_paid !== charge.amount
    )
      throw Error("Payment-specific invoice mapping is ambiguous.");
  }
  const evidence = {
    observedAt: new Date().toISOString(),
    environment: "dedicated Stripe sandbox",
    synthetic: true,
    accountId: account.id,
    invoiceId: invoice.id,
    invoiceStatus: invoice.status,
    invoicePaid: invoice.amount_paid,
    currency: invoice.currency,
    payments: state.payments,
    aggregateRefunded: 500,
    invoiceRefundFraction: "500/1000",
    providerChecksPassed: true,
    limitations: [
      "Provider invoice allocation and cumulative refunds only",
      "Customer has no application billing link; application credit projection is verified separately in unit tests",
      "No live charges, emails or production tax validation",
    ],
  };
  writeFileSync(
    "infra/stripe-multiple-payment-evidence.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      providerChecksPassed: true,
      invoicePaid: 1000,
      aggregateRefunded: 500,
      applicationCreditProjectionTestedLive: false,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      providerChecksPassed: false,
      category: error?.type ?? error?.name ?? "Error",
      code: error?.code ?? null,
      message: String(error?.message ?? "Provider request failed")
        .replace(/\b(?:sk|rk|pk)_(?:test|live)_[A-Za-z0-9_]+/g, "[redacted]")
        .replace(
          /\b(?:pi|seti)_[A-Za-z0-9_]+_secret_[A-Za-z0-9_]+/g,
          "[redacted]",
        )
        .slice(0, 400),
    }),
  );
  process.exitCode = 1;
}
