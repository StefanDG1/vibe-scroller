import { backend, api } from "@/lib/backend";
import type { Id } from "../../../../../../convex/_generated/dataModel";
export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return Response.json({ error: "Origin denied." }, { status: 403 });
  try {
    const { organizationId, key } = await req.json();
    await (
      await backend()
    ).action(api.integrations.completeUpload, {
      organizationId: organizationId as Id<"organizations">,
      key,
    });
    return Response.json(
      { complete: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Upload completion could not be verified." },
      { status: 400 },
    );
  }
}
