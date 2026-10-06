import { z } from "zod";
export const recipeIds = [
  "cobalt",
  "studio",
  "signal",
  "garden",
  "folio",
] as const;
export const companySchema = z.object({
  schemaVersion: z.literal(1),
  product: z.object({
    slug: z.string().regex(/^[a-z][a-z0-9-]+$/),
    name: z.string().min(1).max(80),
    description: z.string().min(1),
  }),
  brandRecipe: z.enum(recipeIds),
  website: z.object({
    kind: z.enum(["template", "product"]),
    url: z.url(),
    appUrl: z.url(),
    supportEmail: z.email(),
    operator: z
      .object({
        name: z.string().min(1),
        address: z.string().min(1),
        taxId: z.string().min(1),
        tradeRegister: z.string().min(1),
        euid: z.string().min(1),
      })
      .optional(),
  }),
  roles: z.tuple([z.literal("owner"), z.literal("admin"), z.literal("member")]),
  plans: z.object({
    free: z.object({ projects: z.number().int().min(1).max(100) }),
    pro: z.object({ projects: z.number().int().min(1).max(100) }),
  }),
});
export function defineCompany(value: z.input<typeof companySchema>) {
  return companySchema.parse(value);
}
export const company = defineCompany({
  schemaVersion: 1,
  product: {
    slug: "vibescroll",
    name: "VibeScroll",
    description:
      "Make scrolling useful. Give your saved ideas somewhere to go.",
  },
  brandRecipe: "cobalt",
  website: {
    kind: "product",
    url: "https://scroll.companynerve.com",
    appUrl: "https://scroll.companynerve.com",
    supportEmail: "contact@exponentialeducation.ro",
    operator: {
      name: "EXPONENTIAL EDUCATION S.R.L.",
      address: "Strada N. Istrati, No. 6, Iași, Iași County, 700460, Romania",
      taxId: "54790758",
      tradeRegister: "J2026035424002",
      euid: "ROONRC.J2026035424002",
    },
  },
  roles: ["owner", "admin", "member"],
  plans: { free: { projects: 3 }, pro: { projects: 100 } },
});
export type Role = (typeof company.roles)[number];
export function isPaid(
  billing: { status: string; periodEnd: number; verifiedAt: number } | null,
  now = Date.now(),
) {
  return (
    !!billing &&
    ["active", "trialing"].includes(billing.status) &&
    billing.periodEnd > now &&
    billing.verifiedAt > now - 24 * 60 * 60 * 1000
  );
}
export const invariants = [
  {
    id: "tenant-isolation",
    rule: "A membership grants access only to its organization.",
    test: "tests/backend.test.ts",
  },
  {
    id: "last-owner",
    rule: "An organization keeps at least one owner.",
    test: "tests/backend.test.ts",
  },
  {
    id: "paid-access",
    rule: "Paid features require verified, unexpired billing state.",
    test: "tests/backend.test.ts",
  },
];
