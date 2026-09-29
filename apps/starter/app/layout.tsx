import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getRecipe } from "@companynerve/design-recipes";
import { company } from "@companynerve/company-config";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: company.product.name,
    template: `%s | ${company.product.name}`,
  },
  description: company.product.description,
  robots: { index: false, follow: false },
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const recipe = getRecipe(
    (await cookies()).get("recipe")?.value ?? company.brandRecipe,
  );
  return (
    <html lang="en" data-recipe={recipe.id}>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
