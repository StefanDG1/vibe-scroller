import { authkitProxy } from "@workos-inc/authkit-nextjs";
import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from "next/server";
const auth = authkitProxy({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ["/sign-in", "/sign-up", "/callback"],
  },
});
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (
    !process.env.WORKOS_CLIENT_ID ||
    !process.env.WORKOS_API_KEY ||
    !process.env.WORKOS_COOKIE_PASSWORD
  ) {
    return NextResponse.redirect(new URL("/setup", request.url));
  }
  return auth(request, event);
}
export const config = {
  matcher: [
    "/app/:path*",
    "/account/:path*",
    "/join/:path*",
    "/sign-in",
    "/sign-up",
    "/callback",
  ],
};
