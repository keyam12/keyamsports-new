import type { MetadataRoute } from "next";
import { getPublishedArticles } from "../lib/articles";
import { articlePath } from "../lib/articleUrls";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://keyamsports-new.vercel.app").replace(/\/$/, "");
  const routes = ["", "/basketball", "/football", "/baseball", "/soccer", "/odds", "/about", "/contact", "/privacy", "/terms"];
  const articles = (await getPublishedArticles()).map(articlePath).filter(Boolean);
  return [...routes,...articles].map((route) => ({ url: `${base}${route}`, changeFrequency: route === "" ? "daily" : "weekly", priority: route === "" ? 1 : 0.7 }));
}
