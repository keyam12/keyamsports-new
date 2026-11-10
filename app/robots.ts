import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://keyam-sports.vercel.app").replace(/\/$/, "");
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/agents", "/api/"] }], sitemap: `${base}/sitemap.xml` };
}
