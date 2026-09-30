import { defineTable } from "convex/server";
import { v } from "convex/values";
const tenant = {
  organizationId: v.id("organizations"),
  createdAt: v.number(),
  updatedAt: v.number(),
};
const sourceState = v.union(
  ...[
    "saved",
    "needs_upload",
    "queued",
    "processing",
    "ready",
    "failed",
    "deleted",
  ].map((s) => v.literal(s)),
);
export const productTables = {
  mediaStages: defineTable({
    ...tenant,
    sourceId: v.id("sources"),
    generation: v.number(),
    objectKey: v.string(),
    etag: v.string(),
    pipelineVersion: v.string(),
    artifactHash: v.string(),
    payload: v.any(),
  })
    .index("by_org", ["organizationId"])
    .index("by_source", ["sourceId"])
    .index("by_updated", ["updatedAt"]),
  sourceCounts: defineTable({
    organizationId: v.id("organizations"),
    active: v.number(),
    lifetime: v.number(),
  }).index("by_org", ["organizationId"]),
  matchingJobs: defineTable({
    ...tenant,
    key: v.string(),
    sourceId: v.id("sources"),
    repositoryId: v.id("repositories"),
    state: v.string(),
    attempt: v.number(),
    reservationKey: v.string(),
    proposalId: v.optional(v.id("proposals")),
  })
    .index("by_key", ["key"])
    .index("by_org", ["organizationId"]),
  inferenceReservations: defineTable({
    key: v.string(),
    budgetKey: v.string(),
    max: v.number(),
    state: v.string(),
    createdAt: v.number(),
  }).index("by_key", ["key"]),
  operatorBudgets: defineTable({
    key: v.string(),
    ceiling: v.number(),
    reserved: v.number(),
    spent: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
  trialClaims: defineTable({
    identityHash: v.string(),
    organizationId: v.id("organizations"),
    createdAt: v.number(),
  }).index("by_identity", ["identityHash"]),
  objectDeletions: defineTable({
    key: v.string(),
    state: v.string(),
    attempts: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_state", ["state"]),
  githubLinks: defineTable({
    ...tenant,
    actor: v.id("users"),
    stateHash: v.string(),
    expiresAt: v.number(),
    consumed: v.boolean(),
  })
    .index("by_state", ["stateHash"])
    .index("by_org", ["organizationId"]),
  githubBindings: defineTable({
    ...tenant,
    githubUserId: v.number(),
    installationId: v.number(),
    repositories: v.array(v.object({ id: v.number(), fullName: v.string() })),
    status: v.string(),
  }).index("by_org", ["organizationId"]),
  creditPools: defineTable({
    ...tenant,
    key: v.string(),
    kind: v.string(),
    granted: v.number(),
    spent: v.number(),
    reserved: v.number(),
    revoked: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  })
    .index("by_org", ["organizationId"])
    .index("by_key", ["key"]),
  taxConfigurations: defineTable({
    domestic: v.string(),
    target: v.string(),
    special317: v.boolean(),
    evidence: v.optional(v.string()),
    effectiveAt: v.optional(v.number()),
    registrations: v.array(v.string()),
    countries: v.array(v.string()),
    oss: v.boolean(),
    reviewed: v.boolean(),
    updatedAt: v.number(),
  }),
  legalAcceptances: defineTable({
    ...tenant,
    actor: v.id("users"),
    termsVersion: v.string(),
    immediateService: v.boolean(),
  }).index("by_org", ["organizationId"]),
  refundRequests: defineTable({
    ...tenant,
    invoiceId: v.string(),
    invoiceCreatedAt: v.number(),
    status: v.string(),
  }).index("by_org", ["organizationId"]),
  assets: defineTable({
    ...tenant,
    key: v.string(),
    sourceId: v.optional(v.id("sources")),
    size: v.number(),
    type: v.string(),
    state: v.string(),
    etag: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    kind: v.optional(v.string()),
  })
    .index("by_org", ["organizationId"])
    .index("by_key", ["key"])
    .index("by_expiry", ["expiresAt"]),
  sources: defineTable({
    ...tenant,
    key: v.string(),
    canonical: v.string(),
    kind: v.string(),
    title: v.string(),
    url: v.optional(v.string()),
    originalSavedAt: v.optional(v.number()),
    text: v.optional(v.string()),
    objectKey: v.optional(v.string()),
    state: sourceState,
    coverage: v.string(),
    summary: v.optional(v.string()),
    searchable: v.optional(v.string()),
    analysis: v.optional(v.any()),
    mediaEvidence: v.optional(
      v.array(
        v.object({
          kind: v.string(),
          id: v.string(),
          startMs: v.number(),
          endMs: v.number(),
        }),
      ),
    ),
    mediaCoverage: v.optional(v.string()),
    originalText: v.optional(v.string()),
    originalMediaEvidence: v.optional(v.any()),
    correctionAuthor: v.optional(v.id("users")),
    tags: v.array(v.string()),
    error: v.optional(v.string()),
    rightsAttested: v.boolean(),
    generation: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_key", ["organizationId", "key"])
    .index("by_canonical", ["organizationId", "canonical"])
    .searchIndex("source_search", {
      searchField: "searchable",
      filterFields: ["organizationId", "state"],
    }),
  repositories: defineTable({
    ...tenant,
    installationId: v.number(),
    providerId: v.number(),
    fullName: v.string(),
    branch: v.string(),
    sha: v.string(),
    enabled: v.boolean(),
    profile: v.string(),
    profileVersion: v.number(),
    confirmed: v.boolean(),
    manifest: v.array(v.string()),
    context: v.string(),
    contextFiles: v.optional(v.array(v.string())),
    status: v.string(),
  })
    .index("by_org", ["organizationId"])
    .index("by_provider", ["organizationId", "providerId"])
    .index("by_github", ["installationId", "providerId"]),
  proposals: defineTable({
    ...tenant,
    sourceId: v.id("sources"),
    repositoryId: v.id("repositories"),
    baseSha: v.string(),
    profileVersion: v.number(),
    disposition: v.string(),
    reviewerCorrection: v.optional(
      v.object({
        from: v.string(),
        to: v.string(),
        reason: v.string(),
        actor: v.id("users"),
        at: v.number(),
      }),
    ),
    title: v.string(),
    detail: v.any(),
    review: v.string(),
    plan: v.optional(v.any()),
    planHash: v.optional(v.string()),
    version: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_source", ["sourceId"]),
  runs: defineTable({
    ...tenant,
    proposalId: v.id("proposals"),
    repositoryId: v.id("repositories"),
    approvedBy: v.id("users"),
    planHash: v.string(),
    baseSha: v.string(),
    version: v.number(),
    executor: v.string(),
    fundingRoute: v.string(),
    maxCredits: v.number(),
    allowedPaths: v.array(v.string()),
    highRisk: v.boolean(),
    state: v.string(),
    generation: v.number(),
    expiresAt: v.number(),
    leaseUntil: v.number(),
    deviceId: v.optional(v.id("devices")),
    patch: v.optional(v.string()),
    changes: v.optional(v.any()),
    report: v.optional(v.string()),
    prNumber: v.optional(v.number()),
    prUrl: v.optional(v.string()),
    prState: v.optional(v.string()),
    mergedAt: v.optional(v.string()),
    observedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    events: v.array(v.string()),
  })
    .index("by_org", ["organizationId"])
    .index("by_state", ["state"])
    .index("by_pr", ["repositoryId", "prNumber"]),
  wallets: defineTable({
    ...tenant,
    granted: v.number(),
    spent: v.number(),
    reserved: v.number(),
    periodEnd: v.number(),
    tier: v.string(),
    interval: v.string(),
    purchased: v.number(),
  }).index("by_org", ["organizationId"]),
  reservations: defineTable({
    ...tenant,
    key: v.string(),
    max: v.number(),
    settled: v.number(),
    state: v.string(),
    expiresAt: v.number(),
    allocations: v.optional(
      v.array(v.object({ poolId: v.id("creditPools"), credits: v.number() })),
    ),
    operatorKeys: v.optional(v.array(v.string())),
  })
    .index("by_org", ["organizationId"])
    .index("by_key", ["organizationId", "key"]),
  costEntries: defineTable({
    ...tenant,
    key: v.string(),
    credits: v.number(),
    provider: v.string(),
    units: v.number(),
    unitType: v.string(),
    eur: v.optional(v.number()),
    costCeilingEur: v.optional(v.number()),
    costStatus: v.optional(v.string()),
  })
    .index("by_org", ["organizationId"])
    .index("by_key", ["organizationId", "key"]),
  outbox: defineTable({
    ...tenant,
    key: v.string(),
    operation: v.string(),
    target: v.string(),
    state: v.string(),
    attempts: v.number(),
    generation: v.number(),
    leaseUntil: v.number(),
    nextAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_state", ["state"]),
  connections: defineTable({
    ...tenant,
    provider: v.string(),
    ciphertext: v.string(),
    keyVersion: v.string(),
    status: v.string(),
  })
    .index("by_org", ["organizationId"])
    .index("by_provider", ["organizationId", "provider"]),
  devices: defineTable({
    ...tenant,
    owner: v.id("users"),
    name: v.string(),
    fingerprint: v.string(),
    codeHash: v.string(),
    credentialHash: v.string(),
    state: v.string(),
    expiresAt: v.number(),
    lastSeenAt: v.number(),
    capabilities: v.array(v.string()),
  })
    .index("by_org", ["organizationId"])
    .index("by_code", ["codeHash"])
    .index("by_credential", ["credentialHash"]),
  feedback: defineTable({
    ...tenant,
    actor: v.id("users"),
    target: v.string(),
    action: v.string(),
    note: v.string(),
    benefit: v.string(),
  }).index("by_org", ["organizationId"]),
  notifications: defineTable({
    ...tenant,
    key: v.string(),
    message: v.string(),
    read: v.boolean(),
  }).index("by_org", ["organizationId"]),
  tombstones: defineTable({
    organizationId: v.id("organizations"),
    target: v.string(),
    at: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_target", ["target"]),
  webhookReceipts: defineTable({
    provider: v.string(),
    key: v.string(),
    at: v.number(),
    state: v.string(),
  }).index("by_key", ["provider", "key"]),
  preferences: defineTable({
    ...tenant,
    email: v.boolean(),
    telegram: v.boolean(),
    analytics: v.boolean(),
    legalVersion: v.string(),
    acceptedAt: v.number(),
  }).index("by_org", ["organizationId"]),
  invoiceTasks: defineTable({
    ...tenant,
    invoiceId: v.string(),
    dueAt: v.number(),
    state: v.string(),
    receipt: v.optional(v.string()),
    creditNoteOf: v.optional(v.string()),
  }).index("by_org", ["organizationId"]),
  billingPeriods: defineTable({
    ...tenant,
    key: v.string(),
    start: v.number(),
    end: v.number(),
    credits: v.number(),
    allowanceCeiling: v.optional(v.number()),
    subscription: v.string(),
  })
    .index("by_org", ["organizationId"])
    .index("by_key", ["key"]),
  billingChanges: defineTable({
    ...tenant,
    subscriptionId: v.string(),
    itemId: v.string(),
    oldPrice: v.string(),
    newPrice: v.string(),
    tier: v.union(v.literal("starter"), v.literal("pro")),
    interval: v.union(
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("annual"),
    ),
    prorationDate: v.number(),
    periodStart: v.number(),
    periodEnd: v.number(),
    amount: v.number(),
    currency: v.string(),
    expiresAt: v.number(),
    state: v.string(),
    invoiceId: v.optional(v.string()),
  })
    .index("by_org", ["organizationId"])
    .index("by_subscription", ["subscriptionId"]),
  billingReversals: defineTable({
    ...tenant,
    key: v.string(),
    paymentId: v.string(),
    invoiceId: v.optional(v.string()),
    refunded: v.number(),
    total: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_key", ["key"])
    .index("by_invoice", ["invoiceId"]),
  creditFunding: defineTable({
    ...tenant,
    poolId: v.id("creditPools"),
    key: v.string(),
    invoiceId: v.string(),
    credits: v.number(),
    revoked: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_key", ["key"])
    .index("by_invoice", ["invoiceId"]),
};
