import { Suspense } from "react";
import { notFound } from "next/navigation";
import { backend, api } from "@/lib/backend";
import { LaunchChecks } from "@/components/launch-checks";
import type { Id } from "../../../../../../convex/_generated/dataModel";

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
  if (info.role !== "owner" && info.role !== "admin") notFound();
  return (
    <>
      <h1>Connect LaunchProof</h1>
      <p>
        This optional connection shows a report summary for this workspace. It
        is off until the application operator configures it.
      </p>
      <section className="card" style={{ overflowWrap: "anywhere" }}>
        <h2>Configure and connect</h2>
        <ol>
          <li>
            Open{" "}
            <a href="https://launch.companynerve.com" rel="noreferrer">
              LaunchProof
            </a>{" "}
            and sign in separately. Create a reporting application in your own
            workspace.
          </li>
          <li>
            Ask that LaunchProof workspace owner to issue an application token
            with only <code>reports:read-summary</code>.
          </li>
          <li>
            Give your application operator the reporting application ID and
            workspace slug. Explicitly map them to this organization ID:{" "}
            <code>{org}</code>, your target Convex origin, and the environment
            you test.
          </li>
          <li>
            The operator configures the server variables in{" "}
            <code>apps/starter/.env.example</code>, following{" "}
            <code>docs/operations/launchproof.md</code>. Store the summary token
            only in server secrets. Set <code>LP_INTEGRATION_ENABLED=true</code>{" "}
            and restart the app after reviewing the mapping.
          </li>
          <li>
            Run approved checks locally or in your own CI and upload a sanitized
            report. Reload this page to read the summary. Only current owners
            and admins of the mapped organization can see it.
          </li>
        </ol>
        <p>
          Keep target JWTs and test-user credentials in your local runner or CI
          secret store. Never enter them on the hosted LaunchProof website. The
          summary token cannot run checks or upload reports.
        </p>
        <p>
          Accounts remain separate. This connection does not link email
          addresses or share session cookies. Exported source contains no
          connection credentials.
        </p>
      </section>
      <section className="card" style={{ marginTop: 24 }}>
        <h2>Disconnect</h2>
        <ol>
          <li>
            Revoke the summary token in the owning LaunchProof application's
            token settings.
          </li>
          <li>
            Set <code>LP_INTEGRATION_ENABLED=false</code>, remove the server
            token and mapping variables, and restart every app and preview
            instance that received them.
          </li>
          <li>
            Reload the dashboard. The summary panel is absent when disabled.
            Existing projects, memberships, subscriptions, and retained
            LaunchProof reports are unchanged.
          </li>
        </ol>
        <p>
          This page does not save secrets or change server configuration. Your
          application operator performs the connection and disconnection.
        </p>
      </section>
      <Suspense
        fallback={
          <p className="muted">Checking optional LaunchProof connection…</p>
        }
      >
        <LaunchChecks organizationId={org} />
      </Suspense>
    </>
  );
}
