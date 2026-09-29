# Deploy and operate VibeScroller

Mode: how-to.

## Prepare environments

Create separate development, staging, and production configuration. Keep provider credentials, webhook secrets, storage buckets, billing modes, and callback origins isolated. Use synthetic media and disposable repositories in staging.

Pin dependencies and sandbox images after compatibility tests. Do not copy dependency versions from the conversation without checking the exported lockfile and current official SDK documentation.

Run the implementation's full check command before deployment. Record the code commit, schema version, provider configuration version, and release candidate. Run migrations that preserve old clients until the new deployment is verified.

## Choose the web host

Use Vercel Pro when the operator has explicitly authorized an eligible commercial plan. Do not activate a paid application on Hobby as a cost workaround. Confirm the project root, environment scope, build output, callback URLs, and deployment protection.

For the budget profile, deploy Next.js through the supported Cloudflare OpenNext adapter. Test authentication cookies, callbacks, server actions, streaming, image behavior, and the Convex client on that runtime. Do not claim compatibility because a static homepage loads.

Keep both deployment profiles documented. Do not change DNS or purchase a plan without operator authorization. The pre-customer spend policy is a cap, not permission to subscribe to every optional service.

## Configure data and workers

Deploy the Convex schema and functions. Create an EU-jurisdiction private object bucket with no public listing. Configure direct upload grants, lifecycle expiration, allowed origins, and a cleanup sweeper.

Build versioned media and coding sandbox images. Test a job without credentials, a successful job, a forced timeout, cancellation, and provider failure. Verify that the environment terminates and stops incurring charges within the measured provider behavior.

Register the GitHub App and webhook route with the minimum required permissions. Use a disposable test repository to verify branch creation, draft PR creation, closure without merge, merge, reopen, and lost-access behavior.

## Configure the domain

Use `scroll.companynerve.com` as the initial origin after authorization. Preserve all existing CompanyNerve DNS and mail records. Add only the required target and verification records.

Verify HTTPS, canonical redirects, callback origins, cookie scope, and private-route noindex behavior. Do not scope VibeScroller session cookies to every `companynerve.com` subdomain. Separate products should not inherit one another's sessions.

Verify the transactional email sender and required DNS records without replacing existing email configuration. Send actual staging messages before enabling customer email.

## Observability

Record request IDs, job IDs, source stages, provider latency, error classes, retry counts, credit estimates versus actuals, cancellation delays, and reconciliation drift. Do not log private source text or credentials.

Set alerts for failed signed webhooks, repeated authorization errors, stuck jobs, unclosed sandboxes, negative budget balances, unexpected cost growth, overdue deletion, and invoice-compliance deadlines. A daily operator summary is sufficient at low volume if urgent alerts remain available.

The public health route returns minimal availability. Operator health checks inspect dependencies without exposing configuration. A provider outage can disable its feature while keeping the library readable.

## Backup and restore

Back up application metadata and necessary object manifests under the published retention policy. A free plan's lack of automatic backups is not permission to skip recovery. Use scheduled exports or a paid backup capability when required, and include its cost.

Target a 24-hour recovery point and a 24-hour recovery time for the initial service. These are internal engineering targets, not a contractual SLA. Rehearse restoration in an isolated environment before taking paid customers.

During restoration, apply deletion tombstones before returning access. Verify private objects, subscriptions, credit reservations, and provider connections. Do not replay an outbox in a way that opens duplicate PRs or charges users twice.

## Incident playbook

1. Identify the affected capability and disable its dispatch or publication switch.
2. Preserve minimal evidence and record the incident timeline.
3. Revoke compromised keys and stop affected jobs.
4. Determine which users and data were affected.
5. Assess legal notification duties and contact appropriate recipients.
6. Apply a reviewed fix and run regression tests.
7. Restore the feature gradually and reconcile unfinished jobs and charges.
8. Publish an appropriate summary and record follow-up actions.

Do not expose customer data in a public incident report. Do not wait for a perfect root-cause analysis before taking necessary containment steps.

## Routine operations

Daily: inspect spend, failed jobs, webhook reconciliation, deletion sweeps, and invoice-compliance queue.

Weekly: review failed source adapters, model quality samples, dependency alerts, quota use, customer feedback, and backup success.

Monthly: compare actual unit costs with the model, reconcile company-wide tax thresholds, review provider invoices, check access lists, and test at least one restore or cancellation path.

## Upgrade and rollback

Version API contracts and model prompts. Do not invalidate approved plans silently during deployment. Finish compatible in-flight jobs or cancel them with an explanation before changing a breaking runner protocol.

A rollback restores application code and compatible schema behavior without reverting legitimate payment events or resurrecting deleted content. Maintain forward-compatible migrations and an explicit rollback procedure for each release.
