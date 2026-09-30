import { randomUUID } from "node:crypto";
import { backend, api } from "@/lib/backend";
import { signedObject } from "../../../../../../packages/providers/storage";
import type { Id } from "../../../../../../convex/_generated/dataModel";
export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return Response.json({ error: "Origin denied." }, { status: 403 });
  try {
    const { organizationId, size, type } = await req.json();
    const key = `${organizationId}/${randomUUID()}`;
    const url = signedObject(key, "PUT", 300);
    await (
      await backend()
    ).mutation(api.assets.grant, {
      organizationId: organizationId as Id<"organizations">,
      key,
      size,
      type,
    });
    return Response.json(
      { url, key },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error:
          "Private upload unavailable. Configure EU storage and sign in to your workspace.",
      },
      { status: 503 },
    );
  }
}
