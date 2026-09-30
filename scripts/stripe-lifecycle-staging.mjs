import Stripe from "stripe";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
if (
  process.env.VIBE_STAGING_TEST !== "billing" ||
  !(process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_")
)
  throw Error("Explicit sandbox billing test required.");
const client = new Stripe(process.env.STRIPE_SECRET_KEY);
const account = await client.accounts.retrieve();
if (account.id !== "acct_1ULEK7BINq6evjJt")
  throw Error("Only dedicated synthetic sandbox permitted.");
const file = "outputs/stripe-lifecycle-state.json";
const state = existsSync(file)
  ? JSON.parse(readFileSync(file, "utf8"))
  : {
      accountId: account.id,
      synthetic: true,
      startedAt: new Date().toISOString(),
      clocks: [],
    };
const frozen = Math.floor(Date.UTC(2027, 0, 31, 12) / 1000);
const persist = () => writeFileSync(file, JSON.stringify(state, null, 2));
for (const interval of ["weekly", "monthly", "annual"]) {
  let run = state.clocks.find((c) => c.interval === interval);
  if (!run) {
    const clock = await client.testHelpers.testClocks.create({
      name: `Synthetic VibeScroller ${interval}`,
      frozen_time: frozen,
    });
    run = { interval, clockId: clock.id, initial: [], frozenTime: frozen };
    state.clocks.push(run);
    persist();
  }
  for (const tier of ["starter", "pro"]) {
    if (run.initial.some((x) => x.tier === tier)) continue;
    const customer = await client.customers.create(
      {
        name: `Synthetic VibeScroller ${tier} ${interval}`,
        email: "billing-staging@example.test",
        test_clock: run.clockId,
        payment_method: "pm_card_visa",
        invoice_settings: { default_payment_method: "pm_card_visa" },
        metadata: { product: "vibescroller", synthetic: "true" },
      },
      { idempotencyKey: `vibe:clock:customer:${run.clockId}:${tier}` },
    );
    const sub = await client.subscriptions.create(
      {
        customer: customer.id,
        items: [
          {
            price:
              process.env[
                `STRIPE_${tier.toUpperCase()}_${interval.toUpperCase()}_PRICE_ID`
              ],
          },
        ],
        metadata: {
          product: "vibescroller",
          synthetic: "true",
          tier,
          interval,
        },
        expand: ["latest_invoice"],
      },
      { idempotencyKey: `vibe:clock:sub:${run.clockId}:${tier}` },
    );
    if (sub.status !== "active" || sub.latest_invoice.status !== "paid")
      throw Error("Synthetic invoice did not pay");
    run.initial.push({
      tier,
      customerId: customer.id,
      subscriptionId: sub.id,
      invoiceId: sub.latest_invoice.id,
      paid: true,
      amount: sub.latest_invoice.amount_paid,
      start: sub.items.data[0].current_period_start,
      end: sub.items.data[0].current_period_end,
    });
    persist();
  }
  if (!run.advancedTo) {
    const target =
      interval === "weekly"
        ? frozen + 7 * 86400 + 60
        : Math.floor(Date.UTC(2027, 1, 28, 12, 1) / 1000);
    await client.testHelpers.testClocks.advance(run.clockId, {
      frozen_time: target,
    });
    run.advancedTo = target;
    persist();
  }
}
console.log(
  JSON.stringify({
    accountId: account.id,
    sixPaidSandboxPrices: state.clocks.reduce(
      (n, c) => n + c.initial.length,
      0,
    ),
    clocksAdvancing: true,
    evidence: file,
  }),
);
