# Cloudflare host profile

Status: staging deployed; production resource validation pending. Date: 2026-09-30.

The available Vercel team has a Hobby plan. The owner authorized no new purchases. Evaluate Cloudflare Workers Free for the commercial staging application without changing Next.js, React, WorkOS or Convex.

The official OpenNext package 1.20.7 requires Next.js `>=16.3.6` for Next 16. Both exported apps therefore receive the compatible patch update from 16.3.4 to 16.3.6. React 19.3.0 satisfies the published peer range. The original exported lockfile remains preserved in the handoff.

The adapter, Wrangler 4.125.0 and its rclone.js 0.6.6 peer are pinned in the application development dependencies. Native workerd installation validates its pinned platform binary. The rclone self-update install script is disabled because it downloads an unpinned executable and no deployment cache requires it.

Windows packaging failed first on directory symlink privileges, then on native Sharp bundling. A repository-bounded directory-junction preload addressed only the first failure. A separate Linux packaging workflow receives no provider secrets and produces a short-lived build artifact. Neither a successful Node build nor a packaged artifact establishes working Workers hosting.

Linux packaging passed. Deploying the prebundled Wrangler dry-run output with `no_bundle` avoids Linux absolute WASM paths during Windows rebundling. Staging is available at `https://vibescroller-staging.danistefangheorghiu.workers.dev`. WorkOS SSO and the authenticated workspace passed on this host. The scoped deployment token has Workers Scripts Edit on only the operator account; runtime secrets were supplied separately after packaging. The R2 CORS allowlist includes this host and the loopback development origin.

The bundle was 15,154 KiB, gzip 3,295 KiB with 27 ms startup. Current official Workers limits permit a 64 MiB free-plan bundle; runtime CPU and load still require measurement. Secret byte comparison found no configured provider secrets in the package. Gitleaks reported generated-manifest and bundled-code candidates, whose provenance remains under review.

Production deployment remains gated by final callback and origin configuration, private response caching checks on the latest code, load measurements, artifact candidate review and the full acceptance record. Do not change DNS, activate live checkout or upgrade a provider plan to make this profile pass.
