import { backend, api } from "@/lib/backend";
import { signedObject } from "../../../../../../packages/providers/storage";
import type { Id } from "../../../../../../convex/_generated/dataModel";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const asset = await (
      await backend()
    ).query(api.assets.evidence, { id: (await params).id as Id<"assets"> });
    return Response.json(
      { url: signedObject(asset.key, "GET", 60) },
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
