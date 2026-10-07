import { defineTable } from "convex/server";
import { v } from "convex/values";
export const assistantRepositoryBinding = v.object({
  repositoryId: v.id("repositories"),
  baseSha: v.string(),
  profileVersion: v.number(),
  selectionVersion: v.number(),
});
export const assistantTables = {
  assistantIntakes: defineTable({
    organizationId: v.id("organizations"),
    actor: v.id("users"),
    clientId: v.string(),
    grantId: v.id("assistantGrants"),
    grantVersion: v.number(),
    sourceId: v.id("sources"),
    generation: v.number(),
    revision: v.number(),
    createdAt: v.number(),
  })
    .index("by_source", ["sourceId"])
    .index("by_org", ["organizationId"])
    .index("by_actor", ["actor"])
    .index("by_pair", ["actor", "clientId", "sourceId"]),
  assistantGrants: defineTable({
    organizationId: v.id("organizations"),
    actor: v.id("users"),
    clientId: v.string(),
    sources: v.array(
      v.object({
        sourceId: v.id("sources"),
        generation: v.number(),
        revision: v.number(),
      }),
    ),
    scopes: v.array(v.string()),
    contextVersion: v.optional(v.number()),
    repositories: v.optional(v.array(assistantRepositoryBinding)),
    intakeSpace: v.optional(
      v.union(v.literal("personal"), v.literal("business")),
    ),
    version: v.number(),
    state: v.union(v.literal("active"), v.literal("revoked")),
    expiresAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_actor_client", ["actor", "clientId"])
    .index("by_pair", ["organizationId", "actor", "clientId"]),
};
