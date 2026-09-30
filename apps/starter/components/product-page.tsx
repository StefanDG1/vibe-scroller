import { Console } from "./console";
import { backend, api } from "@/lib/backend";
import type { Id } from "../../../convex/_generated/dataModel";
export async function ProductPage({
  org,
  view,
}: {
  org: string;
  view: string;
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
  ] = await Promise.all([
    c.query(api.product.library, { organizationId }),
    c.query(api.product.repositories, { organizationId }),
    c.query(api.product.proposals, { organizationId }),
    c.query(api.product.overview, { organizationId }),
    c.query(api.product.usage, { organizationId }),
    c.query(api.devices.list, { organizationId }),
    c.query(api.githubLinks.choices, { organizationId }),
  ]);
  return (
    <Console
      organizationId={org}
      initialView={view}
      initial={{
        sources: library.items,
        repositories,
        proposals,
        runs: overview.runs,
        notifications: overview.notifications,
        usage,
        devices,
        githubChoices,
        measured: overview.measured,
      }}
    />
  );
}
