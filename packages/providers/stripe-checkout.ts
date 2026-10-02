import type Stripe from "stripe";
import { ensure, taxTreatment, type TaxConfig } from "../policy";
import { managedMarketPolicy, managedTaxCountries } from "./managed-markets";

export function checkoutPaymentRoute(a: {
  route: string | undefined;
  managedVerified: boolean;
  managedMarket?: string;
  managedMarketVerified?: boolean;
  live: boolean;
  country?: string;
  tax: TaxConfig;
}): {
  treatment: string;
  billingCountry: string | null;
  marketPolicy: string;
  options: Pick<
    Stripe.Checkout.SessionCreateParams,
    | "managed_payments"
    | "automatic_tax"
    | "customer_update"
    | "adaptive_pricing"
  >;
} {
  ensure(
    a.route === undefined ||
      a.route === "direct" ||
      a.route === "managed_payments",
    "BILLING_UNAVAILABLE",
    "Unknown billing route. Checkout cannot continue.",
  );
  if (a.route === "managed_payments") {
    ensure(
      a.managedMarket === undefined ||
        a.managedMarket === "configured_countries" ||
        a.managedMarket === "provider_supported" ||
        a.managedMarket === "tax_covered",
      "BILLING_UNAVAILABLE",
      "Unknown Managed Payments market policy. Checkout cannot continue.",
    );
    ensure(
      !a.live || a.managedVerified,
      "RELEASE_GATE",
      "Managed Payments requires verified account and product eligibility.",
    );
    ensure(
      a.managedMarket !== "provider_supported" || !a.live,
      "RELEASE_GATE",
      "Live Managed Payments requires the verified tax-covered market policy.",
    );
    ensure(
      a.managedMarket !== "tax_covered" || a.managedMarketVerified === true,
      "RELEASE_GATE",
      "Managed Payments country enforcement has not been verified.",
    );
    ensure(
      a.managedMarket !== "tax_covered" ||
        a.country === undefined ||
        managedTaxCountries.includes(a.country),
      "COUNTRY_DISABLED",
      "Consumer purchases are unavailable in this country.",
    );
    ensure(
      a.managedMarket === "provider_supported" ||
        a.managedMarket === "tax_covered" ||
        (!!a.country && a.tax.countries.includes(a.country)),
      "COUNTRY_DISABLED",
      "Consumer purchases are unavailable in this country.",
    );
    return {
      treatment: "stripe_managed_payments",
      marketPolicy:
        a.managedMarket === "tax_covered"
          ? managedMarketPolicy
          : (a.managedMarket ?? "configured_countries"),
      billingCountry: ["provider_supported", "tax_covered"].includes(
        a.managedMarket ?? "",
      )
        ? null
        : a.country!,
      // Stripe requires omitting automatic_tax, adaptive_pricing and
      // customer_update for Managed Payments; it controls all three.
      options: { managed_payments: { enabled: true } },
    };
  }
  const treatment = taxTreatment(a.tax, a.country ?? "", false, false, a.live);
  return {
    treatment,
    marketPolicy: "direct_configured_countries",
    billingCountry: a.country!,
    options: {
      managed_payments: { enabled: false },
      automatic_tax: {
        enabled: ["domestic_vat", "destination_vat"].includes(treatment),
      },
      customer_update: { address: "auto" },
      adaptive_pricing: { enabled: true },
    },
  };
}
