import { convexTest } from "convex-test";
import { afterEach, expect, it, vi } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const retrieve = vi.hoisted(() => vi.fn());
vi.mock("stripe", () => ({
  default: class {
    invoices = { retrieve };
  },
}));
const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => {
  vi.unstubAllEnvs();
  retrieve.mockReset();
});
it("exports verified provider totals only for an active invoice operator and the matching customer/environment", async () => {
  vi.stubEnv("INVOICE_OPERATOR_SUBJECTS_JSON", '["accountant"]');
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_synthetic");
  vi.stubEnv("STRIPE_MODE", "test");
  const t = convexTest(schema, modules);
  for (const subject of ["accountant", "customer"])
    await t.mutation(internal.accounts.syncUser, {
      subject,
      email: `${subject}@example.test`,
      name: subject,
    });
  const customer = t.withIdentity({ subject: "customer" });
  const accountant = t.withIdentity({ subject: "accountant" });
  const organizationId = await customer.mutation(api.organizations.create, {
    name: "Synthetic invoice",
  });
  await t.mutation(internal.billing.attach, {
    organizationId,
    customerId: "cus_synthetic",
  });
  const id = await t.run((ctx) =>
    ctx.db.insert("invoiceTasks", {
      organizationId,
      invoiceId: "in_synthetic",
      state: "pending_submission",
      dueAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
  await expect(
    customer.action(api.invoiceAccounting.download, { id }),
  ).rejects.toThrow("Invoice operator access required");
  expect(retrieve).not.toHaveBeenCalled();
  const invoice = {
    id: "in_synthetic",
    customer: "cus_synthetic",
    livemode: false,
    created: 1760000000,
    currency: "eur",
    subtotal: 1000,
    total_taxes: [{ amount: 210 }],
    total: 1210,
    amount_paid: 1210,
    amount_remaining: 0,
    status: "paid",
    customer_name: "Synthetic buyer",
    invoice_pdf: null,
  };
  retrieve.mockResolvedValue(invoice);
  const record = await accountant.action(api.invoiceAccounting.download, {
    id,
  });
  expect(record.seller?.taxId).toBe("54790758");
  expect(record.invoice).toMatchObject({
    totalMinor: 1210,
    taxMinor: 210,
    paidMinor: 1210,
    buyerName: "Synthetic buyer",
  });
  expect(record.recordType).toBe("accountant_handover");
  retrieve.mockResolvedValue({ ...invoice, customer: "cus_other" });
  await expect(
    accountant.action(api.invoiceAccounting.download, { id }),
  ).rejects.toThrow("does not match");
  retrieve.mockResolvedValue({ ...invoice, livemode: true });
  await expect(
    accountant.action(api.invoiceAccounting.download, { id }),
  ).rejects.toThrow("does not match");
});
