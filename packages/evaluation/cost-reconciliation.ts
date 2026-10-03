import { z } from "zod";
const micros = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const headroom = z
  .object({
    ceilingUnits: micros,
    spentUnits: micros,
    reservedUnits: micros,
    proposedUnits: micros,
  })
  .strict();
export const costInput = z
  .object({
    billingPeriod: z.string().min(1),
    workloads: z.array(
      z
        .object({
          id: z.string().min(1),
          estimatedMicros: micros.nullable(),
          requiredProviders: z.array(z.string().min(1)).min(1),
        })
        .strict(),
    ),
    entries: z.array(
      z
        .object({
          id: z.string().min(1),
          workloadId: z.string().min(1).nullable(),
          provider: z.string().min(1),
          billingPeriod: z.string().min(1),
          currency: z.string().regex(/^[A-Z]{3}$/),
          grossMicros: micros,
          creditMicros: micros,
          cashMicros: micros,
          evidenceReference: z.string().min(1),
          allocation: z.enum(["variable", "shared", "unattributed"]),
        })
        .strict(),
    ),
    providerPeriodsComplete: z.array(z.string().min(1)),
    headroom: z
      .object({
        inference: headroom.extend({ unit: z.literal("eur_micro") }),
        service: headroom.extend({ unit: z.literal("credits") }),
        sandbox: headroom.extend({ unit: z.literal("seconds") }),
      })
      .strict()
      .nullable(),
  })
  .strict();

export function reconcileCosts(raw: unknown) {
  const input = costInput.parse(raw);
  const unique = (ids: string[]) => new Set(ids).size === ids.length;
  if (
    !unique(input.workloads.map((w) => w.id)) ||
    !unique(input.entries.map((e) => e.id)) ||
    !unique(input.providerPeriodsComplete)
  )
    throw Error("Duplicate cost identity");
  const safeSum = (values: number[]) => {
    const total = values.reduce((a, b) => a + BigInt(b), 0n);
    if (total > BigInt(Number.MAX_SAFE_INTEGER))
      throw Error("Cost total overflow");
    return Number(total);
  };
  if (
    input.headroom &&
    Object.values(input.headroom).some(
      (h) =>
        BigInt(h.spentUnits) + BigInt(h.reservedUnits) >
        BigInt(Number.MAX_SAFE_INTEGER),
    )
  )
    throw Error("Capacity total overflow");
  const ids = new Set(input.workloads.map((w) => w.id));
  for (const entry of input.entries) {
    if (
      entry.billingPeriod !== input.billingPeriod ||
      (entry.workloadId && !ids.has(entry.workloadId)) ||
      BigInt(entry.grossMicros) - BigInt(entry.creditMicros) !==
        BigInt(entry.cashMicros)
    )
      throw Error("Cost binding or cash reconciliation invalid");
    if ((entry.allocation === "unattributed") !== (entry.workloadId === null))
      throw Error("Unattributed cost binding invalid");
  }
  const workloads = input.workloads.map((w) => ({
    id: w.id,
    status: w.requiredProviders.every(
      (p) =>
        input.providerPeriodsComplete.includes(p) &&
        input.entries.some((e) => e.workloadId === w.id && e.provider === p),
    )
      ? "settled"
      : "pending",
  }));
  const currencies = [...new Set(input.entries.map((e) => e.currency))].map(
    (currency) => {
      const entries = input.entries.filter((e) => e.currency === currency);
      return {
        currency,
        grossMicros: safeSum(entries.map((e) => e.grossMicros)),
        creditMicros: safeSum(entries.map((e) => e.creditMicros)),
        cashMicros: safeSum(entries.map((e) => e.cashMicros)),
        unattributedGrossMicros: safeSum(
          entries
            .filter((e) => e.allocation === "unattributed")
            .map((e) => e.grossMicros),
        ),
        sharedGrossMicros: safeSum(
          entries
            .filter((e) => e.allocation === "shared")
            .map((e) => e.grossMicros),
        ),
      };
    },
  );
  const capacity = input.headroom
    ? Object.entries(input.headroom).map(([resource, h]) => ({
        resource,
        unit: h.unit,
        remainingUnits: h.ceilingUnits - h.spentUnits - h.reservedUnits,
        proposedFits:
          BigInt(h.spentUnits) +
            BigInt(h.reservedUnits) +
            BigInt(h.proposedUnits) <=
          BigInt(h.ceilingUnits),
      }))
    : null;
  return {
    billingPeriod: input.billingPeriod,
    workloadCount: workloads.length,
    settled: workloads.filter((w) => w.status === "settled").length,
    pending: workloads.filter((w) => w.status === "pending").length,
    unattributedEntries: input.entries.filter(
      (e) => e.allocation === "unattributed",
    ).length,
    estimatedMicros: input.workloads.every((w) => w.estimatedMicros !== null)
      ? safeSum(input.workloads.map((w) => w.estimatedMicros!))
      : null,
    unknownEstimateCount: input.workloads.filter(
      (w) => w.estimatedMicros === null,
    ).length,
    currencies,
    capacity,
    admissionReady:
      workloads.length > 0 &&
      workloads.every((w) => w.status === "settled") &&
      input.entries.every((e) => e.allocation !== "unattributed") &&
      Boolean(capacity?.every((h) => h.proposedFits)),
    limitations: [
      "Evidence references and complete billing periods require operator verification. Estimates do not settle invoices.",
      "Currency totals remain separate until a dated FX reconciliation. Fees, refunds, retries and shared overhead require their own authoritative lines; this is not a margin or profitability result.",
    ],
  };
}
