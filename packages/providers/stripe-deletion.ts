import type Stripe from "stripe";

// A permission failure, timeout or generic 404 is not deletion evidence.
export function missingStripeCustomer(error: unknown) {
  const e = error as {
    code?: string;
    statusCode?: number;
    param?: string;
  } | null;
  return (
    e?.code === "resource_missing" &&
    e.statusCode === 404 &&
    (e.param === "customer" || e.param === "id")
  );
}

export async function confirmStripeCustomerDeleted(
  client: Stripe,
  customerId: string,
) {
  try {
    const customer = await client.customers.retrieve(customerId);
    return customer.id === customerId && customer.deleted === true;
  } catch (error) {
    if (missingStripeCustomer(error)) return true;
    throw error;
  }
}
