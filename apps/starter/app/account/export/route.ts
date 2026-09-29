import { backend, api } from "@/lib/backend";
export async function GET() {
  const data = await (await backend()).query(api.accounts.exportAccount, {});
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="account.json"',
      "Cache-Control": "no-store",
    },
  });
}
