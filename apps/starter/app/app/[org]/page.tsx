import Link from "next/link";
import { Suspense } from "react";
import { LaunchChecks } from "@/components/launch-checks";
import { backend, api } from "@/lib/backend";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button, Badge } from "@companynerve/ui";
export default async function Page({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org } = await params;
  const c = await backend(),
    organizationId = org as Id<"organizations">;
  const [projects, info] = await Promise.all([
    c.query(api.projects.list, { organizationId }),
    c.query(api.organizations.details, { organizationId }),
  ]);
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="muted">A clear home for your team's work.</p>
        </div>
        {info.role !== "member" && (
          <Button asChild>
            <Link href={`/app/${org}/projects/new`}>New project</Link>
          </Button>
        )}
      </div>
      {projects.length ? (
        <div className="project-grid">
          {projects.map((p) => (
            <Link
              className="card project-link"
              href={`/app/${org}/projects/${p._id}`}
              key={p._id}
            >
              <h3>{p.name}</h3>
              <p
                className="muted"
                style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
              >
                {p.description || "No description yet."}
              </p>
              <Badge>
                Updated{" "}
                {new Date(p.updatedAt).toLocaleDateString("en-GB", {
                  timeZone: "UTC",
                })}
              </Badge>
            </Link>
          ))}
        </div>
      ) : (
        <section className="card">
          <h2>No projects yet.</h2>
          <p className="muted">
            {info.role === "member"
              ? "An owner or admin can add the first project."
              : "Create your first project and give your team a place to begin."}
          </p>
        </section>
      )}
      <Suspense fallback={null}>
        <LaunchChecks organizationId={org} />
      </Suspense>
      <p className="muted" style={{ fontSize: ".8rem", marginTop: 26 }}>
        This example shows where your own product logic belongs.
      </p>
    </>
  );
}
