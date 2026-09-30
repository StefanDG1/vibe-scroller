"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { encrypt, decrypt } from "../packages/providers/secrets";
import type { Doc } from "./_generated/dataModel";
export const rotate = internalAction({
  args: {},
  handler: async (ctx): Promise<{ migrated: number }> => {
    let cursor: string | null = null,
      migrated = 0;
    do {
      const page: {
        page: Doc<"connections">[];
        isDone: boolean;
        continueCursor: string;
      } = await ctx.runQuery(internal.jobs.rotationPage, { cursor });
      for (const row of page.page) {
        if (row.keyVersion === (process.env.SECRET_KEY_VERSION ?? "1"))
          continue;
        const next = encrypt(
          decrypt(
            row.ciphertext,
            row.keyVersion,
            row.organizationId,
            row.provider,
          ),
          row.organizationId,
          row.provider,
        );
        if (
          await ctx.runMutation(internal.jobs.rotateCiphertext, {
            id: row._id,
            previous: row.ciphertext,
            ...next,
          })
        )
          migrated++;
      }
      cursor = page.isDone ? null : page.continueCursor;
    } while (cursor);
    return { migrated };
  },
});
export const status = internalAction({
  args: {},
  handler: async (ctx): Promise<{ oldVersions: number }> => {
    let cursor: string | null = null,
      oldVersions = 0;
    do {
      const page: {
        page: Doc<"connections">[];
        isDone: boolean;
        continueCursor: string;
      } = await ctx.runQuery(internal.jobs.rotationPage, { cursor });
      oldVersions += page.page.filter(
        (r) => r.keyVersion !== (process.env.SECRET_KEY_VERSION ?? "1"),
      ).length;
      cursor = page.isDone ? null : page.continueCursor;
    } while (cursor);
    return { oldVersions };
  },
});
