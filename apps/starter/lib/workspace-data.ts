import "server-only";
import { backend, api } from "@/lib/backend";
import type { Id } from "../../../convex/_generated/dataModel";

export async function workspaceData({
  org,
  view = "",
  search = "",
  filter = "",
  category = "",
  sort = "newest",
  sourceId,
  proposalId,
}: {
  org: string;
  view?: string;
  search?: string;
  filter?: string;
  category?: string;
  sort?: string;
  sourceId?: string;
  proposalId?: string;
}) {
  const c = await backend(),
    organizationId = org as Id<"organizations">;
  if (!view || view === "home") {
    const home = await c.query(api.dashboard.home, { organizationId });
    if (home.ready) return home;
  }
  const [
    library,
    repositories,
    proposals,
    overview,
    usage,
    devices,
    githubChoices,
    organization,
    customerRoutes,
    connections,
    aiPreference,
    categories,
    selectedSource,
  ] = await Promise.all([
    c.query(api.product.library, {
      organizationId,
      search: search || undefined,
      state: filter || undefined,
      category: category || undefined,
      sort,
    }),
    c.query(api.product.repositories, { organizationId }),
    c.query(api.product.proposals, { organizationId }),
    c.query(api.product.overview, { organizationId, includeCounts: false }),
    c.query(api.product.usage, { organizationId }),
    c.query(api.devices.list, { organizationId }),
    c.query(api.githubLinks.choices, { organizationId }),
    c.query(api.organizations.details, { organizationId }),
    c.query(api.jobs.customerRoutes, { organizationId }),
    c.query(api.jobs.connections, { organizationId }),
    c.query(api.aiPreferences.read, { organizationId }),
    c.query(api.categories.list, { organizationId }),
    sourceId
      ? c
          .query(api.product.detail, {
            id: sourceId as Id<"sources">,
            organizationId,
          })
          .catch(() => null)
      : Promise.resolve(null),
  ]);
  const selectedProposal = proposalId
    ? await c
        .query(api.product.proposal, { id: proposalId as Id<"proposals"> })
        .catch(() => null)
    : null;
  if (selectedProposal && selectedProposal.organizationId !== organizationId)
    throw new Error("Proposal unavailable.");
  return {
    workspaceName: organization.name,
    role: organization.role,
    compact: false,
    sources: library.items,
    categories,
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
    selectedSource,
    selectedProposal,
    measured: overview.measured,
  };
}
