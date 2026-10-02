import { expect, it, vi } from "vitest";
import type Stripe from "stripe";
import {
  provisionCatalogue,
  validateProvisioningEnvironment,
} from "../packages/providers/stripe-catalogue";
import pricing from "../contracts/pricing.json";

function syntheticClient(account = "acct_syntheticVibe") {
  const products: any[] = [];
  const prices: any[] = [];
  const client = {
    accounts: {
      retrieve: vi.fn(async () => ({
        id: account,
        country: "RO",
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
        requirements: { currently_due: ["company.name"] },
      })),
    },
    products: {
      list: vi.fn(() => ({ autoPagingToArray: async () => products })),
      create: vi.fn(async (args: any) => {
        const result = {
          ...args,
          id: `prod_synthetic${products.length}`,
          active: true,
          livemode: false,
        };
        products.push(result);
        return result;
      }),
    },
    prices: {
      list: vi.fn(async (args: any) => ({
        data: prices
          .filter((p) => args.lookup_keys.includes(p.lookup_key))
          .map((p) => ({
            ...p,
            product: products.find((v) => v.id === p.product),
          })),
        has_more: false,
      })),
      create: vi.fn(async (args: any) => {
        const result = {
          ...args,
          id: `price_synthetic${prices.length}`,
          active: true,
          livemode: false,
          recurring: args.recurring
            ? { ...args.recurring, interval_count: 1 }
            : null,
        };
        prices.push(result);
        return result;
      }),
    },
  };
  return { client, stripe: client as unknown as Stripe, products, prices };
}

it("rejects missing account identity, wrong mode and unauthorized live provisioning without exposing keys", () => {
  expect(() =>
    validateProvisioningEnvironment(
      "rk_test_synthetic",
      "test",
      undefined,
      false,
    ),
  ).toThrow("expected Stripe account");
  expect(() =>
    validateProvisioningEnvironment(
      "rk_live_synthetic",
      "test",
      "acct_vibe",
      true,
    ),
  ).toThrow("must match");
  expect(() =>
    validateProvisioningEnvironment(
      "rk_live_synthetic",
      "live",
      "acct_vibe",
      false,
    ),
  ).toThrow("--live");
  expect(() =>
    validateProvisioningEnvironment(
      "rk_live_synthetic",
      "live",
      "acct_vibe",
      true,
    ),
  ).not.toThrow();
});

it("rejects another credential account before creating any catalogue objects", async () => {
  const s = syntheticClient("acct_otherBusiness");
  await expect(
    provisionCatalogue(s.stripe, pricing, "acct_syntheticVibe", "test"),
  ).rejects.toThrow("does not match");
  expect(s.client.products.list).not.toHaveBeenCalled();
  expect(s.client.products.create).not.toHaveBeenCalled();
  expect(s.client.prices.create).not.toHaveBeenCalled();
  expect(s.client.accounts.retrieve).toHaveBeenCalledWith(null);
});

it("creates separate tier products and eight EUR prices, preserves other products and safely repeats", async () => {
  const s = syntheticClient();
  s.products.push({
    id: "prod_otherBusiness",
    metadata: { product: "education" },
    name: "Untouched upstream",
  });
  const first = await provisionCatalogue(
    s.stripe,
    pricing,
    "acct_syntheticVibe",
    "test",
  );
  expect(s.client.products.create).toHaveBeenCalledTimes(3);
  expect(s.client.prices.create).toHaveBeenCalledTimes(8);
  const starter = s.products.find((p) => p.metadata.tier === "starter");
  const pro = s.products.find((p) => p.metadata.tier === "pro");
  expect(starter.id).not.toBe(pro.id);
  expect(
    s.prices.filter((p) => p.product === starter.id).map((p) => p.unit_amount),
  ).toEqual([599, 1900, 19000]);
  expect(
    s.prices.filter((p) => p.product === pro.id).map((p) => p.unit_amount),
  ).toEqual([1199, 3900, 39000]);
  expect(first.environment.LIVE_CHECKOUT_ENABLED).toBe("false");
  expect(first.readiness).toEqual({
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
    currentlyDue: 1,
  });
  const second = await provisionCatalogue(
    s.stripe,
    pricing,
    "acct_syntheticVibe",
    "test",
  );
  expect(second).toEqual(first);
  expect(s.client.products.create).toHaveBeenCalledTimes(3);
  expect(s.client.prices.create).toHaveBeenCalledTimes(8);
  expect(s.products[0].name).toBe("Untouched upstream");
});

it.each(["currency", "unit_amount", "product", "livemode"])(
  "rejects a conflicting %s in any existing lookup before creating additional objects",
  async (field) => {
    const s = syntheticClient();
    await provisionCatalogue(s.stripe, pricing, "acct_syntheticVibe", "test");
    const last = s.prices.at(-1);
    if (field === "product")
      s.products.find((p) => p.id === last.product).metadata.product = "other";
    else
      last[field] =
        field === "currency" ? "ron" : field === "livemode" ? true : 1;
    s.client.products.create.mockClear();
    s.client.prices.create.mockClear();
    await expect(
      provisionCatalogue(s.stripe, pricing, "acct_syntheticVibe", "test"),
    ).rejects.toThrow("conflicts");
    expect(s.client.products.create).not.toHaveBeenCalled();
    expect(s.client.prices.create).not.toHaveBeenCalled();
  },
);
