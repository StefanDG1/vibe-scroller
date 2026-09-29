import { Landing } from "@/components/site";
import { company } from "@companynerve/company-config";
import { ProductLanding } from "@/components/product-landing";
export const metadata = { alternates: { canonical: "/" } };
export default function Page() {
  return company.website.kind === "template" ? <Landing /> : <ProductLanding />;
}
