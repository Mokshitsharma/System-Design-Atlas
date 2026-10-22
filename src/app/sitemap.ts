import type { MetadataRoute } from "next";
import { concepts } from "@/content/concepts";
import { patterns } from "@/content/patterns";
import { tutorialSlugs } from "@/content/tutorials";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "", "/system-design", "/patterns", "/concepts", "/glossary", "/about",
    ...tutorialSlugs.map((s) => `/system-design/${s}`),
    ...patterns.map((p) => `/patterns/${p.slug}`),
    ...concepts.map((c) => `/concepts/${c.slug}`),
  ];
  return paths.map((p) => ({ url: `${SITE_URL}${p}` }));
}
