import { Console } from "./console";
import { backend, api } from "@/lib/backend";
import type { Id } from "../../../convex/_generated/dataModel";
import { notFound } from "next/navigation";
export async function ProductPage({
  org,
  view,
  draft = "",
  search = "",
  filter = "",
  category = "",
  sort = "newest",
  sourceId,
}: {
  org: string;
  view: string;
  draft?: string;
  search?: string;
  filter?: string;
  category?: string;
  sort?: string;
  sourceId?: string;
}) {
  const c = await backend(),
    organizationId = org as Id<"organizations">;
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
          .catch(() => notFound())
      : Promise.resolve(null),
  ]);
  return (
    <Console
      key={`${org}:${sourceId ?? "workspace"}`}
      initialSource={selectedSource}
      initialSharedDraft={draft.slice(0, 2048)}
      initialSearch={search}
      initialFilter={filter}
      initialCategory={category}
      initialSort={sort}
      organizationId={org}
      initialView={view}
      readOnly={organization.role === "viewer"}
      canSuggestCategories={["owner", "admin"].includes(organization.role)}
      initial={{
        workspaceName: organization.name,
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
        measured: overview.measured,
      }}
    />
  );
}
