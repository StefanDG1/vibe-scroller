"use node";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { authorizeRepository } from "./lib/githubAuthorization";
import {
  issueAccess,
  createIssue,
  findIssue,
} from "../packages/providers/issues";
import { ensure } from "../packages/policy";
export const prepare = action({
  args: { id: v.id("issueDrafts") },
  handler: async (ctx, a): Promise<void> => {
    const c = await ctx.runQuery(api.issues.context, a);
    await authorizeRepository(ctx, c.repo, c.draft.baseSha);
    const access = await issueAccess(c.repo);
    await ctx.runMutation(internal.issues.prepared, {
      ...a,
      hash: c.draft.hash,
      visibility: access.visibility as "public" | "private",
    });
  },
});
export const publish = action({
  args: {
    id: v.id("issueDrafts"),
    version: v.number(),
    hash: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
    publicationRights: v.boolean(),
  },
  handler: async (ctx, a): Promise<void> => {
    const id = await ctx.runMutation(api.issues.approve, a);
    const c = await ctx.runMutation(internal.issues.claim, { id });
    let writing = false;
    try {
      await authorizeRepository(ctx, c.repo, c.draft.baseSha);
      const access = await issueAccess(c.repo);
      ensure(
        access.visibility === c.attempt.visibility,
        "APPROVAL_STALE",
        "Repository visibility changed. Review a new draft.",
      );
      // Check app/membership/selection again immediately before the network side effect.
      const current = await ctx.runQuery(api.issues.context, {
        id: c.draft._id,
      });
      ensure(
        current.draft.hash === c.attempt.hash,
        "APPROVAL_STALE",
        "Issue changed.",
      );
      writing = true;
      const result = await createIssue(
        access.token,
        c.repo.fullName,
        c.draft.title,
        c.draft.body,
      );
      await ctx.runMutation(internal.issues.receipt, {
        id,
        state: "published",
        number: result.number,
        url: result.url,
        externalState: result.state,
      });
    } catch {
      await ctx.runMutation(internal.issues.receipt, {
        id,
        state: writing ? "unknown" : "denied",
      });
      throw new Error(
        writing
          ? "PUBLICATION_UNKNOWN: GitHub may have created this issue. Reconcile the attempt before any new publication."
          : "FORBIDDEN: Issue permission, visibility or current access failed. No provider write was attempted.",
      );
    }
  },
});
export const refresh = action({
  args: { id: v.id("issueAttempts") },
  handler: async (ctx, a): Promise<void> => {
    const c = await ctx.runQuery(api.issues.attemptContext, a);
    try {
      await authorizeRepository(ctx, c.repo);
      const access = await issueAccess(c.repo, false);
      const issue = await findIssue(
        access.token,
        c.repo.fullName,
        c.attempt.marker,
        c.attempt.number,
      );
      if (!issue) {
        await ctx.runMutation(internal.issues.updateObservation, {
          ...a,
          state: "unknown",
          edited: false,
        });
        return;
      }
      if (issue.unavailable) {
        await ctx.runMutation(internal.issues.updateObservation, {
          ...a,
          state: "unavailable",
          edited: false,
        });
        return;
      }
      const edited =
        !!c.draft &&
        (issue.title !== c.draft.title || issue.body !== c.draft.body);
      await ctx.runMutation(internal.issues.receipt, {
        ...a,
        state: "published",
        number: issue.number,
        url: issue.html_url,
        externalState: issue.state,
        externalEdited: edited,
      });
    } catch {
      await ctx.runMutation(internal.issues.updateObservation, {
        ...a,
        state: "access_lost",
        edited: false,
      });
    }
  },
});
export const reconcileOne = internalAction({
  args: { id: v.id("issueAttempts") },
  handler: async (ctx, a) => {
    const c = await ctx.runQuery(internal.issues.reconcileContext, a);
    if (!c) return;
    try {
      await authorizeRepository(ctx, c.repo);
      const access = await issueAccess(c.repo, false);
      const issue = await findIssue(
        access.token,
        c.repo.fullName,
        c.attempt.marker,
        c.attempt.number,
      );
      if (!issue || issue.unavailable) {
        await ctx.runMutation(internal.issues.updateObservation, {
          ...a,
          state: issue?.unavailable ? "unavailable" : "unknown",
          edited: false,
        });
        return;
      }
      await ctx.runMutation(internal.issues.receipt, {
        ...a,
        state: "published",
        number: issue.number,
        url: issue.html_url,
        externalState: issue.state,
        externalEdited:
          !!c.draft &&
          (issue.title !== c.draft.title || issue.body !== c.draft.body),
      });
    } catch {
      await ctx.runMutation(internal.issues.updateObservation, {
        ...a,
        state: "access_lost",
        edited: false,
      });
    }
  },
});
