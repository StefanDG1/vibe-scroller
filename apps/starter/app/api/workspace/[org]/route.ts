import { backend, api } from "@/lib/backend";
import type { Id } from "../../../../../../convex/_generated/dataModel";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ org: string }> },
) {
  try {
    const organizationId = (await params).org as Id<"organizations">,
      c = await backend();
    const [
      library,
      repositories,
      proposals,
      overview,
      usage,
      devices,
      githubChoices,
    ] = await Promise.all([
      c.query(api.product.library, { organizationId }),
      c.query(api.product.repositories, { organizationId }),
      c.query(api.product.proposals, { organizationId }),
      c.query(api.product.overview, { organizationId }),
      c.query(api.product.usage, { organizationId }),
      c.query(api.devices.list, { organizationId }),
      c.query(api.githubLinks.choices, { organizationId }),
    ]);
    return Response.json(
      {
        sources: library.items,
        repositories,
        proposals,
        runs: overview.runs,
        notifications: overview.notifications,
        usage,
        devices,
        githubChoices,
        measured: overview.measured,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      },
    );
  } catch {
    return Response.json(
      { error: "Workspace unavailable." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
}
