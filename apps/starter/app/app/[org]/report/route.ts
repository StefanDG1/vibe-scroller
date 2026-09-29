import { backend, api } from "@/lib/backend";
import type { Id } from "../../../../../../convex/_generated/dataModel";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ org: string }> },
) {
  const { org } = await params;
  const client = await backend();
  try {
    const data = await client.query(api.projects.report, {
      organizationId: org as Id<"organizations">,
    });
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="project-report.json"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Access denied or data unavailable.", { status: 403 });
  }
}
