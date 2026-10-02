# Use the Vercel Pro team

Mode: how-to. Build cost settings checked October 3, 2026; broader team inventory checked October 1.

The owner upgraded `stefandg1s-projects` to Pro. The authenticated API inventory contains nine projects: vibe-scroller, kinetexa, launchproof, companynerve-app, companynerve-marketing, kinetexa-fitness-archive, vydero, exponential and synerlux. Their inspected configurations already have Fluid Compute, system environment variables, 12-hour Skew Protection and Vercel deployment protection. The VibeScroller dashboard explicitly shows Skew Protection enabled. Existing protection on other projects was preserved.

## Applied settings

- The two VibeScroller projects use fixed Basic build machines and disabled on-demand build concurrency. Normal queued builds continue. The serving application skips documentation-only changes using the last successful deployment as its baseline; missing history or application/policy changes still build. See [ADR 033](../adr/033-basic-builds-and-documentation-skips.md). Other projects' machines were not changed.
- VibeScroller uses the official Next.js deployment on Linux with Frankfurt functions, the pinned package manager and lockfile, Git main deployments and Production-only credentials. `apps/starter/vercel.json` explicitly preserves Fluid Compute. It lets concurrent requests share function capacity; performance depends on the application's workload and is not measured here.
- VibeScroller's canonical domain is public. Generated production deployment URLs and all previews require Vercel authentication. Private product routes still enforce WorkOS identity, tenant access, no-store caching and the private CSP.
- The existing team overage budget notification was reduced from $200 to $20. The saved dashboard row shows $20, Pause Off and Webhook Off. Alerts apply to all team projects at 50%, 75% and 100% of that amount. This is an alert threshold, not a hard spending cap. It covers metered on-demand usage after the plan credit, rather than the subscription fee. The owner must decide separately whether outages caused by pausing all production projects are acceptable.

## Useful included tools

Use the project's Logs and Observability tabs to investigate real error rates and function latency. The authenticated CLI supports `pnpm dlx vercel@61.1.0 logs --environment production --since 30m --status-code 500 --json`. Keep log outputs private and redact credentials and customer data before sharing. Basic platform tools are available without turning on additional event collection or paid retention.

Use Instant Rollback in the project's deployment menu for a known good frontend deployment. A rollback does not undo Convex schema changes, transactions, invoices, jobs, PRs or provider charges. Review the backend compatibility and reconciliation steps first. Skew Protection helps framework-managed requests from an open page continue using its frontend deployment; custom fetch requests and independently deployed Convex functions still require compatible contracts.

Free viewer seats let a collaborator inspect deployments without granting a deploying seat. No invitations were sent. The optional first-year domain offer does not improve this project's existing domain and was not claimed; renewal would create a future cost.

## Keep costs and privacy explicit

Pro includes $20 of monthly infrastructure credit and bills additional usage on demand. Do not interpret the upgrade as unlimited free execution or inference. AI Gateway credit is separate; the app's personal video route still uses the user's supported ChatGPT session with no silent API fallback. Existing team balances are not pooled across VibeScroller users.

No new Analytics Plus, Speed Insights Plus, Observability Plus, password protection, paid seats, static IP, SAML, custom environment, Flags Explorer, Vercel Agent usage billing, AI Gateway auto-reload or additional redirect allocation was activated. Source analytics remain the existing consent-gated PostHog integration. Enabling another analytics collector requires updating the privacy inventory and consent behavior.

The audit did not change other projects' function regions, routes, authentication, DNS, credentials or source. Those changes need each project's dependencies and production requirements inspected first. There was no need to switch already enabled settings off and back on.

Official references: [Pro features and pricing](https://vercel.com/docs/plans/pro-plan), [Fluid Compute](https://vercel.com/docs/fluid-compute), [Skew Protection](https://vercel.com/docs/skew-protection), [Spend Management](https://vercel.com/docs/spend-management), [Observability](https://vercel.com/docs/observability).
