import { backend, api } from "@/lib/backend";
import { ProjectForm } from "@/components/project-form";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
export default async function Page({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org, id } = await params;
  const c = await backend(),
    organizationId = org as Id<"organizations">;
  const [p, info] = await Promise.all([
    c.query(api.projects.get, { organizationId, id: id as Id<"projects"> }),
    c.query(api.organizations.details, { organizationId }),
  ]);
  return (
    <>
      <h1>{p.name}</h1>
      {info.role === "member" ? (
        <p style={{ whiteSpace: "pre-wrap" }}>
          {p.description || "No description yet."}
        </p>
      ) : (
        <ProjectForm organizationId={org} project={p} />
      )}
    </>
  );
}
