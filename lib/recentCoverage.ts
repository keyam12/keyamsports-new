// Recent-coverage memory for the Scout.
// Reads the site's own published articles (bundled with the deploy) so the
// Scout doesn't pick a storyline it just covered. Vercel serverless has no
// persistent filesystem between runs, but the data file ships with the
// bundle, which is enough for a rolling 48h window.
import articlesData from "../data/sample.json";

export function getRecentTopics(hoursBack = 48): string[] {
  const cutoff = Date.now() - hoursBack * 3600_000;
  const arts: unknown = (articlesData as { articles?: unknown }).articles;
  if (!Array.isArray(arts)) return [];
  return arts
    .filter((a) => {
      const d = (a as { date?: unknown })?.date;
      const t = typeof d === "string" ? Date.parse(d) : NaN;
      return !Number.isNaN(t) && t >= cutoff;
    })
    .map((a) => String((a as { title?: unknown })?.title ?? "").trim())
    .filter((t) => t.length > 0);
}
