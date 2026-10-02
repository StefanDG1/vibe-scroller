import type Stripe from "stripe";
import { ensure, taxTreatment, type TaxConfig } from "../policy";

export function checkoutPaymentRoute(a: {
  route: string | undefined;
  managedVerified: boolean;
  live: boolean;
  country: string;
  tax: TaxConfig;
}): {
  treatment: string;
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
      !a.live || a.managedVerified,
      "RELEASE_GATE",
      "Managed Payments requires verified account and product eligibility.",
    );
    ensure(
      a.tax.countries.includes(a.country),
      "COUNTRY_DISABLED",
      "Consumer purchases are unavailable in this country.",
    );
    return {
      treatment: "stripe_managed_payments",
      // Stripe requires omitting automatic_tax, adaptive_pricing and
      // customer_update for Managed Payments; it controls all three.
      options: { managed_payments: { enabled: true } },
    };
  }
  const treatment = taxTreatment(a.tax, a.country, false, false, a.live);
  return {
    treatment,
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
