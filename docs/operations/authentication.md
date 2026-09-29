# Configure email codes and Google sign-in

CompanyNerve and generated applications use hosted WorkOS AuthKit with email one-time codes and Google OAuth only. This owner decision supersedes earlier email/password setup guidance and verification records.

## Set the authentication methods

1. Select the WorkOS project and environment belonging to this product. Keep development, preview, and production separate.
2. Enable [Magic Auth](https://workos.com/docs/authkit/magic-auth) for email one-time codes. AuthKit handles code delivery and verification.
3. Enable Google OAuth using the product's own client as described below.
4. Disable Email + Password and every other sign-in method, including passkeys, SSO, and other social providers. Save and reload the settings to confirm them.
5. Register the application's exact `/callback` URL, homepage/sign-out origin, and `/sign-in` Initiate login URL. For local development these are `http://localhost:3001/callback`, `http://localhost:3001`, and `http://localhost:3001/sign-in`.

The existing `/sign-in` and `/sign-up` server routes start AuthKit using its supported SDK and return to `/app`. The SDK manages state, PKCE, and encrypted sessions. Keep that flow for both methods. See the [WorkOS Next.js integration](https://workos.com/docs/authkit/nextjs).

Authentication methods are provider settings. There is no application environment flag that disables hosted passwords, and setting the required environment values does not prove that the provider is configured. A deployment with passwords still enabled does not satisfy this template's authentication policy.

Do not advertise password creation, forgot-password, or reset-password flows. The template has no local password or reset-password route. Historical provider password checks are not evidence for the new flow. Existing users sign in with an email code or Google; do not send them through a password reset to migrate.

## Give each product its own Google client

Follow [WorkOS's Google OAuth guide](https://workos.com/docs/integrations/google-oauth) using a Google Cloud project and OAuth web client dedicated to the generated product. Configure that product's consent branding, audience, contact details, and verified public URLs. Use owner-supplied legal details when available.

Copy the Google redirect URI shown by the selected WorkOS environment into the Google client. This Google-to-WorkOS redirect is separate from the application's WorkOS-to-app `/callback` URL. Save the client ID and secret in that product's WorkOS Google provider configuration. Publish the audience when ready for production use.

Do not inherit CompanyNerve's Google client, WorkOS environment, cookie secret, or another portfolio product's credentials. Source and setup guidance are shared; identity configuration is independent. WorkOS offers shared Google credentials for staging tests, but those do not establish the product's own OAuth setup and cannot be used in production.

The app needs the existing [environment inventory](environment.md). It does not need `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` in Next.js or Convex. `WORKOS_COOKIE_PASSWORD` remains required for session encryption; it is unrelated to user passwords. Exports omit local environment files and provider metadata and leave credential placeholders empty.

## Verify the provider setup

Record these checks separately for each environment after an operator applies the settings:

- Save/reload confirms Magic Auth and Google enabled, with passwords and other methods disabled. Neither hosted signup nor sign-in promotes password creation or reset.
- A new user receives an email code, completes signup, reaches the app, creates a workspace/project, and signs out. An existing user can sign in with a new code.
- Incorrect, expired, and already-used email codes do not create a session. Failed or cancelled authentication does not grant access to protected data.
- A Google sign-in started from the app completes the callback, reaches the dashboard, and signs out. Inspect the consent branding and selected client to confirm that they belong to this product.
- Anonymous and cross-workspace requests remain rejected by the backend. Run the focused synthetic tests in [acceptance](../acceptance.md); a provider identity alone never grants workspace permissions.

Source implementation, local tests, deployment, saved provider settings, and completed browser journeys are separate evidence. Record the actual results in [status](../status.md); repository changes alone do not confirm provider setup.

## Private page redirects

AuthKit proxy authentication is enabled for protected matcher paths. Sign-in, sign-up and callback paths remain explicitly unauthenticated so their route handlers can complete the flow. Server Components read withAuth without ensureSignedIn, and redirect a missing session to the local sign-in handler. This keeps PKCE cookie writes out of page rendering, where Next.js prohibits them. The backend still authorizes every operation independently.

The correction at bb04d356b4ce6ae60716bcf675bb92b693423181 passed 40 tests and GitHub CI 34692292924. Vercel application deployment dpl_FBwDzBSWPxEjbR6RqkHYAuSc95Vx is READY. Anonymous production account requests redirect to this application's own WorkOS client with HttpOnly PKCE cookies. Tests include invalid sessions, callback pass-through, prefetch handling and a server-render fallback.
