import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://keyam-sports.vercel.app").replace(/\/$/, "");
  const routes = ["", "/basketball", "/football", "/baseball", "/soccer", "/odds", "/about", "/contact", "/privacy", "/terms"];
  return routes.map((route) => ({ url: `${base}${route}`, changeFrequency: route === "" ? "daily" : "weekly", priority: route === "" ? 1 : 0.7 }));
}
