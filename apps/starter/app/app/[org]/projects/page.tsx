import { ProductPage } from "@/components/product-page";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ proposal?: string }>;
}) {
  return (
    <ProductPage
      org={(await params).org}
      view="projects"
      reviewDraftId={(await searchParams).proposal}
    />
  );
}
