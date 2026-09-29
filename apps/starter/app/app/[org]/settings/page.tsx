import { backend, api } from "@/lib/backend";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { ActionForm } from "@/components/action-form";
import { renameOrganization, deleteOrganization } from "@/app/actions";
import { Card, Input, Label, Button } from "@companynerve/ui";
import { RecipePicker } from "@/components/header";
export default async function Page({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org } = await params;
  const info = await (
    await backend()
  ).query(api.organizations.details, {
    organizationId: org as Id<"organizations">,
  });
  return (
    <>
      <h1>Workspace settings</h1>
      <div className="stack">
        <Card>
          <h2>Workspace name</h2>
          <ActionForm action={renameOrganization}>
            <input type="hidden" name="organizationId" value={org} />
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={info.name}
              required
              maxLength={80}
            />
          </ActionForm>
        </Card>
        <Card>
          <h2>Appearance</h2>
          <p className="muted">
            Preview another recipe in this browser. Change company-config to
            choose the default for your product.
          </p>
          <RecipePicker />
        </Card>
        {info.role === "owner" && (
          <>
            <Card>
              <h2>Export your organization</h2>
              <p className="muted">
                Download the organization name and projects as JSON. This basic
                data export is available on every plan.
              </p>
              <Button variant="outline" asChild>
                <a href={`/app/${org}/export`}>Download organization data</a>
              </Button>
            </Card>
            <Card>
              <h2>Delete this workspace</h2>
              <p className="muted">
                Cancel any subscription first. This removes projects,
                memberships, invitations, and local billing/audit records.
                Provider financial records follow the provider's retention
                policy.
              </p>
              <ActionForm
                action={deleteOrganization}
                label="Delete workspace"
                danger
              >
                <input type="hidden" name="organizationId" value={org} />
                <Label htmlFor="confirmation">
                  Type {info.name} to confirm
                </Label>
                <Input id="confirmation" name="confirmation" required />
              </ActionForm>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
