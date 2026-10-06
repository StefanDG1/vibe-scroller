import { backend, api } from "@/lib/backend";
import type { Id } from "../../../../../../convex/_generated/dataModel";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ org: string }> },
) {
  try {
    const organizationId = (await params).org as Id<"organizations">,
      c = await backend();
    const q = new URL(request.url).searchParams;
    const [
      library,
      repositories,
      proposals,
      overview,
      usage,
      devices,
      githubChoices,
      customerRoutes,
      connections,
      aiPreference,
      categories,
      selectedSource,
    ] = await Promise.all([
      c.query(api.product.library, {
        organizationId,
        search: q.get("q") || undefined,
        state: q.get("state") || undefined,
        category: q.get("category") || undefined,
        sort: q.get("sort") || undefined,
      }),
      c.query(api.product.repositories, { organizationId }),
      c.query(api.product.proposals, { organizationId }),
      c.query(api.product.overview, { organizationId, includeCounts: false }),
      c.query(api.product.usage, { organizationId }),
      c.query(api.devices.list, { organizationId }),
      c.query(api.githubLinks.choices, { organizationId }),
      c.query(api.jobs.customerRoutes, { organizationId }),
      c.query(api.jobs.connections, { organizationId }),
      c.query(api.aiPreferences.read, { organizationId }),
      c.query(api.categories.list, { organizationId }),
      q.get("sourceId")
        ? c
            .query(api.product.detail, {
              id: q.get("sourceId") as Id<"sources">,
              organizationId,
            })
            .catch(() => null)
        : Promise.resolve(null),
    ]);
    return Response.json(
      {
        sources: library.items,
        libraryNext: library.next,
        repositories,
        proposals,
        runs: overview.runs,
        notifications: overview.notifications,
        usage,
        devices,
        githubChoices,
        customerRoutes,
        connections,
        aiPreference,
        categories,
        selectedSource,
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
