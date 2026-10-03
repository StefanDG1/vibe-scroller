import { expect, it } from "vitest";
import { reconcileCosts } from "../packages/evaluation/cost-reconciliation";
const base = {
  billingPeriod: "synthetic-period",
  workloads: [
    {
      id: "job-attempt-1",
      estimatedMicros: 10,
      requiredProviders: ["model", "sandbox"],
    },
  ],
  entries: [],
  providerPeriodsComplete: [],
  headroom: null,
};
const entry = {
  id: "line",
  workloadId: "job-attempt-1",
  provider: "model",
  billingPeriod: "synthetic-period",
  currency: "EUR",
  grossMicros: 10,
  creditMicros: 10,
  cashMicros: 0,
  evidenceReference: "synthetic-unit-only",
  allocation: "variable",
};
it("never settles estimates, missing provider periods or cash-free included usage as zero gross cost", () => {
  expect(
    reconcileCosts({
      ...base,
      workloads: [{ ...base.workloads[0], estimatedMicros: null }],
    }),
  ).toMatchObject({ estimatedMicros: null, unknownEstimateCount: 1 });
  expect(reconcileCosts(base)).toMatchObject({
    pending: 1,
    admissionReady: false,
    currencies: [],
  });
  const report = reconcileCosts({
    ...base,
    entries: [entry],
    providerPeriodsComplete: ["model"],
  });
  expect(report.pending).toBe(1);
  expect(report.currencies[0]).toMatchObject({
    grossMicros: 10,
    cashMicros: 0,
  });
});
it("rejects duplicate, foreign, wrong-period and inconsistent settled costs", () => {
  for (const entries of [
    [entry, entry],
    [{ ...entry, workloadId: "foreign" }],
    [{ ...entry, billingPeriod: "other" }],
    [{ ...entry, cashMicros: 1 }],
    [{ ...entry, workloadId: null }],
  ])
    expect(() => reconcileCosts({ ...base, entries })).toThrow();
});
it("requires all three resource forecasts including retained reservations before admission", () => {
  const h = {
    ceilingUnits: 100,
    spentUnits: 40,
    reservedUnits: 50,
    proposedUnits: 10,
  };
  const input = {
    ...base,
    entries: [entry, { ...entry, id: "sandbox-line", provider: "sandbox" }],
    providerPeriodsComplete: ["model", "sandbox"],
    headroom: {
      inference: { ...h, unit: "eur_micro" },
      service: { ...h, unit: "credits" },
      sandbox: { ...h, unit: "seconds" },
    },
  };
  expect(reconcileCosts(input).admissionReady).toBe(true);
  expect(
    reconcileCosts({
      ...input,
      headroom: {
        ...input.headroom,
        sandbox: { ...h, unit: "seconds", proposedUnits: 11 },
      },
    }).admissionReady,
  ).toBe(false);
  expect(
    reconcileCosts({
      ...input,
      entries: [
        ...input.entries,
        {
          ...entry,
          id: "unknown",
          workloadId: null,
          allocation: "unattributed",
        },
      ],
    }).admissionReady,
  ).toBe(false);
});
