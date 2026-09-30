import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/api", "/account", "/demo", "/share"],
    },
    sitemap: "https://scroll.companynerve.com/sitemap.xml",
  };
}
