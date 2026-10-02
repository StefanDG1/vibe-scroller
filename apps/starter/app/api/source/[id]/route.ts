import { backend, api } from "@/lib/backend";
import type { Id } from "../../../../../../convex/_generated/dataModel";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return Response.json(
      await (
        await backend()
      ).query(api.product.detail, {
        id: (await params).id as Id<"sources">,
        organizationId: (new URL(request.url).searchParams.get(
          "organizationId",
        ) || undefined) as Id<"organizations"> | undefined,
      }),
      {
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      },
    );
  } catch {
    return Response.json(
      { error: "Source unavailable." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
}
