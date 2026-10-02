# Use Basic builds and skip documentation-only deployments

Mode: reference. Decision date: October 3, 2026.

## Decision

The owner requested Basic build machines after observing build-minute spending. Both VibeScroller Vercel projects now use an explicit Basic machine, fixed selection and disabled on-demand build concurrency. Queued builds retain normal deployment behavior. Fluid Compute, function regions, authentication, deployment protection and other projects are unchanged.

The production application also uses `scripts/ignore-vercel-build.mjs` through `apps/starter/vercel.json`. Only changes entirely within `docs/`, `README.md`, `AGENTS.md` and `CHANGELOG.md` may skip a build. Legal content, application code, shared packages, dependencies and unknown paths build normally. This is intentionally conservative.

The comparison uses `VERCEL_GIT_PREVIOUS_SHA`, the last successful deployment for this project and branch. Comparing only the immediately preceding commit could skip an application update followed by documentation while that update's build is pending or failed. Missing history, a missing/invalid baseline or a Git error continues the build. `VIBESCROLLER_FORCE_BUILD=1` overrides the skip. An operator can also bypass the ignored step in Vercel's redeploy dialog.

## Verification and limits

Independent Vercel API reads confirmed `buildMachineType=basic`, `buildMachineSelection=fixed` and `elasticConcurrencyEnabled=false` for `vibe-scroller` and `vibe-scroller-workers-staging`. Five actual temporary-repository tests cover documentation-only changes from both working directories, accumulated application changes, missing history, explicit rebuilds, policy/unknown changes and runtime deletion. These tests do not claim a measured reduction in the next bill. Basic builds may take longer; no automatic machine upgrade is authorized by this decision.

Every main update still receives its immutable version tag and required CI. The account menu identifies the deployed application commit. A later documentation-only tag does not imply a newer application deployment.

Official references: [build machine and queue configuration API](https://vercel.com/docs/rest-api/projects/update-an-existing-project), [ignored build step](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel), [last successful deployment comparison](https://vercel.com/changelog/september-2022-papercuts).
