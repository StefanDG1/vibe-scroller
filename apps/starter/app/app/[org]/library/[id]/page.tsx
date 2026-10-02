import { ProductPage } from "@/components/product-page";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ org: string; id: string }>;
  searchParams: Promise<{
    q?: string;
    state?: string;
    category?: string;
    sort?: string;
  }>;
}) {
  const { org, id } = await params,
    query = await searchParams;
  return (
    <ProductPage
      org={org}
      sourceId={id}
      view="source"
      search={query.q}
      filter={query.state}
      category={query.category}
      sort={query.sort}
    />
  );
}
