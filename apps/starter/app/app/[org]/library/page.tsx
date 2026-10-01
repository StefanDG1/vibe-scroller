import { ProductPage } from "@/components/product-page";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{
    draft?: string;
    q?: string;
    state?: string;
    category?: string;
    sort?: string;
  }>;
}) {
  const query = await searchParams;
  return (
    <ProductPage
      org={(await params).org}
      view="library"
      draft={query.draft}
      search={query.q}
      filter={query.state}
      category={query.category}
      sort={query.sort}
    />
  );
}
