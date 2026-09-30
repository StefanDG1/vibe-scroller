import { backend, api } from "@/lib/backend";
import { signedObject } from "../../../../../../packages/providers/storage";
import type { Id } from "../../../../../../convex/_generated/dataModel";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const asset = await (
      await backend()
    ).query(api.assets.evidence, { id: (await params).id as Id<"assets"> });
    const url = signedObject(asset.key, "GET", 60);
    if (new URL(req.url).searchParams.get("view") === "true")
      return new Response(null, {
        status: 302,
        headers: {
          Location: url,
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      });
    return Response.json(
      { url },
      {
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      },
    );
  } catch {
    return Response.json({ error: "Evidence unavailable." }, { status: 404 });
  }
}
