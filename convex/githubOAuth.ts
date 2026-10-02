"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { github } from "../packages/providers/github";
import { encrypt } from "../packages/providers/secrets";
import { ensure } from "../packages/policy";
import { githubCredential } from "../packages/providers/github-user";
export const complete = action({
  args: {
    organizationId: v.id("organizations"),
    state: v.string(),
    code: v.string(),
  },
  handler: async (ctx, a): Promise<void> => {
    const { actor } = await ctx.runQuery(api.jobs.authorizeOwner, {
      organizationId: a.organizationId,
    });
    await ctx.runMutation(internal.githubLinks.consume, {
      organizationId: a.organizationId,
      state: a.state,
      actor: actor._id,
    });
    ensure(
      process.env.GITHUB_APP_CLIENT_ID && process.env.GITHUB_APP_CLIENT_SECRET,
      "SETUP_REQUIRED",
      "Configure GitHub OAuth.",
    );
    const issuedAt = Date.now();
    const response = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_APP_CLIENT_ID,
          client_secret: process.env.GITHUB_APP_CLIENT_SECRET,
          code: a.code,
        }),
        signal: AbortSignal.timeout(30000),
      },
    );
    const token = await response.json();
    ensure(
      response.ok && token.access_token,
      "FORBIDDEN",
      "GitHub authorization was not completed.",
    );
    const user = await github("/user", token.access_token);
    const installations = [];
    for (let page = 1; page <= 10; page++) {
      const batch = await github(
        `/user/installations?per_page=100&page=${page}`,
        token.access_token,
      );
      for (const i of batch.installations.filter(
        (i: any) =>
          i.app_id === Number(process.env.GITHUB_APP_ID) && !i.suspended_at,
      )) {
        const repositories = [];
        for (let rp = 1; rp <= 10; rp++) {
          const selected = await github(
            `/user/installations/${i.id}/repositories?per_page=100&page=${rp}`,
            token.access_token,
          );
          repositories.push(
            ...selected.repositories
              .filter(
                (r: any) =>
                  r.permissions?.push ||
                  r.permissions?.maintain ||
                  r.permissions?.admin,
              )
              .map((r: any) => ({ id: r.id, fullName: r.full_name })),
          );
          if (selected.repositories.length < 100) break;
          ensure(
            rp < 10,
            "REPO_TOO_LARGE",
            "Select fewer repositories for this installation.",
          );
        }
        installations.push({ installationId: i.id, repositories });
      }
      if (batch.installations.length < 100) break;
      ensure(page < 10, "REPO_TOO_LARGE", "Too many installations.");
    }
    await ctx.runMutation(internal.jobs.storeSecret, {
      organizationId: a.organizationId,
      provider: "github",
      ...encrypt(
        JSON.stringify(githubCredential(token, user.id, issuedAt)),
        a.organizationId,
        "github",
      ),
    });
    await ctx.runMutation(internal.githubLinks.save, {
      organizationId: a.organizationId,
      githubUserId: user.id,
      installations,
    });
  },
});
