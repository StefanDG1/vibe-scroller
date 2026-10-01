import { handleAuth } from "@workos-inc/authkit-nextjs";
// Netlify rewrites the request origin to its immutable deploy hostname.
// Redirect the completed PKCE flow to the configured public application.
export const GET = handleAuth({
  returnPathname: "/app",
  baseURL: process.env.APP_URL,
});
