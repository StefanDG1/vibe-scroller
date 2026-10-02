import { redirect } from "next/navigation";
import { backend, api } from "@/lib/backend";
import type { Id } from "../../../../convex/_generated/dataModel";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string; workspace?: string }>;
}) {
  const query = await searchParams;
  const id = await (
    await backend()
  ).mutation(
    api.organizations.ensureDefault,
    query.workspace
      ? { preferredId: query.workspace as Id<"organizations"> }
      : {},
  );
  const draft = query.draft?.slice(0, 2048);
  if (!id)
    redirect(
      `/app/workspaces${draft ? `?draft=${encodeURIComponent(draft)}` : ""}`,
    );
  redirect(`/app/${id}${draft ? `?draft=${encodeURIComponent(draft)}` : ""}`);
}
