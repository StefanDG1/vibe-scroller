# Version every main update

Every push to `main`, including a PR merge or direct update, creates an immutable Git tag. Branch pushes and unmerged PRs do not create a product version. Re-running the workflow reuses the same version and rejects a tag pointing to another commit.

The format is `v0.1.0-alpha.YYYYMMDDHHMMSS.gCOMMIT`, using the commit's UTC timestamp and first twelve SHA characters. For example, `v0.1.0-alpha.20261001023000.g012345abcdef`. It is a valid SemVer prerelease, uniquely traces the update, and works from shallow deployment checkouts without a central counter or bot commits. The package version remains the development base. An alpha tag does not mean paid V1 is complete.

After the main-push Verify template workflow succeeds, Publish verified alpha creates the corresponding GitHub prerelease with generated changes and the exact commit. Failed or canceled CI leaves a traceable tag but no verified release. PR CI cannot publish. Publishing uses the repository's built-in GitHub token and does not require another credential.

The app's Account menu shows its build version and commit. Use `node scripts/version.mjs` to inspect the current version, or `node scripts/version.mjs HEAD tag` to print the tag. A local uncommitted edit is not a new public version.

When changing the release line, update the base in scripts/version.mjs and package manifests together. Breaking changes after stable V1 raise the major version, backward-compatible features raise the minor version, and fixes raise the patch version. Stable releases remain an explicit release decision after their external gates pass.

Rollback by redeploying a known commit or Git tag. Do not move an existing tag. The rollback deployment retains that commit's version. The public release history is on the GitHub Releases page; tags include updates whose CI did not finish.
