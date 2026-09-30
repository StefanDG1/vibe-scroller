import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      ...(process.env.SEO_PUBLIC_INDEXING === "true"
        ? {
            allow: "/",
            disallow: [
              "/app",
              "/api",
              "/account",
              "/demo",
              "/share",
              "/recipes",
              "/setup",
              "/join",
            ],
          }
        : { disallow: "/" }),
    },
    sitemap: "https://scroll.companynerve.com/sitemap.xml",
  };
}
