import { backend, api } from "@/lib/backend";
import { ActionForm } from "@/components/action-form";
import { acceptInvite } from "@/app/actions";
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await (await backend()).query(api.accounts.current, {});
  return (
    <main id="main" className="narrow">
      <h1>Join your team.</h1>
      <p>
        You are signed in as {data.user.email}. The invitation must be addressed
        to this email.
      </p>
      <ActionForm action={acceptInvite} label="Accept invitation">
        <input type="hidden" name="token" value={token} />
      </ActionForm>
      <p className="muted" style={{ marginTop: 20 }}>
        If you had to sign in first, open the invitation link again to return
        here.
      </p>
    </main>
  );
}
