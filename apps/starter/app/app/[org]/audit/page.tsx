import { backend, api } from "@/lib/backend";
import type { Id } from "../../../../../../convex/_generated/dataModel";
export default async function Page({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org } = await params;
  const rows = await (
    await backend()
  ).query(api.organizations.auditLog, {
    organizationId: org as Id<"organizations">,
  });
  return (
    <>
      <h1>Recent activity</h1>
      <p className="muted">
        The latest 50 organization actions. No secrets or request bodies are
        stored here.
      </p>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Time, UTC</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td>{r.action.replaceAll(".", " ")}</td>
                <td>
                  {new Date(r.at).toISOString().replace("T", " ").slice(0, 19)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
