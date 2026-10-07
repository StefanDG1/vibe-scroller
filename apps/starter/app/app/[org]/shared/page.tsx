import { ProductPage } from "@/components/product-page";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ grant?: string; source?: string }>;
}) {
  const query = await searchParams;
  return (
    <ProductPage
      org={(await params).org}
      view="shared"
      sharedSourceId={query.source}
      sharedGrantId={query.grant}
    />
  );
}
