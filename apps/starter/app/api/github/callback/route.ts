import { NextRequest, NextResponse } from "next/server";
import { backend, api } from "@/lib/backend";
export async function GET(req: NextRequest) {
  let organizationId = "";
  try {
    const link = JSON.parse(
      req.cookies.get("vibe-github-link")?.value ?? "null",
    );
    const state = req.nextUrl.searchParams.get("state"),
      code = req.nextUrl.searchParams.get("code");
    if (!link || state !== link.state || !code)
      throw Error("Invalid authorization state");
    organizationId = link.organizationId;
    const client = await backend();
    await client.action(api.githubOAuth.complete, {
      organizationId: organizationId as any,
      state: state!,
      code,
    });
    const response = NextResponse.redirect(
      new URL(`/app/${organizationId}/projects?github=connected`, req.url),
    );
    response.cookies.delete({ name: "vibe-github-link", path: "/api/github" });
    return response;
  } catch {
    const response = NextResponse.redirect(
      new URL(
        organizationId
          ? `/app/${organizationId}/connections?github=failed`
          : "/app?github=failed",
        req.url,
      ),
    );
    response.cookies.delete({ name: "vibe-github-link", path: "/api/github" });
    return response;
  }
}
