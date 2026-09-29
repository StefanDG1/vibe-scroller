import type { MetadataRoute } from "next";
import { company } from "@companynerve/company-config";
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === "preview")
    return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/designs/" },
    sitemap: new URL(
      "/sitemap.xml",
      process.env.NEXT_PUBLIC_SITE_URL || company.website.url,
    ).href,
  };
}
