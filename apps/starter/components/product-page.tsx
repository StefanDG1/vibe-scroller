import { Console } from "./console";
import { backend, api } from "@/lib/backend";
import type { Id } from "../../../convex/_generated/dataModel";
export async function ProductPage({
  org,
  view,
  draft = "",
  search = "",
  filter = "",
}: {
  org: string;
  view: string;
  draft?: string;
  search?: string;
  filter?: string;
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
  ] = await Promise.all([
    c.query(api.product.library, {
      organizationId,
      search: search || undefined,
      state: filter || undefined,
    }),
    c.query(api.product.repositories, { organizationId }),
    c.query(api.product.proposals, { organizationId }),
    c.query(api.product.overview, { organizationId }),
    c.query(api.product.usage, { organizationId }),
    c.query(api.devices.list, { organizationId }),
    c.query(api.githubLinks.choices, { organizationId }),
    c.query(api.organizations.details, { organizationId }),
    c.query(api.jobs.customerRoutes, { organizationId }),
  ]);
  return (
    <Console
      key={org}
      initialSharedDraft={draft.slice(0, 2048)}
      initialSearch={search}
      initialFilter={filter}
      organizationId={org}
      initialView={view}
      readOnly={organization.role === "viewer"}
      initial={{
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
        measured: overview.measured,
      }}
    />
  );
}
