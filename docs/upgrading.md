# Updating a generated product

Keep your product in its own repository. Record the CompanyNerve version from `template-version.json`. Before an update, commit your product changes and create a branch.

Compare the old template tag with the desired tag in CompanyNerve. Read the changelog and security changes first. Apply backend authorization, schema, SDK and configuration changes deliberately; preserve your branding and domain logic. Review changes to `.agents/skills` separately and update hashes only after accepting the source update.

Install from the updated lockfile, run affected type checks and boundary tests, and build. Deploy into isolated preview services. Check sign-in, organization access, billing transitions and any schema migration there before production. Keep the previous web deployment for rollback; database changes need their own compatibility and backup plan.

The first release is an alpha. There is no automatic merge/update service or compatibility promise across prerelease changes. Future breaking changes must include migration notes.

## September 2026 dependency refresh

The workspace now uses TypeScript 7.0.2 and pnpm 12.3.4. Next.js 16.3.4 uses its default CLI type-checking path, which supports the native TypeScript compiler. Both production builds still fail on type errors. Convex 1.45.0 also resolves the native `tsc` binary. No TypeScript 6 alias or preview compiler is required.

TypeScript 7 does not expose the old compiler API or load language-service plugins. If you add a tool that imports that API, follow [Microsoft's side-by-side installation guidance](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/). The Next.js editor plugin is optional and separate from build-time route checks. Use an editor with TypeScript 7 language-server support for native editor diagnostics.

Install pnpm 12.3.4 and run `pnpm install --frozen-lockfile`. This refresh upgrades React and React DOM to 19.3.0, Tailwind to 4.3.3, WorkOS Node to 10.13.0, Stripe to 22.6.2, Zod to 4.6.1, Radix UI to 1.6.7, Lucide React to 1.44.0, Vite to 8.2.2, convex-test to 0.0.57, and Prettier to 3.9.6. React types match 19.3.0. Node types stay on the Node 24 line at 24.13.4 to match the deployed runtime.

Next.js 16.3.4, Convex 1.45.0, AuthKit 4.3.1, Vitest 5.0.0 and the remaining direct packages were already current stable releases when checked on 2026-09-11. Exact versions and transitive dependencies are recorded in the manifests and lockfile. The published alpha.1 tag preserves the earlier versions.

CI uses commit-pinned actions/checkout 7.0.1 and actions/setup-node 7.0.0 on GitHub-hosted Ubuntu runners.
