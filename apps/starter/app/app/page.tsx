import Link from "next/link";
import { backend, api } from "@/lib/backend";
import { Header } from "@/components/header";
import { ActionForm } from "@/components/action-form";
import { createOrganization } from "@/app/actions";
import { Card, Input, Label, Badge } from "@companynerve/ui";
export default async function Page() {
  const data = await (await backend()).query(api.accounts.current, {});
  return (
    <div className="container">
      <Header />
      <main id="main" className="doc">
        <h1>Your workspaces</h1>
        <p className="muted">
          Welcome, {data.user.name}. Choose where you want to work.
        </p>
        <div className="project-grid">
          {data.organizations.map((o) => (
            <Link
              href={"/app/" + o.id}
              className="card project-link"
              key={o.id}
            >
              <h3>{o.name}</h3>
              <Badge>{o.role}</Badge>
            </Link>
          ))}
        </div>
        {!data.organizations.length && (
          <p>
            You do not have a workspace yet. Create one below, or open an
            invitation link.
          </p>
        )}
        <Card style={{ marginTop: 32 }}>
          <h2 style={{ marginTop: 0 }}>Create a workspace</h2>
          <ActionForm action={createOrganization} label="Create workspace">
            <div>
              <Label htmlFor="name">Workspace name</Label>
              <Input
                id="name"
                name="name"
                required
                maxLength={80}
                placeholder="Your company"
              />
            </div>
          </ActionForm>
        </Card>
      </main>
    </div>
  );
}
