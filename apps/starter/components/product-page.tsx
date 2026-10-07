import { Console } from "./console";
import { workspaceData } from "@/lib/workspace-data";
import { notFound } from "next/navigation";
export async function ProductPage({
  org,
  view,
  draft = "",
  search = "",
  filter = "",
  category = "",
  sort = "newest",
  sourceId,
  compactHome = false,
}: {
  org: string;
  view: string;
  draft?: string;
  search?: string;
  filter?: string;
  category?: string;
  sort?: string;
  sourceId?: string;
  compactHome?: boolean;
}) {
  const initial = await workspaceData({
    org,
    view: draft ? "full" : view,
    search,
    filter,
    category,
    sort,
    sourceId,
    compactHome,
  });
  if (sourceId && !("selectedSource" in initial && initial.selectedSource))
    notFound();
  return (
    <Console
      compactHomePreview={compactHome}
      key={`${org}:${sourceId ?? "workspace"}`}
      initialSource={
        "selectedSource" in initial ? initial.selectedSource : null
      }
      initialSharedDraft={draft.slice(0, 2048)}
      initialSearch={search}
      initialFilter={filter}
      initialCategory={category}
      initialSort={sort}
      organizationId={org}
      initialView={view}
      readOnly={initial.role === "viewer"}
      canSuggestCategories={["owner", "admin"].includes(initial.role)}
      initial={initial}
    />
  );
}
