import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "pricing",
    "how-it-works",
    "docs",
    "about",
    "contact",
    "status",
  ].map((path) => ({ url: `https://scroll.companynerve.com/${path}` }));
}
