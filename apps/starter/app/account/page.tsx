import { backend, api } from "@/lib/backend";
import { Header, RecipePicker } from "@/components/header";
import { ActionForm } from "@/components/action-form";
import { deleteAccount, logout } from "@/app/actions";
import { Card, Input, Label, Button } from "@companynerve/ui";
export default async function Page() {
  const data = await (await backend()).query(api.accounts.current, {});
  return (
    <div className="container">
      <Header />
      <main id="main" className="doc">
        <h1>Your account</h1>
        <div className="stack">
          <Card>
            <h2 style={{ marginTop: 0 }}>{data.user.name}</h2>
            <p className="muted">{data.user.email}</p>
            <form action={logout}>
              <Button variant="outline">Sign out</Button>
            </form>
          </Card>
          <Card>
            <h2 style={{ marginTop: 0 }}>Appearance</h2>
            <RecipePicker />
          </Card>
          <Card>
            <h2 style={{ marginTop: 0 }}>Your data</h2>
            <p className="muted">
              Download your profile and organization memberships.
            </p>
            <Button variant="outline" asChild>
              <a href="/account/export">Download account data</a>
            </Button>
          </Card>
          <Card>
            <h2 style={{ marginTop: 0 }}>Delete your account</h2>
            <p className="muted">
              Transfer ownership or delete any workspace where you are the last
              owner. Your access is locked immediately, then your identity is
              deleted. Organization-owned content remains with its organization.
            </p>
            <ActionForm action={deleteAccount} label="Delete account" danger>
              <Label htmlFor="confirmation">
                Type {data.user.email} to confirm
              </Label>
              <Input
                id="confirmation"
                name="confirmation"
                required
                autoComplete="off"
              />
            </ActionForm>
          </Card>
        </div>
      </main>
    </div>
  );
}
