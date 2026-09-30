import type { Metadata } from "next";
import { getRecipe } from "@companynerve/design-recipes";
import { company } from "@companynerve/company-config";
import { RecipeTheme } from "@/components/recipe-theme";
import "./globals.css";
import "./product.css";
export const metadata: Metadata = {
  title: {
    default: company.product.name,
    template: `%s | ${company.product.name}`,
  },
  description: company.product.description,
  robots: { index: process.env.SEO_PUBLIC_INDEXING === "true", follow: true },
  metadataBase: new URL("https://scroll.companynerve.com"),
  openGraph: {
    title: "VibeScroller · Make scrolling productive",
    description: company.product.description,
    type: "website",
    locale: "en_US",
    siteName: "VibeScroller",
    images: [
      {
        url: "/social-card.png",
        width: 1200,
        height: 630,
        alt: "VibeScroller: saved video, evidence, project match, reviewed plan, draft PR",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VibeScroller · Make scrolling productive",
    description: company.product.description,
    images: ["/social-card.png"],
  },
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Public pages can be prerendered; private routes still perform their own auth.
  // The selected product recipe is stable across visitors.
  const recipe = getRecipe(company.brandRecipe);
  return (
    <html lang="en" data-recipe={recipe.id}>
      <body>
        <RecipeTheme />
        <a className="skip" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
