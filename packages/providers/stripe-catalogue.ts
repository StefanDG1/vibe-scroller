import type Stripe from "stripe";

export type CataloguePricing = {
  tiers: Record<string, Record<string, number>>;
  topups: { credits: number; price_eur: number }[];
};
const version = "1.1.0";
const metadata = { product: "vibescroller", catalogue: version };
// Initial consumer software subscription. This is a product classification,
// not a declaration of the seller's VAT registration or Stripe approval.
export const softwareTaxCode = "txcd_10103000";

export function validateProvisioningEnvironment(
  key: string | undefined,
  mode: string,
  accountId: string | undefined,
  liveAuthorized: boolean,
) {
  if (
    !["test", "live"].includes(mode) ||
    !key ||
    !new RegExp(`^[sr]k_${mode}_`).test(key)
  )
    throw new Error("Stripe key and provisioning mode must match.");
  if (!accountId || !/^acct_[A-Za-z0-9]+$/.test(accountId))
    throw new Error(
      "Supply the expected Stripe account ID before provisioning.",
    );
  if (mode === "live" && !liveAuthorized)
    throw new Error(
      "Live provisioning requires explicit --live authorization.",
    );
}

export async function provisionCatalogue(
  client: Stripe,
  pricing: CataloguePricing,
  accountId: string,
  mode: "test" | "live",
) {
  // Retrieve the credential's own account before any catalogue mutation.
  const account = await client.accounts.retrieve(null);
  if (account.id !== accountId || account.country !== "RO")
    throw new Error(
      "Stripe account does not match the intended Romanian seller.",
    );
  const products = await client.products
    .list({ limit: 100 })
    .autoPagingToArray({ limit: 1000 });
  const entries = Object.entries(pricing.tiers).flatMap(([tier, prices]) =>
    (["weekly", "monthly", "annual"] as const).map((interval) => ({
      tier,
      interval,
      amount: Math.round(prices[`${interval}_price_eur`] * 100),
      lookup: `vibescroller_1_1_0_${tier}_${interval}`,
      env: `STRIPE_${tier.toUpperCase()}_${interval.toUpperCase()}_PRICE_ID`,
    })),
  );
  const packs = pricing.topups.map((pack) => ({
    tier: "topups",
    interval: undefined,
    amount: Math.round(pack.price_eur * 100),
    lookup: `vibescroller_1_1_0_topup_${pack.credits}`,
    env: `STRIPE_TOPUP_${pack.credits}_PRICE_ID`,
    credits: String(pack.credits),
  }));
  const items = [...entries, ...packs];
  const existing = new Map<string, Stripe.Price>();
  // Preflight every lookup before creating anything. Never adopt another product's price.
  for (const item of items) {
    if (!Number.isSafeInteger(item.amount) || item.amount <= 0)
      throw new Error("Catalogue contains an invalid amount.");
    const found = await client.prices.list({
      lookup_keys: [item.lookup],
      limit: 2,
      expand: ["data.product"],
    });
    if (found.data.length > 1 || found.has_more)
      throw new Error("Catalogue lookup is ambiguous.");
    const price = found.data[0];
    if (!price) continue;
    const product = price.product as Stripe.Product;
    const recurring = item.interval
      ? item.interval === "weekly"
        ? "week"
        : item.interval === "monthly"
          ? "month"
          : "year"
      : undefined;
    if (
      !price.active ||
      price.livemode !== (mode === "live") ||
      price.currency !== "eur" ||
      price.tax_behavior !== "inclusive" ||
      price.unit_amount !== item.amount ||
      price.recurring?.interval !== recurring ||
      (recurring && price.recurring?.interval_count !== 1) ||
      price.metadata.product !== metadata.product ||
      price.metadata.catalogue !== version ||
      ("credits" in item
        ? price.metadata.credits !== item.credits
        : price.metadata.tier !== item.tier ||
          price.metadata.interval !== item.interval) ||
      product.deleted ||
      !product.active ||
      product.metadata?.product !== metadata.product ||
      product.metadata?.catalogue !== version ||
      product.metadata?.tier !== item.tier ||
      (typeof product.tax_code === "string"
        ? product.tax_code
        : product.tax_code?.id) !== softwareTaxCode
    )
      throw new Error(
        "Existing Stripe price conflicts with the approved catalogue.",
      );
    existing.set(item.lookup, price);
  }
  const ownedProducts = new Map<string, Stripe.Product>();
  for (const tier of [...Object.keys(pricing.tiers), "topups"]) {
    const matches = products.filter(
      (p) =>
        p.metadata.product === metadata.product &&
        p.metadata.catalogue === version &&
        p.metadata.tier === tier,
    );
    if (
      matches.length > 1 ||
      matches.some(
        (p) =>
          !p.active ||
          (typeof p.tax_code === "string" ? p.tax_code : p.tax_code?.id) !==
            softwareTaxCode,
      )
    )
      throw new Error("Catalogue product is ambiguous or archived.");
    if (matches[0]) ownedProducts.set(tier, matches[0]);
  }
  const environment: Record<string, string> = {
    STRIPE_ACCOUNT_ID: account.id,
    STRIPE_MODE: mode,
    LIVE_CHECKOUT_ENABLED: "false",
  };
  for (const item of items) {
    let product = ownedProducts.get(item.tier);
    if (!product) {
      product = await client.products.create(
        {
          name:
            item.tier === "topups"
              ? "VibeScroller processing credits"
              : `VibeScroller ${item.tier === "starter" ? "Starter" : "Pro"}`,
          metadata: { ...metadata, tier: item.tier },
          tax_code: softwareTaxCode,
        },
        { idempotencyKey: `vibescroller:${version}:product:${item.tier}` },
      );
      ownedProducts.set(item.tier, product);
    }
    const prior = existing.get(item.lookup);
    if (prior && (prior.product as Stripe.Product).id !== product.id)
      throw new Error("Price is attached to a different catalogue product.");
    const price =
      prior ??
      (await client.prices.create(
        {
          product: product.id,
          currency: "eur",
          unit_amount: item.amount,
          tax_behavior: "inclusive",
          lookup_key: item.lookup,
          recurring: item.interval
            ? {
                interval:
                  item.interval === "weekly"
                    ? "week"
                    : item.interval === "monthly"
                      ? "month"
                      : "year",
              }
            : undefined,
          metadata: {
            ...metadata,
            ...("credits" in item
              ? { credits: item.credits }
              : { tier: item.tier, interval: item.interval! }),
          },
        },
        { idempotencyKey: item.lookup },
      ));
    environment[item.env] = price.id;
  }
  return {
    environment,
    readiness: {
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      currentlyDue: account.requirements?.currently_due?.length ?? 0,
    },
  };
}
