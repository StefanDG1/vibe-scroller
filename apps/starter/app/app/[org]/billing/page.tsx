import { backend, api } from "@/lib/backend";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { ActionForm } from "@/components/action-form";
import { startCheckout, billingPortal, refreshBilling } from "@/app/actions";
import { Card, Button, Badge } from "@companynerve/ui";
import { isPaid, company } from "@companynerve/company-config";
export default async function Page({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org } = await params;
  const data = await (
    await backend()
  ).query(api.billing.authorize, {
    organizationId: org as Id<"organizations">,
  });
  const paid = isPaid(data.billing);
  return (
    <>
      <h1>Billing</h1>
      <p className="muted">
        Manage this workspace's plan. Account and organization data exports stay
        free.
      </p>
      <div className="stack">
        <Card>
          <Badge>{paid ? "Pro" : "Free"}</Badge>
          <h2 style={{ marginTop: 20 }}>
            {paid ? "More room for your work." : "Start with the essentials."}
          </h2>
          <p>
            {paid ? company.plans.pro.projects : company.plans.free.projects}{" "}
            projects per workspace.{" "}
            {paid
              ? "The project report is available."
              : data.configured
                ? "Upgrade to enable the project report and a higher project limit."
                : "No paid subscription is offered on this deployment."}
          </p>
          {data.configured && (
            <>
              <p className="muted">
                {data.mode === "live"
                  ? "Live billing is enabled for this product."
                  : "Test billing. No real payment is required."}{" "}
                Price and currency appear on the provider's checkout page.
              </p>
              <ActionForm
                action={startCheckout}
                label={paid ? "Manage subscription" : "Open checkout"}
              >
                <input type="hidden" name="organizationId" value={org} />
              </ActionForm>
            </>
          )}
        </Card>
        {data.configured && data.billing && (
          <Card>
            <h2>Manage and refresh</h2>
            <p className="muted">
              Current provider status: {data.billing.status}. Access changes
              only after the backend verifies billing. After returning from
              checkout or the portal, refresh here.
            </p>
            <div className="actions">
              <ActionForm action={billingPortal} label="Open billing portal">
                <input type="hidden" name="organizationId" value={org} />
              </ActionForm>
              <ActionForm action={refreshBilling} label="Refresh billing">
                <input type="hidden" name="organizationId" value={org} />
              </ActionForm>
            </div>
          </Card>
        )}
        {(data.configured || paid) && (
          <Card>
            <h2>Example Pro report</h2>
            <p className="muted">
              A server-protected project report demonstrates how to enforce a
              paid feature. Basic account and organization data exports stay
              free.
            </p>
            <Button variant="outline" asChild>
              <a href={`/app/${org}/report`}>Download Pro report</a>
            </Button>
          </Card>
        )}
      </div>
    </>
  );
}
