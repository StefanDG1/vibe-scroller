import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
export async function GET(request: NextRequest) {
  const candidate = request.nextUrl.searchParams.get("returnTo") ?? "/app";
  const returnTo =
    /^\/app(?:[/?]|$)/.test(candidate) &&
    candidate.length <= 4096 &&
    !candidate.includes("\\")
      ? candidate
      : "/app";
  redirect(
    await getSignInUrl({
      returnTo,
      ...(request.nextUrl.searchParams.get("reauth") === "true"
        ? { maxAge: 300 }
        : {}),
    }),
  );
}
